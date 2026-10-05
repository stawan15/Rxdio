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

/** How the globe is lit and tinted per theme */
export const GLOBE_LOOK: Record<ThemeMode, { tint: string; lights: string; atmosphere: string; borders: string; ambient: number; stars: number }> = {
  dark: { tint: '#ffffff', lights: '#ffb25a', atmosphere: '#7aa2e8', borders: '#f1ece2', ambient: 0.1, stars: 3500 },
  light: { tint: '#ffffff', lights: '#ff9a3c', atmosphere: '#8aa5d6', borders: '#17140f', ambient: 0.55, stars: 0 },
  cobalt: { tint: '#c8d8ff', lights: '#ffd45a', atmosphere: '#8fa9ff', borders: '#f5f0e2', ambient: 0.16, stars: 2200 },
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
