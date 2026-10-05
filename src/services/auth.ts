import { useSyncExternalStore } from 'react'
import { writeStorage } from '../lib/storage'

/**
 * Client side of the auth seam. The app only needs a token the API accepts (see functions/_lib/auth.ts).
 * Your backend decides how users sign in; these two endpoints are the contract:
 *   POST /api/auth/login   { email, password } -> { token }   (or { error } with a 4xx status)
 *   POST /api/auth/signup  { email, password } -> { token }
 */

const TOKEN_KEY = 'rxdio_token'

export interface Session {
  token: string
  userId: string
  email?: string
}

function decode(token: string): Session | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')))
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null
    return { token, userId: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined }
  } catch {
    return null
  }
}

function stored() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    return token ? decode(token) : null
  } catch {
    return null
  }
}

let current: Session | null = stored()
const listeners = new Set<() => void>()

export function setToken(token: string | null) {
  current = token ? decode(token) : null
  if (current) writeStorage(TOKEN_KEY, token as string)
  else try { localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ }
  for (const notify of listeners) notify()
}

export const signOut = () => setToken(null)
export const getToken = () => current?.token ?? null

export function useSession() {
  return useSyncExternalStore(
    notify => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    () => current,
  )
}

export async function signIn(mode: 'login' | 'signup', email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = (await res.json().catch(() => null)) as { token?: string; error?: string } | null
    if (!res.ok || !body?.token) return body?.error ?? (res.status === 404 ? 'Sign-in is not available yet.' : 'Something went wrong. Please try again.')
    setToken(body.token)
    return null
  } catch {
    return 'Could not reach the server. Check your connection.'
  }
}
