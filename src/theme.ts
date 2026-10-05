export type ThemeMode = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'rxdio_theme'

export const THEMES: { mode: ThemeMode; label: string }[] = [
  { mode: 'dark', label: 'Night' },
  { mode: 'light', label: 'Mint' },
]

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light'
}

/*
 * The palette is five colours: #17252A ink, #2B7A78 deep teal, #3AAFA9 teal, #DEF2F1 mint, #FEFFFF white.
 * Everything else is a mix of those. Keep `--c-*` in index.css in sync.
 */

/** Browser/PWA chrome color — matches `--c-surface` in index.css */
export const THEME_COLOR: Record<ThemeMode, string> = { dark: '#17252A', light: '#DEF2F1' }

/** Three.js / canvas — accent hex per mode (matches `--c-accent`) */
export function accentHex(mode: ThemeMode): string {
  return mode === 'dark' ? '#3AAFA9' : '#2B7A78'
}

/** [surface, accent] pairs for the theme swatches in the menu */
export const THEME_SWATCH: Record<ThemeMode, [string, string]> = {
  dark: ['#17252A', '#3AAFA9'],
  light: ['#DEF2F1', '#2B7A78'],
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
    ocean: '#0f1a1e',
    tones: ['#1b5352', '#226664', '#2B7A78', '#329692'],
    border: '#17252A',
    selected: '#3AAFA9',
    outline: '#FEFFFF',
    hover: '#DEF2F1',
    rim: '#2B7A78',
    pin: '#FEFFFF',
    night: 0.6,
  },
  light: {
    ocean: '#FEFFFF',
    tones: ['#bfe5e2', '#a6dbd8', '#88cfcb', '#6bc3be'],
    border: '#FEFFFF',
    selected: '#2B7A78',
    outline: '#17252A',
    hover: '#17252A',
    rim: '#17252A',
    pin: '#17252A',
    night: 0.86,
  },
}

const AVATAR_COLORS: Record<ThemeMode, [bg: string, fg: string]> = {
  dark: ['#243a41', '#DEF2F1'],
  light: ['#CBE7E5', '#17252A'],
}

/** Offline-safe letter avatar for stations without a usable favicon */
export function avatarUrl(mode: ThemeMode, name: string) {
  const [bg, fg] = AVATAR_COLORS[mode]
  const letter = (name.trim().charAt(0) || '·').toUpperCase().replace(/[<>&]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/><text x="32" y="42" font-family="ui-monospace,Menlo,monospace" font-size="28" font-weight="600" text-anchor="middle" fill="${fg}">${letter}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
