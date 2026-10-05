import { getUserId, type AuthEnv } from './auth'

interface Env extends AuthEnv {
  DB: D1Database
}

const STATION_ID = /^[\w-]{1,64}$/
const MAX_NAME = 60
// Keeps one account from burning through D1's free write quota
const LIMITS = { favorites: 1000, playlists: 50, playlistStations: 500 }

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
const fail = (status: number, message: string) => json({ error: message }, status)
const done = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })

async function readName(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  return name.length >= 1 && name.length <= MAX_NAME ? name : null
}

async function count(db: D1Database, sql: string, ...binds: string[]) {
  return (await db.prepare(sql).bind(...binds).first<number>('n')) ?? 0
}

const ownsPlaylist = async (db: D1Database, playlistId: string, userId: string) =>
  (await db.prepare('SELECT 1 AS ok FROM playlists WHERE id = ? AND user_id = ?').bind(playlistId, userId).first()) !== null

export default {
  async fetch(request, env): Promise<Response> {
    let segments: string[]
    try {
      segments = new URL(request.url).pathname.split('/').slice(2).map(decodeURIComponent) // drop "" and "api"
    } catch {
      return fail(400, 'Bad request')
    }
    const [resource, id, child, childId] = segments
    const { method } = request

    // YOUR SIGN-IN GOES HERE. Handle POST /api/auth/login and /api/auth/signup (see src/services/auth.ts for the
    // contract) before the auth check below, and return { token: await signJwt(env.AUTH_JWT_SECRET, userId, ttl) }.
    if (resource === 'auth') return fail(404, 'Sign-in is not available yet.')

    const userId = await getUserId(request, env)
    if (!userId) return fail(401, 'Not signed in')

    const db = env.DB

    // GET /api/library — everything the app needs in one round trip
    if (resource === 'library' && !id && method === 'GET') {
      const [favorites, playlists, links] = await db.batch<Record<string, string>>([
        db.prepare('SELECT station_id FROM favorites WHERE user_id = ? ORDER BY rowid').bind(userId),
        db.prepare('SELECT id, name FROM playlists WHERE user_id = ? ORDER BY rowid').bind(userId),
        db.prepare(
          'SELECT ps.playlist_id, ps.station_id FROM playlist_stations ps JOIN playlists p ON p.id = ps.playlist_id WHERE p.user_id = ? ORDER BY ps.rowid',
        ).bind(userId),
      ])
      return json({
        favorites: favorites.results.map(r => r.station_id),
        playlists: playlists.results,
        links: links.results.map(r => ({ playlistId: r.playlist_id, stationId: r.station_id })),
      })
    }

    // /api/favorites/:stationId
    if (resource === 'favorites' && id && !child) {
      if (!STATION_ID.test(id)) return fail(400, 'Invalid station id')
      if (method === 'PUT') {
        const name = await readName(request)
        if (!name) return fail(400, 'Invalid name')
        if ((await count(db, 'SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?', userId)) >= LIMITS.favorites) return fail(409, 'Too many favorites')
        await db.prepare('INSERT OR IGNORE INTO favorites (user_id, station_id, station_name) VALUES (?, ?, ?)').bind(userId, id, name).run()
        return done()
      }
      if (method === 'DELETE') {
        await db.prepare('DELETE FROM favorites WHERE user_id = ? AND station_id = ?').bind(userId, id).run()
        return done()
      }
    }

    // POST /api/playlists
    if (resource === 'playlists' && !id && method === 'POST') {
      const name = await readName(request)
      if (!name) return fail(400, 'Invalid name')
      if ((await count(db, 'SELECT COUNT(*) AS n FROM playlists WHERE user_id = ?', userId)) >= LIMITS.playlists) return fail(409, 'Too many playlists')
      const playlistId = crypto.randomUUID()
      await db.prepare('INSERT INTO playlists (id, user_id, name) VALUES (?, ?, ?)').bind(playlistId, userId, name).run()
      return json({ id: playlistId, name }, 201)
    }

    // /api/playlists/:id
    if (resource === 'playlists' && id && !child) {
      if (method === 'PATCH') {
        const name = await readName(request)
        if (!name) return fail(400, 'Invalid name')
        const result = await db.prepare('UPDATE playlists SET name = ? WHERE id = ? AND user_id = ?').bind(name, id, userId).run()
        return result.meta.changes ? done() : fail(404, 'Playlist not found')
      }
      if (method === 'DELETE') {
        await db.batch([
          db.prepare('DELETE FROM playlist_stations WHERE playlist_id IN (SELECT id FROM playlists WHERE id = ? AND user_id = ?)').bind(id, userId),
          db.prepare('DELETE FROM playlists WHERE id = ? AND user_id = ?').bind(id, userId),
        ])
        return done()
      }
    }

    // /api/playlists/:id/stations/:stationId
    if (resource === 'playlists' && id && child === 'stations' && childId) {
      if (!STATION_ID.test(childId)) return fail(400, 'Invalid station id')
      if (!(await ownsPlaylist(db, id, userId))) return fail(404, 'Playlist not found')
      if (method === 'PUT') {
        if ((await count(db, 'SELECT COUNT(*) AS n FROM playlist_stations WHERE playlist_id = ?', id)) >= LIMITS.playlistStations) return fail(409, 'Playlist is full')
        await db.prepare('INSERT OR IGNORE INTO playlist_stations (playlist_id, station_id) VALUES (?, ?)').bind(id, childId).run()
        return done()
      }
      if (method === 'DELETE') {
        await db.prepare('DELETE FROM playlist_stations WHERE playlist_id = ? AND station_id = ?').bind(id, childId).run()
        return done()
      }
    }

    return fail(404, 'Not found')
  },
} satisfies ExportedHandler<Env>
