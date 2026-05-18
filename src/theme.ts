/** Esther Bunny Ribbon Bunny — soft dusty blush pink palette */
export const ribbonBunny = {
  bg: '#FBF2F4',
  headerBg: '#FDF6F8',
  text: '#4A3540',
  muted: '#9A7886',
  border: '#E5CCD6',
  inputBg: '#F8EBEF',
  panelBg: 'rgba(253, 246, 248, 0.92)',
  selectedBg: '#F3D9E2',
  accent: '#D488A8',
  subtle: '#F5E4EA',
  avatarBg: 'E8B4C4',
  glow: 'rgba(212, 136, 168, 0.18)',
  light: '#F0C4D4',
} as const

export type ThemeMode = 'dark' | 'light' | 'pink'

export interface AppTheme {
  bg: string
  headerBg: string
  text: string
  muted: string
  border: string
  inputBg: string
  panelBg: string
  selectedBg: string
  accent: string
  subtle: string
  isDark: boolean
  isPink: boolean
}

export function getTheme(mode: ThemeMode): AppTheme {
  if (mode === 'dark') {
    return {
      bg: '#000',
      headerBg: '#000',
      text: '#fff',
      muted: '#444',
      border: '#1a1a1a',
      inputBg: '#111',
      panelBg: 'rgba(0,0,0,0.85)',
      selectedBg: '#111',
      accent: '#00ff88',
      subtle: '#111',
      isDark: true,
      isPink: false,
    }
  }
  if (mode === 'pink') {
    return {
      bg: ribbonBunny.bg,
      headerBg: ribbonBunny.headerBg,
      text: ribbonBunny.text,
      muted: ribbonBunny.muted,
      border: ribbonBunny.border,
      inputBg: ribbonBunny.inputBg,
      panelBg: ribbonBunny.panelBg,
      selectedBg: ribbonBunny.selectedBg,
      accent: ribbonBunny.accent,
      subtle: ribbonBunny.subtle,
      isDark: false,
      isPink: true,
    }
  }
  return {
    bg: '#faf9f7',
    headerBg: '#faf9f7',
    text: '#1a1a1a',
    muted: '#9a9590',
    border: '#e8e5e0',
    inputBg: '#f3f1ee',
    panelBg: 'rgba(255,255,255,0.92)',
    selectedBg: '#efecea',
    accent: '#2f6fdb',
    subtle: '#f3f1ee',
    isDark: false,
    isPink: false,
  }
}
