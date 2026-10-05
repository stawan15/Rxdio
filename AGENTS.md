# AGENTS.md

Rxdio — a Vite + React 19 + TypeScript PWA for live radio: an interactive 3D globe (react-three-fiber) to pick a country, Radio Browser API for stations, optional Supabase auth for favorites/playlists. Private, personal project.

## Commands

- `npm run dev` — Vite dev server on port 3000 (`host: true` for Docker)
- `npm run build` — `tsc && vite build`
- `npm run typecheck` / `npm run lint` (Biome, `src/` only) / `npm test` (Vitest)
- `docker compose up --build` — dev container; `docker-compose.prod.yml` builds the nginx image

CI runs lint, test, then build. Run all three after changes. `tsconfig.json` is `strict` with `noUnusedLocals`/`noUnusedParameters`.

Tooling notes: TypeScript is v7 (native). `typescript-eslint` doesn't support it yet, which is why linting uses Biome. Node ≥ 22.

## Environment

All optional (see `.env.example`); `.env*` is gitignored. Vite inlines them at build time, and the Dockerfile takes them as build args.

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — without them `supabase` is `null` and the app is guest-only (no sign-in, favorites, or playlists)
- `VITE_SITE_URL` — OAuth redirect (defaults to `window.location.origin`)

The app is usable without an account. Guests tapping a heart/playlist button get the sign-in dialog.

## Layout

- `src/App.tsx` — composition + app state (country, current station, queue, dialogs). Data logic lives in hooks.
- `src/hooks/` — `useLibrary` (favorites/playlists via Supabase, recents in localStorage, optimistic with rollback), `useRadio` (countries, stations; aborts stale requests), `useAuth`, `useTheme`, `useMediaQuery`, `useInstallPrompt`.
- `src/components/globe/` — `GlobeView` (Canvas, loader, hover tooltip, error fallback; lazy-loaded) and `GlobeScene` (day/night Earth shader, atmosphere, border overlay, markers, ripples, arcs, camera rig). Shaders in `shaders.ts`.
- `src/components/` — `StationList`, `BottomSheet` (phone: peek/half/full), `AudioPlayer` (desktop bar / mobile mini + full-screen), `Header`, `AppMenu`, `CountryPicker`, `Playlists`, `AuthDialog`, `Dialog`, `icons`.
- `src/lib/geo.ts` — lat/lon ↔ 3D, point-in-country lookup, nearest centroid. `src/lib/sun.ts` — subsolar point for the day/night terminator. Both are unit-tested.
- `src/data/` — `borders.json` (Natural Earth 110m via world-atlas, keyed by ISO alpha-2) and `centroids.json` (world-countries). Generated once; edit by regenerating, not by hand.
- `src/services/radioApi.ts` — Radio Browser wrapper; `supabaseClient.ts` — nullable client.
- `public/sw.js` — hand-written service worker (app shell offline; never touches streams/API). Bump `CACHE` if caching rules change. `public/textures/` — self-hosted Earth textures.
- `supabase_playlists_schema.sql` — run manually in the Supabase SQL editor; idempotent, safe on an existing database.

## Conventions

- Styling is Tailwind v4 (CSS-first config in `src/index.css`). Use the semantic tokens (`bg-surface`, `text-foreground`, `text-foreground-muted`, `border-border`, `bg-accent`, `text-heart`), never raw colors, so all three themes (`dark`, `light`, `pink`) work. A new theme needs: `ThemeMode`/`isThemeMode`/`THEMES`/`THEME_COLOR`/`accentHex`/`GLOBE_LOOK`/`AVATAR_COLORS` in `theme.ts`, a `[data-theme]` block in `index.css`, and the inline theme script in `index.html`.
- Compose classes with `cn()` (clsx + tailwind-merge).
- Touch targets are ≥ 44px. Overlay stacking: header `z-30`, sheet `z-20`, player `z-40`, full player `z-50`, dialogs `z-60`, toast `z-70`.
- Layout offsets use the CSS var `--player-h` (set on the app root; includes the safe-area inset). `main` has `margin-bottom: var(--player-h)`.
- Countries are keyed by ISO alpha-2 code everywhere (not by name). Display names come from `Intl.DisplayNames`.
- Function components, named exports (`App` is the default export). 2-space indent, no semicolons.
- Custom stations missing from Radio Browser (currently EFM 94) live in `CUSTOM_STATIONS` in `radioApi.ts` with a `custom-` uuid prefix; they are never sent to the API.
- Supabase tables are protected by RLS (`auth.uid() = user_id`); still pass `user_id` explicitly on every query, as `useLibrary` does.

## Gotchas

- On https pages the API is queried with `is_https=true` (http streams are blocked as mixed content). In http dev you see more stations.
- HLS streams (`.m3u8`) use `hls.js` (lazy-loaded) unless the browser plays HLS natively (Safari).
- Web Audio analysis of streams is deliberately not used: cross-origin streams without CORS return silence.
- Globe hit-testing: tap → ray hit on the sphere → lat/lon → polygon lookup; falls back to the nearest centroid within 3° for islands. Taps with drag distance > 6px are ignored.
- The camera rig runs at `useFrame` priority -2 so it resolves before drei's `OrbitControls` update; keep it negative.
- `@vercel/speed-insights` only reports on Vercel deployments.
