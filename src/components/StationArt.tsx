import { useState } from 'react'
import { avatarUrl, type ThemeMode } from '../theme'
import type { RadioStation } from '../services/radioApi'
import { cn } from '../lib/cn'

type Props = { station: RadioStation; theme: ThemeMode; className?: string }

const usable = (favicon?: string) => (favicon?.startsWith('https://') ? favicon : null)

/** Station logo; falls back to a letter avatar when missing, http-only, or broken. */
export function StationArt({ station, theme, className }: Props) {
  const [failed, setFailed] = useState<string | null>(null)
  const src = usable(station.favicon)
  const showLogo = src !== null && failed !== src
  return (
    <img
      src={showLogo ? src : avatarUrl(theme, station.name)}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(src)}
      className={cn('shrink-0 bg-surface-muted object-contain', className)}
    />
  )
}
