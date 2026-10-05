import type { ReactNode } from 'react'

const ICONS = {
  search: <><circle cx="11" cy="11" r="7.5" /><path d="m21 21-4.3-4.3" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  play: <path d="M7 4.5v15l12-7.5z" />,
  pause: <path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z" />,
  next: <path d="M6 5v14l9-7zM17 5h2v14h-2z" />,
  prev: <path d="M18 5v14l-9-7zM5 5h2v14H5z" />,
  heart: <path d="M12 20.5s-8-4.7-8-10.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8 2.5c0 5.9-8 10.6-8 10.6z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  shuffle: <path d="M3 7h3.5c5 0 5 10 10 10H21m0 0-3-3m3 3-3 3M3 17h3.5c1.6 0 2.7-.7 3.6-1.8M21 7h-4.5c-1.6 0-2.7.7-3.6 1.8M21 7l-3-3m3 3-3 3" />,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2.5h5" /></>,
  volume: <path d="M4 9.5v5h3.5l5 4v-13l-5 4zM16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  download: <path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 20h16" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />,
  spark: <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  logout: <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />,
  retry: <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></>,
  wifiOff: <path d="M3 3l18 18M5 12.5a10 10 0 0 1 3.6-2M10 6.2A14 14 0 0 1 22 9.5M8.5 16a5 5 0 0 1 5.4-1M12 20h.01" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICONS

const FILLED = new Set<IconName>(['play', 'pause', 'next', 'prev'])

type IconProps = { name: IconName; size?: number; className?: string; filled?: boolean }

export function Icon({ name, size = 20, className, filled = FILLED.has(name) }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled && FILLED.has(name) ? 1.5 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICONS[name]}
    </svg>
  )
}
