export type ThemeMode = 'dark' | 'light' | 'pink'

export const THEME_STORAGE_KEY = 'rxdio_theme'

export const THEMES: { mode: ThemeMode; label: string }[] = [
  { mode: 'dark', label: 'Dark' },
  { mode: 'light', label: 'Light' },
  { mode: 'pink', label: 'Neon' },
]

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'pink'
}

/** Browser/PWA chrome color — keep in sync with `--c-surface` in index.css */
export const THEME_COLOR: Record<ThemeMode, string> = { dark: '#000000', light: '#faf9f7', pink: '#0a0508' }

/** Three.js / canvas — accent hex per mode */
export function accentHex(mode: ThemeMode): string {
  if (mode === 'dark') return '#00ff88'
  if (mode === 'pink') return '#ff2a85'
  return '#2f6fdb'
}

/** How the globe is lit and tinted per theme */
export const GLOBE_LOOK: Record<ThemeMode, { tint: string; lights: string; atmosphere: string; borders: string; ambient: number; stars: number }> = {
  dark: { tint: '#ffffff', lights: '#ffd596', atmosphere: '#4db8ff', borders: '#ffffff', ambient: 0.1, stars: 3500 },
  light: { tint: '#ffffff', lights: '#ffb347', atmosphere: '#6aa6ff', borders: '#101828', ambient: 0.55, stars: 0 },
  pink: { tint: '#ffc2dc', lights: '#ff6fb1', atmosphere: '#ff5fa8', borders: '#ffd1e3', ambient: 0.18, stars: 1500 },
}

const AVATAR_COLORS: Record<ThemeMode, [bg: string, fg: string]> = {
  dark: ['#171717', '#ffffff'],
  light: ['#f3f1ee', '#1a1a1a'],
  pink: ['#ff2a85', '#000000'],
}

/** Offline-safe letter avatar for stations without a usable favicon */
export function avatarUrl(mode: ThemeMode, name: string) {
  const [bg, fg] = AVATAR_COLORS[mode]
  const letter = (name.trim().charAt(0) || '♪').toUpperCase().replace(/[<>&]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/><text x="32" y="43" font-family="system-ui,sans-serif" font-size="30" font-weight="700" text-anchor="middle" fill="${fg}">${letter}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
