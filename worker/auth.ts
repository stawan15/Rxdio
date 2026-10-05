/**
 * AUTH SEAM — the only place the API learns who the caller is.
 *
 * Default contract: `Authorization: Bearer <JWT>` signed HS256 with `AUTH_JWT_SECRET`, carrying `sub` (user id)
 * and `exp`. Your sign-in/sign-up endpoints can mint tokens with `signJwt`. To use a different scheme
 * (cookie session, another provider's JWKS, …) replace `getUserId`; nothing else needs to change.
 */

export interface AuthEnv {
  AUTH_JWT_SECRET?: string
}

const encoder = new TextEncoder()

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')

const fromBase64Url = (text: string) => {
  const padded = text.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(text.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

const hmacKey = (secret: string, usage: 'sign' | 'verify') =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage])

/** Creates a token for `userId` valid for `ttlSeconds`. Extra claims (e.g. `email`) are optional. */
export async function signJwt(secret: string, userId: string, ttlSeconds: number, claims: Record<string, unknown> = {}) {
  const header = toBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const payload = toBase64Url(encoder.encode(JSON.stringify({ ...claims, sub: userId, exp: Math.floor(Date.now() / 1000) + ttlSeconds })))
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), encoder.encode(`${header}.${payload}`))
  return `${header}.${payload}.${toBase64Url(new Uint8Array(signature))}`
}

/** Returns the user id from a valid, unexpired token, otherwise null. */
export async function getUserId(request: Request, env: AuthEnv): Promise<string | null> {
  const secret = env.AUTH_JWT_SECRET
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!secret || !token) return null

  const [header, payload, signature, extra] = token.split('.')
  if (!header || !payload || !signature || extra !== undefined) return null
  try {
    if (JSON.parse(new TextDecoder().decode(fromBase64Url(header))).alg !== 'HS256') return null
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret, 'verify'), fromBase64Url(signature), encoder.encode(`${header}.${payload}`))
    if (!valid) return null
    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)))
    const userId = claims.sub
    if (typeof userId !== 'string' || userId.length === 0 || userId.length > 128) return null
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) return null
    return userId
  } catch {
    return null
  }
}
