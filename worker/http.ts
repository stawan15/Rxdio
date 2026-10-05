export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

export const fail = (status: number, message: string, headers?: HeadersInit) => json({ error: message }, status, headers)

export const done = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
