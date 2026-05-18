/** Esther Bunny Ribbon Bunny — official promo palette */
export const bunny = {
  bg: '#F8C8D3',
  pink: '#E98CB5',
  light: '#FEE6EB',
  dark: '#000000',
  white: '#FFFFFF',
} as const

export const FAVICON = {
  dark: 'https://ui-avatars.com/api/?name=Rx&background=000000&color=ffffff&bold=true',
  light: 'https://ui-avatars.com/api/?name=Rx&background=faf9f7&color=1a1a1a&bold=true',
  pink: `https://ui-avatars.com/api/?name=Rx&background=${bunny.pink.replace('#', '')}&color=ffffff&bold=true`,
} as const

export type ThemeMode = 'dark' | 'light' | 'pink'

export const THEME_STORAGE_KEY = 'rxdio_theme'

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'pink'
}

/** Three.js / canvas — accent hex per mode */
export function accentHex(mode: ThemeMode): string {
  if (mode === 'dark') return '#00ff88'
  if (mode === 'pink') return bunny.pink
  return '#2f6fdb'
}

export function avatarParams(mode: ThemeMode, name: string) {
  const char = name.charAt(0).toUpperCase()
  if (mode === 'dark') {
    return { name: char, background: '111111', color: 'ffffff' }
  }
  if (mode === 'pink') {
    return { name: char, background: bunny.pink.replace('#', ''), color: bunny.dark.replace('#', '') }
  }
  return { name: char, background: 'f3f1ee', color: '1a1a1a' }
}

export function avatarUrl(mode: ThemeMode, name: string, format: 'svg' | 'png' = 'svg') {
  const p = avatarParams(mode, name)
  const q = new URLSearchParams({ ...p, bold: 'true', format })
  return `https://ui-avatars.com/api/?${q}`
}
