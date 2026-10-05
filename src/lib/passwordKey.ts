/**
 * Turns email + password into the 256-bit key sent to the server (never the password itself).
 * Must match what the server expects: PBKDF2-SHA256, 600k rounds, salt "rxdio:v1:<normalized email>".
 */
export const PBKDF2_ROUNDS = 600_000

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export async function derivePasswordKey(email: string, password: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('insecure-context')
  const material = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(`rxdio:v1:${normalizeEmail(email)}`), iterations: PBKDF2_ROUNDS },
    material,
    256,
  )
  return btoa(String.fromCharCode(...new Uint8Array(bits))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
