# Rxdio 📻

Live radio from around the world on an interactive 3D globe — built as a phone-first PWA with **React 19**, **TypeScript**, **Three.js** and **Tailwind v4**.

## Features

- **Interactive globe** — real-time day/night with city lights, atmosphere glow, country borders. Tap any country to fly there and see its stations; pinch/drag to explore.
- **Easy on a phone** — the station list is a draggable bottom sheet (peek / half / full), 44px touch targets, safe-area aware. On desktop it's a side panel.
- **Player** — mini player + full-screen player, previous/next, sleep timer, lock-screen controls, auto-reconnect, HLS support.
- **Surprise me** — plays a random station and flies the globe to it.
- **Search** — pick a country by name (`⌘K` / `/` on desktop).
- **Favorites & playlists** — optional sign-in, stored in Cloudflare D1. Browsing and listening need no account.
- **Themes** — Dark, Light, Neon.
- **Installable** — works as a PWA (add to home screen); the app shell loads offline.

## Getting started

Requires Node 22+.

```bash
npm install
npm run dev        # http://localhost:3000
```

### Accounts, favorites and playlists (Cloudflare Worker + D1)

Favorites and playlists live in a Cloudflare D1 database behind a small Worker API (`worker/`). Without it the app still works as a guest.

```bash
cp .dev.vars.example .dev.vars    # local secret for signing tokens
npm run db:migrate                # create the tables in the local D1
npm run dev:api                   # Worker + local D1 on :8788 (Vite proxies /api to it)
npm run dev                       # in a second terminal
npm run dev:token -- alice        # prints a test login token; run in the browser console:
                                  #   localStorage.setItem('rxdio_token', '<token>'); location.reload()
```

**Sign-in is yours to implement.** The API trusts a `Bearer` JWT (HS256, `AUTH_JWT_SECRET`) whose `sub` is the user id. Add `POST /api/auth/login` and `/api/auth/signup` in `worker/index.ts` (the spot is marked) returning `{ token }`; `signJwt` in `worker/auth.ts` mints it. To use another scheme, replace `getUserId` in `worker/auth.ts`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | `tsc` for the app and the Worker |
| `npm run lint` | Biome |
| `npm run dev:api` / `db:migrate` / `dev:token` | Local Worker, D1 migrations, test token |
| `npm test` | Vitest |
| `npm run preview` | Serve `dist/` |

## Deploy to Cloudflare (Workers + D1)

1. `npx wrangler login`, then `npx wrangler d1 create rxdio` and paste the printed `database_id` into `wrangler.toml`.
2. `npx wrangler d1 migrations apply rxdio --remote`
3. Merge to `main`. In the Cloudflare dashboard (Workers & Pages → Create → Import a repository) use:
   build command `npm run build`, deploy command `npx wrangler deploy`. The project name must match `name` in `wrangler.toml` (`rxdio`).
4. Add the secret: Worker → Settings → Variables and Secrets → `AUTH_JWT_SECRET` (long random string), or `npx wrangler secret put AUTH_JWT_SECRET`.

Later schema changes go in a new `migrations/000N_*.sql` file; apply it with step 2 before deploying.

## Docker (static only)

`docker compose up --build` (dev) or `docker compose -f docker-compose.prod.yml up --build` (nginx). The image has no `/api`, so there are no accounts there: guests only.

## Data & credits

- Stations: [Radio Browser](https://www.radio-browser.info/)
- Earth textures: [three.js examples](https://github.com/mrdoob/three.js) (MIT)
- Borders: [Natural Earth](https://www.naturalearthdata.com/) via `world-atlas`; centroids via `world-countries`

See `AGENTS.md` for architecture notes.

This project is private and intended for personal use. Built with ❤️ by Madam Eve.
