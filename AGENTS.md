# AGENTS.md

Rxdio — a Vite + React 19 + TypeScript PWA for live radio: an interactive 3D globe (react-three-fiber) to pick a country, Radio Browser API for stations, a Cloudflare Worker + D1 API for favorites/playlists (auth is supplied separately). Private, personal project.

## Commands

- `npm run dev` — Vite dev server on port 3000 (`host: true` for Docker)
- `npm run build` — `tsc && vite build`
- `npm run typecheck` / `npm run lint` (Biome, `src/` only) / `npm test` (Vitest)
- `npm run dev:api` — Worker + local D1 on :8788 (Vite proxies `/api`); `npm run db:migrate` applies `migrations/` locally; `npm run dev:token -- <user>` prints a test token (needs `.dev.vars`)
- `docker compose up --build` — static-only dev container (no `/api`)

CI runs lint, test, then build. Run all three after changes. `typecheck` covers both `src/` and `worker/`. `tsconfig.json` is `strict` with `noUnusedLocals`/`noUnusedParameters`.

Tooling notes: TypeScript is v7 (native). `typescript-eslint` doesn't support it yet, which is why linting uses Biome. Node ≥ 22.

## Environment

The frontend has no env vars. The Worker needs `AUTH_JWT_SECRET` (`.dev.vars` locally, a Worker secret in production; see `.dev.vars.example`) and the D1 binding `DB` from `wrangler.toml` (replace the placeholder `database_id` after `wrangler d1 create`).

The app is usable without an account. Guests tapping a heart/playlist button get the sign-in dialog.

## Auth contract

The user supplies sign-in; the app and API only agree on a token:
- API: `worker/auth.ts` `getUserId` verifies `Authorization: Bearer <HS256 JWT>` (needs `sub`, `exp`). Replace that one function to change schemes. `signJwt` mints tokens.
- Client: `src/services/auth.ts` stores the token (`rxdio_token` in localStorage), decodes it for the session, and calls `POST /api/auth/login|signup` (`{ email, password }` → `{ token }`). Those endpoints are a stub returning 404 in `worker/index.ts` until implemented, and they must run before the auth check there.
- A 401 from the API signs the user out.

## Layout

- `src/App.tsx` — composition + app state (country, current station, queue, dialogs). Data logic lives in hooks.
- `src/hooks/` — `useLibrary` (favorites/playlists via `/api`, recents in localStorage, optimistic with rollback), `useRadio` (countries, stations; aborts stale requests), `useTheme`, `useMediaQuery`, `useInstallPrompt`.
- `src/components/globe/` — `GlobeView` (Canvas, loader, hover tooltip, error fallback; lazy-loaded) and `GlobeScene` (day/night Earth shader, atmosphere, border overlay, markers, ripples, arcs, camera rig). Shaders in `shaders.ts`.
- `src/components/` — `StationList`, `BottomSheet` (phone: peek/half/full), `AudioPlayer` (desktop bar / mobile mini + full-screen), `Header`, `AppMenu`, `CountryPicker`, `Playlists`, `AuthDialog`, `Dialog`, `icons`.
- `src/lib/geo.ts` — lat/lon ↔ 3D, point-in-country lookup, nearest centroid. `src/lib/sun.ts` — subsolar point for the day/night terminator. Both are unit-tested.
- `src/data/` — `borders.json` (Natural Earth 110m via world-atlas, keyed by ISO alpha-2) and `centroids.json` (world-countries). Generated once; edit by regenerating, not by hand.
- `src/services/` — `radioApi.ts` (Radio Browser), `libraryApi.ts` (typed `/api` client), `auth.ts` (token + session store).
- `worker/` — Cloudflare Worker: `index.ts` (REST routes over D1, per-user quotas, ownership checks), `auth.ts` (auth seam). Served with `[assets]` from `wrangler.toml`; only `/api/*` runs the Worker.
- `migrations/` — D1 schema (`wrangler d1 migrations`); never edit an applied file, add a new one.
- `public/sw.js` — hand-written service worker (app shell offline; never touches streams/API). Bump `CACHE` if caching rules change. `public/textures/` — self-hosted Earth textures.

## Conventions

- Styling is Tailwind v4 (CSS-first config in `src/index.css`). Use the semantic tokens (`bg-surface`, `text-foreground`, `text-foreground-muted`, `border-border`, `bg-accent`, `text-heart`), never raw colors, so all three themes (`dark`, `light`, `pink`) work. A new theme needs: `ThemeMode`/`isThemeMode`/`THEMES`/`THEME_COLOR`/`accentHex`/`GLOBE_LOOK`/`AVATAR_COLORS` in `theme.ts`, a `[data-theme]` block in `index.css`, and the inline theme script in `index.html`.
- Compose classes with `cn()` (clsx + tailwind-merge).
- Touch targets are ≥ 44px. Overlay stacking: header `z-30`, sheet `z-20`, player `z-40`, full player `z-50`, dialogs `z-60`, toast `z-70`.
- Layout offsets use the CSS var `--player-h` (set on the app root; includes the safe-area inset). `main` has `margin-bottom: var(--player-h)`.
- Countries are keyed by ISO alpha-2 code everywhere (not by name). Display names come from `Intl.DisplayNames`.
- Function components, named exports (`App` is the default export). 2-space indent, no semicolons.
- Custom stations missing from Radio Browser (currently EFM 94) live in `CUSTOM_STATIONS` in `radioApi.ts` with a `custom-` uuid prefix; they are never sent to the API.
- Every D1 query in `worker/index.ts` is scoped by the authenticated `user_id`, and playlist routes check ownership first. Keep it that way: D1 has no row-level security.

## Gotchas

- On https pages the API is queried with `is_https=true` (http streams are blocked as mixed content). In http dev you see more stations.
- HLS streams (`.m3u8`) use `hls.js` (lazy-loaded) unless the browser plays HLS natively (Safari).
- Web Audio analysis of streams is deliberately not used: cross-origin streams without CORS return silence.
- Globe hit-testing: tap → ray hit on the sphere → lat/lon → polygon lookup; falls back to the nearest centroid within 3° for islands. Taps with drag distance > 6px are ignored.
- The camera rig runs at `useFrame` priority -2 so it resolves before drei's `OrbitControls` update; keep it negative.
- `@vercel/speed-insights` only reports on Vercel deployments.
- Cloudflare Workers Builds needs the Worker name in `wrangler.toml` to match the dashboard project name (`rxdio`).
