export type ThemeMode = 'dark' | 'light' | 'cobalt'

export const THEME_STORAGE_KEY = 'rxdio_theme'

export const THEMES: { mode: ThemeMode; label: string }[] = [
  { mode: 'dark', label: 'Night' },
  { mode: 'light', label: 'Paper' },
  { mode: 'cobalt', label: 'Cobalt' },
]

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'cobalt'
}

/** Browser/PWA chrome color — keep in sync with `--c-surface` in index.css */
export const THEME_COLOR: Record<ThemeMode, string> = { dark: '#0e0d0b', light: '#f2ede2', cobalt: '#0a1f66' }

/** Three.js / canvas — accent hex per mode (matches `--c-accent`) */
export function accentHex(mode: ThemeMode): string {
  if (mode === 'dark') return '#ff5a1f'
  if (mode === 'cobalt') return '#ffc61a'
  return '#e03d0c'
}

/** [surface, accent] pairs for the theme swatches in the menu */
export const THEME_SWATCH: Record<ThemeMode, [string, string]> = {
  dark: ['#0e0d0b', '#ff5a1f'],
  light: ['#f2ede2', '#e03d0c'],
  cobalt: ['#0a1f66', '#ffc61a'],
}

/** Globe colours per theme: the sphere, the land dots, and how strongly the night half dims (see shaders.ts) */
export const GLOBE_LOOK: Record<ThemeMode, { ocean: string; land: string; night: number }> = {
  dark: { ocean: '#1a1712', land: '#b8ae9c', night: 0.62 },
  light: { ocean: '#ece6d6', land: '#2a261f', night: 0.84 },
  cobalt: { ocean: '#0e2f94', land: '#dde5ff', night: 0.7 },
}

const AVATAR_COLORS: Record<ThemeMode, [bg: string, fg: string]> = {
  dark: ['#1f1c18', '#f1ece2'],
  light: ['#e8e2d4', '#17140f'],
  cobalt: ['#123088', '#f5f0e2'],
}

/** Offline-safe letter avatar for stations without a usable favicon */
export function avatarUrl(mode: ThemeMode, name: string) {
  const [bg, fg] = AVATAR_COLORS[mode]
  const letter = (name.trim().charAt(0) || '·').toUpperCase().replace(/[<>&]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/><text x="32" y="42" font-family="ui-monospace,Menlo,monospace" font-size="28" font-weight="600" text-anchor="middle" fill="${fg}">${letter}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
