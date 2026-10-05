// Prints a signed token for local testing: npm run dev:token -- some-user-id
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'

const secret = readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').match(/^AUTH_JWT_SECRET=(.+)$/m)?.[1]
if (!secret) throw new Error('Set AUTH_JWT_SECRET in .dev.vars first (copy .dev.vars.example)')

const part = obj => Buffer.from(JSON.stringify(obj)).toString('base64url')
const body = `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: process.argv[2] ?? 'dev-user', email: `${process.argv[2] ?? 'dev-user'}@example.com`, exp: Math.floor(Date.now() / 1000) + 86400 })}`
console.log(`${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`)
