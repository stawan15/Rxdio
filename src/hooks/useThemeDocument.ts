import { useEffect } from 'react'
import type { ThemeMode } from '../theme'

export function useThemeDocument(themeMode: ThemeMode) {
  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])
}
