import { useEffect, useState } from 'react'
import { cn } from '../lib/cn'
import { THEMES, type ThemeMode } from '../theme'
import { Icon, type IconName } from './icons'
import { IconButton } from './IconButton'

const THEME_ICON: Record<ThemeMode, IconName> = { dark: 'moon', light: 'sun', pink: 'spark' }

type Props = {
  theme: ThemeMode
  onTheme: (mode: ThemeMode) => void
  email?: string
  onSignIn: () => void
  onSignOut: () => void
  onPlaylists: () => void
  canInstall: boolean
  onInstall: () => void
  showIosHint: boolean
}

export function AppMenu({ theme, onTheme, email, onSignIn, onSignOut, onPlaylists, canInstall, onInstall, showIosHint }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const item = (icon: IconName, label: string, action: () => void, tone?: 'danger') => (
    <button
      type="button"
      onClick={() => { setOpen(false); action() }}
      className={cn('flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-medium hover:bg-surface-muted', tone === 'danger' && 'text-red-500 hover:bg-red-500/10')}
    >
      <Icon name={icon} size={20} /> {label}
    </button>
  )

  return (
    <div className="relative">
      {email ? (
        <button
          type="button"
          aria-label="Account menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-accent text-sm font-bold uppercase text-accent-fg transition-all active:scale-95"
        >
          {email[0]}
        </button>
      ) : (
        <IconButton icon="menu" label="Menu" onClick={() => setOpen(v => !v)} aria-expanded={open} />
      )}
      {open && (
        <>
          <button type="button" aria-label="Close menu" tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 animate-fade-in rounded-2xl border border-border bg-surface-raised p-2 shadow-dropdown">
            <fieldset className="m-0 grid grid-cols-3 gap-1 rounded-xl border-0 bg-surface-muted p-1">
              <legend className="sr-only">Theme</legend>
              {THEMES.map(t => (
                <button
                  key={t.mode}
                  type="button"
                  aria-pressed={theme === t.mode}
                  onClick={() => onTheme(t.mode)}
                  className={cn('flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors', theme === t.mode ? 'bg-surface-raised text-foreground shadow-sm' : 'text-foreground-muted')}
                >
                  <Icon name={THEME_ICON[t.mode]} size={16} /> {t.label}
                </button>
              ))}
            </fieldset>
            <div className="mt-2">
              {email && <p className="truncate px-3 pb-1 pt-2 text-xs text-foreground-muted">{email}</p>}
              {email && item('list', 'Playlists', onPlaylists)}
              {canInstall && item('download', 'Install app', onInstall)}
              {showIosHint && <p className="px-3 py-2 text-xs text-foreground-muted">Install: tap Share, then “Add to Home Screen”.</p>}
              {email ? item('logout', 'Sign out', onSignOut, 'danger') : item('user', 'Sign in', onSignIn)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
