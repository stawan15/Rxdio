import { describe, expect, it } from 'vitest'
import { hashKey, normalizeEmail, safeEqual } from './accounts'

describe('accounts helpers', () => {
  it('normalizes emails', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com')
  })

  it('compares strings in a length-safe way', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
    expect(safeEqual('', '')).toBe(true)
  })

  it('hashes keys deterministically to 43 base64url characters', async () => {
    const a = await hashKey('k'.repeat(43))
    expect(a).toBe(await hashKey('k'.repeat(43)))
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a).not.toBe(await hashKey('j'.repeat(43)))
  })
})
