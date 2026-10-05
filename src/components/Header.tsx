import type { ReactNode } from 'react'
import { flagEmoji } from '../lib/country'
import { centroidOf } from '../lib/centroids'
import { Icon } from './icons'

type Props = {
  country: { code: string; name: string }
  onOpenPicker: () => void
  onShuffle: () => void
  shuffling: boolean
  /** Shown to guests on desktop; phones use the heart/menu prompts */
  onSignIn?: () => void
  menu: ReactNode
}

/** A tuning scale along the header edge; the needle sits at the selected country's longitude. */
function DialRule({ code }: { code: string }) {
  const lon = centroidOf(code)?.[1]
  return (
    <div aria-hidden="true" className="dial-rule pointer-events-none absolute inset-x-0 bottom-0 h-2 opacity-50">
      {lon !== undefined && (
        <span
          className="absolute bottom-0 h-2 w-0.5 -translate-x-1/2 bg-accent opacity-100"
          style={{ left: `${((lon + 180) / 360) * 100}%`, transition: 'left 0.9s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      )}
    </div>
  )
}

export function Header({ country, onOpenPicker, onShuffle, shuffling, onSignIn, menu }: Props) {
  return (
    <header className="relative z-30 flex h-[calc(60px+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b border-border bg-surface px-3 pt-[env(safe-area-inset-top)] md:gap-3 md:px-6">
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-accent font-mono text-sm font-semibold text-accent-fg">Rx</div>
        <span className="hidden font-mono text-sm font-medium uppercase tracking-[0.22em] md:inline">Rxdio</span>
      </div>

      <button
        type="button"
        onClick={onOpenPicker}
        aria-label="Choose a country"
        className="flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-surface-raised px-3.5 text-left transition-colors hover:border-foreground-muted md:max-w-sm md:flex-none md:basis-80"
      >
        <Icon name="search" size={16} className="shrink-0 text-foreground-muted" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          <span aria-hidden="true">{flagEmoji(country.code)}</span> {country.name}
        </span>
        <kbd className="hidden rounded-sm border border-border px-1.5 py-0.5 font-mono text-[0.65rem] text-foreground-muted md:inline">⌘K</kbd>
      </button>

      <div className="flex-1 max-md:hidden" />

      <button
        type="button"
        onClick={onShuffle}
        disabled={shuffling}
        aria-label="Play a random station"
        className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-5 font-mono text-xs font-semibold uppercase tracking-wider text-accent-fg transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-60 max-md:hidden"
      >
        <Icon name="scan" size={18} className={shuffling ? 'animate-spin' : undefined} />
        Scan
      </button>
      {onSignIn && (
        <button type="button" onClick={onSignIn} className="hidden h-11 shrink-0 cursor-pointer items-center rounded-lg border border-border px-5 text-sm font-medium transition-colors hover:border-foreground-muted md:flex">
          Sign in
        </button>
      )}
      {menu}
      <DialRule code={country.code} />
    </header>
  )
}
