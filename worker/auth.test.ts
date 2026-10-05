import { describe, expect, it } from 'vitest'
import { getUserId, signJwt } from './auth'

const secret = 'test-secret'
const request = (token?: string) => new Request('https://x.test/api/library', { headers: token ? { Authorization: `Bearer ${token}` } : {} })

describe('getUserId', () => {
  it('accepts a valid token', async () => {
    expect(await getUserId(request(await signJwt(secret, 'user-1', 60)), { AUTH_JWT_SECRET: secret })).toBe('user-1')
  })

  it('rejects missing headers and a missing server secret', async () => {
    expect(await getUserId(request(), { AUTH_JWT_SECRET: secret })).toBeNull()
    expect(await getUserId(request(await signJwt(secret, 'user-1', 60)), {})).toBeNull()
  })

  it('rejects expired tokens', async () => {
    expect(await getUserId(request(await signJwt(secret, 'user-1', -10)), { AUTH_JWT_SECRET: secret })).toBeNull()
  })

  it('rejects a token signed with another secret', async () => {
    expect(await getUserId(request(await signJwt('other', 'user-1', 60)), { AUTH_JWT_SECRET: secret })).toBeNull()
  })

  it('rejects tampered payloads and malformed tokens', async () => {
    const [h, , s] = (await signJwt(secret, 'user-1', 60)).split('.')
    const forged = `${h}.${btoa(JSON.stringify({ sub: 'admin', exp: 9999999999 })).replaceAll('=', '')}.${s}`
    expect(await getUserId(request(forged), { AUTH_JWT_SECRET: secret })).toBeNull()
    expect(await getUserId(request('not-a-jwt'), { AUTH_JWT_SECRET: secret })).toBeNull()
    expect(await getUserId(request('a.b.c.d'), { AUTH_JWT_SECRET: secret })).toBeNull()
  })

  it('rejects a token using the "none" algorithm', async () => {
    const part = (o: object) => btoa(JSON.stringify(o)).replaceAll('=', '')
    const unsigned = `${part({ alg: 'none' })}.${part({ sub: 'user-1', exp: 9999999999 })}.x`
    expect(await getUserId(request(unsigned), { AUTH_JWT_SECRET: secret })).toBeNull()
  })
})
