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

The frontend has no env vars. The Worker needs `AUTH_JWT_SECRET` (signs login tokens) (`.dev.vars` locally, a Worker secret in production; see `.dev.vars.example`) and the D1 binding `DB` from `wrangler.toml` (replace the placeholder `database_id` after `wrangler d1 create`).

The app is usable without an account. Guests tapping a heart/playlist button get the sign-in dialog.

## Auth

Email + password accounts live in D1 (`users`, `rate_limits`; `worker/accounts.ts`). Design constraints worth knowing:
- Workers' free plan allows **10 ms CPU per request**; PBKDF2 at a safe cost (600k rounds ≈ 70 ms) doesn't fit. So the **browser** derives a 256-bit key (`src/lib/passwordKey.ts`: PBKDF2-SHA256, 600k rounds, salt `rxdio:v1:<email>`) and sends only that. The server stores SHA-256 of the key. The password never reaches the server. Changing the salt scheme or rounds locks out every existing account, so a golden-value test pins it.
- Because of that the password policy (min 8 chars) is enforced client-side in `AuthDialog`.
- `POST /api/auth/signup|login` take `{ email, key }` and return `{ token }`. Login errors are generic and the unknown-email path does the same work as a wrong password. Attempts are throttled per IP and per email via `rate_limits`.
- Tokens: HS256 JWT (`sub` = user id, `email`, 14-day `exp`), sent as `Authorization: Bearer`. `worker/auth.ts` `getUserId` is the only place the API reads identity. The client keeps it in localStorage (`rxdio_token`); a 401 from the API signs the user out. There is no server-side revocation, so rotating `AUTH_JWT_SECRET` signs everyone out.
- Not built: email verification and password reset (both need an email provider). The signup form tells users there is no reset.

## UX principles

The UI is built around the Laws of UX. Keep these intact when changing things:

| Law | Where it shows up |
| --- | --- |
| Fitts's Law | Shuffle is a 56px FAB in the phone thumb zone, riding on top of the sheet; every control is ≥ 44px; the full player closes by swiping down |
| Hick's Law | Phone header is only logo / country / menu; country picker shows 8 "Popular" countries before "All countries"; one visible primary action per surface |
| Jakob's Law | Bottom sheet, mini → full player, heart to save, swipe-down dismiss, ⌘K search: patterns from maps and music apps |
| Miller's Law | Lists are chunked (Popular / All countries, tabs with counts) |
| Doherty Threshold | Optimistic writes, skeleton rows, spinner on the connecting station, haptic tick on play/save, "Connecting…" status |
| Peak–End Rule | Shuffle announces where you landed; the sleep timer fades the volume out over 10 s and says good night |
| Postel's Law | Country search accepts English or local-language names, ISO codes and nicknames (usa, uk); emails are trimmed and case-folded |
| Zeigarnik / Tesler | The app remembers the last country and station and reopens ready to resume (never auto-plays); locale picks the first country |
| Visibility of status | Tab counts, player state on the row, sleep-timer countdown on its button |
| Von Restorff | The accent color is reserved for the primary action (play, shuffle, selected country) |
| Learnability | A one-time tip explains the globe; it dismisses itself on first interaction |

## Layout

- `src/App.tsx` — composition + app state (country, current station, queue, dialogs). Data logic lives in hooks.
- `src/lib/passwordKey.ts` — browser-side password stretching (see Auth). `src/lib/haptics.ts` — vibration tick.
- `src/hooks/` — `useLibrary` (favorites/playlists via `/api`, recents in localStorage, optimistic with rollback), `useRadio` (countries, stations; aborts stale requests), `useTheme`, `useMediaQuery`, `useInstallPrompt`.
- `src/components/globe/` — `GlobeView` (Canvas, loader, hover tooltip, error fallback; lazy-loaded) and `GlobeScene` (day/night Earth shader, atmosphere, border overlay, markers, ripples, arcs, camera rig). Shaders in `shaders.ts`.
- `src/components/` — `StationList`, `BottomSheet` (phone: peek/half/full), `AudioPlayer` (desktop bar / mobile mini + full-screen), `Header`, `AppMenu`, `CountryPicker`, `Playlists`, `AuthDialog`, `Dialog`, `icons`.
- `src/lib/geo.ts` — lat/lon ↔ 3D, point-in-country lookup, nearest centroid. `src/lib/sun.ts` — subsolar point for the day/night terminator. Both are unit-tested.
- `src/data/` — `borders.json` (Natural Earth 110m via world-atlas, keyed by ISO alpha-2) and `centroids.json` (world-countries). Generated once; edit by regenerating, not by hand.
- `src/services/` — `radioApi.ts` (Radio Browser), `libraryApi.ts` (typed `/api` client), `auth.ts` (token + session store).
- `worker/` — Cloudflare Worker: `index.ts` (REST routes over D1, per-user quotas, ownership checks), `accounts.ts` (signup/login + throttling), `auth.ts` (JWT sign/verify, `getUserId`), `http.ts` (response helpers). Served with `[assets]` from `wrangler.toml`; only `/api/*` runs the Worker.
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
- The first `d1 migrations apply --remote` after pulling new migrations must happen before the deploy that uses them.
- Cloudflare Workers Builds needs the Worker name in `wrangler.toml` to match the dashboard project name (`rxdio`).
