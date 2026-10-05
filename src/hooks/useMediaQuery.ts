import { useEffect, useState, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    notify => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useIsDesktop = () => useMediaQuery('(min-width: 768px)')
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')

/** Height of the element's parent, tracked with a ResizeObserver */
export function useParentHeight<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const parent = el?.parentElement
    if (!parent) return
    const ro = new ResizeObserver(() => setHeight(parent.clientHeight))
    ro.observe(parent)
    setHeight(parent.clientHeight)
    return () => ro.disconnect()
  }, [el])
  return [setEl, height] as const
}
