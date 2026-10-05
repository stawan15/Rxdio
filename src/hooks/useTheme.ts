import { useEffect, useState } from 'react'
import { isThemeMode, THEME_COLOR, THEME_STORAGE_KEY, type ThemeMode } from '../theme'
import { writeStorage } from '../lib/storage'

function initialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeMode(saved)) return saved
  } catch { /* storage unavailable */ }
  return 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
    writeStorage(THEME_STORAGE_KEY, theme)
  }, [theme])

  return [theme, setTheme] as const
}
