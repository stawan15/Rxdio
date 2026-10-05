export type ThemeMode = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'rxdio_theme'

export const THEMES: { mode: ThemeMode; label: string }[] = [
  { mode: 'dark', label: 'Night' },
  { mode: 'light', label: 'Paper' },
]

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light'
}

/* Black and white only: no hue anywhere. Keep `--c-*` in index.css in sync. */

/** Browser/PWA chrome color — matches `--c-surface` in index.css */
export const THEME_COLOR: Record<ThemeMode, string> = { dark: '#0a0a0a', light: '#fafafa' }

/** Three.js / canvas — accent hex per mode (matches `--c-accent`) */
export function accentHex(mode: ThemeMode): string {
  return mode === 'dark' ? '#f5f5f5' : '#0a0a0a'
}

/** [surface, accent] pairs for the theme swatches in the menu */
export const THEME_SWATCH: Record<ThemeMode, [string, string]> = {
  dark: ['#0a0a0a', '#f5f5f5'],
  light: ['#fafafa', '#0a0a0a'],
}

type GlobeLook = {
  ocean: string
  /** four land shades; neighbouring countries never share one (see lib/mapColors.ts) */
  tones: [string, string, string, string]
  border: string
  selected: string
  outline: string
  hover: string
  /** thin ring at the globe's edge */
  rim: string
  /** playing-station pin and the fly-to arc */
  pin: string
  /** brightness of the night half, 0..1 */
  night: number
}

export const GLOBE_LOOK: Record<ThemeMode, GlobeLook> = {
  dark: {
    ocean: '#000000',
    tones: ['#1d1d1d', '#2b2b2b', '#393939', '#484848'],
    border: '#000000',
    selected: '#f5f5f5',
    outline: '#ffffff',
    hover: '#ffffff',
    rim: '#555555',
    pin: '#ffffff',
    night: 0.55,
  },
  light: {
    ocean: '#ffffff',
    tones: ['#ececec', '#dedede', '#d0d0d0', '#c2c2c2'],
    border: '#ffffff',
    selected: '#0a0a0a',
    outline: '#0a0a0a',
    hover: '#0a0a0a',
    rim: '#0a0a0a',
    pin: '#0a0a0a',
    night: 0.88,
  },
}

const AVATAR_COLORS: Record<ThemeMode, [bg: string, fg: string]> = {
  dark: ['#1f1f1f', '#f5f5f5'],
  light: ['#ebebeb', '#0a0a0a'],
}

/** Offline-safe letter avatar for stations without a usable favicon */
export function avatarUrl(mode: ThemeMode, name: string) {
  const [bg, fg] = AVATAR_COLORS[mode]
  const letter = (name.trim().charAt(0) || '·').toUpperCase().replace(/[<>&]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/><text x="32" y="42" font-family="ui-monospace,Menlo,monospace" font-size="28" font-weight="600" text-anchor="middle" fill="${fg}">${letter}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
