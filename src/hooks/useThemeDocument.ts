import { useEffect } from 'react'
import { FAVICON, type ThemeMode } from '../theme'

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = href
}

export function useThemeDocument(themeMode: ThemeMode) {
  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
    setFavicon(FAVICON[themeMode])
  }, [themeMode])
}
