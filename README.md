# Rxdio 📻

Live radio from around the world on an interactive 3D globe — built as a phone-first PWA with **React 19**, **TypeScript**, **Three.js** and **Tailwind v4**.

## Features

- **Interactive globe** — real-time day/night with city lights, atmosphere glow, country borders. Tap any country to fly there and see its stations; pinch/drag to explore.
- **Easy on a phone** — the station list is a draggable bottom sheet (peek / half / full), 44px touch targets, safe-area aware. On desktop it's a side panel.
- **Player** — mini player + full-screen player, previous/next, sleep timer, lock-screen controls, auto-reconnect, HLS support.
- **Surprise me** — plays a random station and flies the globe to it.
- **Search** — pick a country by name (`⌘K` / `/` on desktop).
- **Favorites & playlists** — optional sign-in (email or Google) via Supabase. Browsing and listening need no account.
- **Themes** — Dark, Light, Neon.
- **Installable** — works as a PWA (add to home screen); the app shell loads offline.

## Getting started

Requires Node 22+.

```bash
npm install
npm run dev        # http://localhost:3000
```

### Optional: accounts (Supabase)

Copy `.env.example` to `.env` and fill in your project values. Then run `supabase_playlists_schema.sql` in the Supabase SQL editor (safe to re-run). Without these the app runs in guest-only mode.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Biome |
| `npm test` | Vitest |
| `npm run preview` | Serve `dist/` |

## Docker

```bash
docker compose up --build                          # dev, port 3000
docker compose -f docker-compose.prod.yml up --build   # nginx, port 80
```

`VITE_*` variables are read at **build** time (shell or `.env`). In GitHub Actions, add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_SITE_URL` as repository secrets so the published image includes them.

## Data & credits

- Stations: [Radio Browser](https://www.radio-browser.info/)
- Earth textures: [three.js examples](https://github.com/mrdoob/three.js) (MIT)
- Borders: [Natural Earth](https://www.naturalearthdata.com/) via `world-atlas`; centroids via `world-countries`

See `AGENTS.md` for architecture notes.

This project is private and intended for personal use. Built with ❤️ by Madam Eve.
