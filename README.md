# Radio Web Project 📻

A modern, immersive web radio experience built with **React**, **TypeScript**, and **Three.js**. This project features an interactive 3D globe, global radio station discovery, and a responsive UI designed for both desktop and mobile.

## 📌 Project Overview

This repository contains a frontend radio application with:

- An interactive 3D globe rendered using `@react-three/fiber` and `@react-three/drei`
- Theme modes: `dark`, `light`, and `pink`
- Country-based station selection and playback
- A custom pink globe style for the `pink` theme
- Supabase-based authentication support
- A Vercel Speed Insights helper module

## 🛠️ Tech Stack

- **Framework**: [React](https://reactjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **3D Graphics**: [Three.js](https://threejs.org/) / [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: Tailwind-style utility classes and custom CSS
- **API**: Radio Browser API and Supabase
- **Performance**: `@vercel/speed-insights`

## 📁 Important Files

- `src/App.tsx` — app layout, theme switching, globe container, and main UI
- `src/components/Globe.tsx` — 3D globe rendering and globe marker interactions
- `src/components/AudioPlayer.tsx` — station playback panel
- `src/components/StationList.tsx` — station browsing and selection
- `src/components/Auth.tsx` — Supabase sign-in / sign-out UI
- `src/services/radioApi.ts` — radio station API wrapper
- `src/services/supabaseClient.ts` — Supabase client setup
- `src/theme.ts` — theme definitions and helper functions
- `src/speedInsights.ts` — Vercel Speed Insights adapter

## 🚀 Performance Helper

`src/speedInsights.ts` exports the Vercel Speed Insights adapter for the project.

Use it like this:

```ts
import { SpeedInsights } from './speedInsights'
```

That file re-exports the Next-specific adapter from `@vercel/speed-insights/next`.

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:
   ```bash
git clone https://github.com/stawan15/Rxdio.git
cd Rxdio
```

2. Install dependencies:
   ```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Open the app at `http://localhost:5173`.

### Production

Build for production:

```bash
npm run build
```

Set `VITE_SITE_URL` to `https://rxdio.teveus.xyz` in production so Google OAuth redirects return to the correct domain.

Preview the production build:

```bash
npm run preview
```

## 🐳 Docker Support

The project includes a `Dockerfile` and `docker-compose.yml`.

Start the app with Docker Compose:

```bash
docker compose up --build
```

Stop and remove containers:

```bash
docker compose down
```

## 💡 Notes

- The pink globe appearance is configured in `src/components/Globe.tsx`.
- `theme.ts` controls theme colors and mode logic.
- `radioApi.ts` is used to fetch station data from the Radio Browser API.
- `supabaseClient.ts` handles authentication for user sessions.

This project is private and intended for personal use.

---
Built with ❤️ by Madam Eve.
