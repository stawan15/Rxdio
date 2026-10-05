import { describe, expect, it } from 'vitest'
import { derivePasswordKey } from './passwordKey'

describe('derivePasswordKey', () => {
  it('matches a known value (PBKDF2-SHA256, 600k rounds, salt "rxdio:v1:a@b.co")', async () => {
    // computed once with Node's crypto.pbkdf2Sync; changing the scheme breaks every existing account
    expect(await derivePasswordKey('a@b.co', 'hunter2hunter2')).toBe('fdq0yBgMUHaHdytYvjxLejXXmvwVaNVUFPnXJdG5S34')
  })

  it('treats emails case- and whitespace-insensitively', async () => {
    expect(await derivePasswordKey('  A@B.co ', 'pw-12345678')).toBe(await derivePasswordKey('a@b.co', 'pw-12345678'))
  })

  it('gives different keys for different passwords or emails', async () => {
    const base = await derivePasswordKey('a@b.co', 'pw-12345678')
    expect(await derivePasswordKey('a@b.co', 'pw-12345679')).not.toBe(base)
    expect(await derivePasswordKey('c@d.co', 'pw-12345678')).not.toBe(base)
  })

  it('produces a 43-character base64url key', async () => {
    expect(await derivePasswordKey('a@b.co', 'x')).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })
})
