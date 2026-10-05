import { signJwt, type AuthEnv } from './auth'
import { fail, json } from './http'

/**
 * POST /api/auth/signup and /api/auth/login — body { email, key } → { token }.
 *
 * `key` is not the password: the browser derives it with PBKDF2-SHA256 (600k rounds, salt "rxdio:v1:<email>"),
 * see src/lib/passwordKey.ts. Workers' free plan allows only 10 ms of CPU per request, so hashing server-side
 * at a safe cost isn't possible there; this way the server never sees the password and stays cheap.
 */

interface Env extends AuthEnv {
  DB: D1Database
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14
const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/
const KEY = /^[A-Za-z0-9_-]{43}$/ // 32 bytes, base64url
const MINUTE = 60

// attempts per window
const LIMITS = {
  signupPerIp: { limit: 5, window: 60 * MINUTE },
  loginPerIp: { limit: 20, window: 15 * MINUTE },
  loginPerEmail: { limit: 8, window: 15 * MINUTE },
}

const encoder = new TextEncoder()

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export async function hashKey(key: string) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(key)))
  return btoa(String.fromCharCode(...digest)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

/** Compares without bailing out at the first difference. */
export function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

// Hash of a key nobody has, compared against when the email is unknown so both paths take the same time
const DUMMY_HASH = 'x'.repeat(43)

/** Counts an attempt; returns false once `limit` is exceeded inside the window. */
async function allow(db: D1Database, key: string, { limit, window }: { limit: number; window: number }) {
  const now = Math.floor(Date.now() / 1000)
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, count, reset_at) VALUES (?1, 1, ?2)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN reset_at <= ?3 THEN 1 ELSE count + 1 END,
         reset_at = CASE WHEN reset_at <= ?3 THEN ?2 ELSE reset_at END
       RETURNING count`,
    )
    .bind(key, now + window, now)
    .first<{ count: number }>()
  return (row?.count ?? 1) <= limit
}

const tooMany = () => fail(429, 'Too many attempts. Please wait a few minutes and try again.', { 'Retry-After': '300' })

export async function handleAuth(request: Request, env: Env, action: string | undefined): Promise<Response> {
  if ((action !== 'login' && action !== 'signup') || request.method !== 'POST') return fail(404, 'Not found')
  if (!env.AUTH_JWT_SECRET) return fail(500, 'Server is not configured')

  const body = (await request.json().catch(() => null)) as { email?: unknown; key?: unknown } | null
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : ''
  const key = typeof body?.key === 'string' ? body.key : ''
  if (email.length > 254 || !EMAIL.test(email) || !KEY.test(key)) return fail(400, 'Enter a valid email and password.')

  const db = env.DB
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local'
  const keyHash = await hashKey(key)

  if (action === 'signup') {
    if (!(await allow(db, `signup:ip:${ip}`, LIMITS.signupPerIp))) return tooMany()
    const id = crypto.randomUUID()
    try {
      await db.prepare('INSERT INTO users (id, email, key_hash) VALUES (?, ?, ?)').bind(id, email, keyHash).run()
    } catch (error) {
      if (String(error).includes('UNIQUE')) return fail(409, 'An account with this email already exists. Try signing in.')
      throw error
    }
    await db.prepare('DELETE FROM rate_limits WHERE reset_at < ?').bind(Math.floor(Date.now() / 1000)).run() // housekeeping
    return json({ token: await signJwt(env.AUTH_JWT_SECRET, id, TOKEN_TTL_SECONDS, { email }) }, 201)
  }

  if (!(await allow(db, `login:ip:${ip}`, LIMITS.loginPerIp)) || !(await allow(db, `login:email:${email}`, LIMITS.loginPerEmail))) return tooMany()
  const user = await db.prepare('SELECT id, key_hash FROM users WHERE email = ?').bind(email).first<{ id: string; key_hash: string }>()
  const matches = safeEqual(keyHash, user?.key_hash ?? DUMMY_HASH)
  if (!user || !matches) return fail(401, 'Incorrect email or password.')

  await db.prepare('DELETE FROM rate_limits WHERE key = ?').bind(`login:email:${email}`).run()
  return json({ token: await signJwt(env.AUTH_JWT_SECRET, user.id, TOKEN_TTL_SECONDS, { email }) })
}
