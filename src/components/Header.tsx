import type { ReactNode } from 'react'
import { flagEmoji } from '../lib/country'
import { Icon } from './icons'

type Props = {
  country: { code: string; name: string }
  onOpenPicker: () => void
  onShuffle: () => void
  shuffling: boolean
  menu: ReactNode
}

export function Header({ country, onOpenPicker, onShuffle, shuffling, menu }: Props) {
  return (
    <header className="z-30 flex h-[calc(60px+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b border-border bg-surface-raised/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:gap-3 md:px-6">
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-sm font-bold tracking-tight text-accent-fg shadow-sm">Rx</div>
        <span className="hidden text-base font-bold tracking-tight md:inline">Rxdio</span>
      </div>

      <button
        type="button"
        onClick={onOpenPicker}
        aria-label="Choose a country"
        className="flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-muted px-4 text-left transition-colors hover:border-foreground/30 md:max-w-sm md:flex-none md:basis-80"
      >
        <Icon name="search" size={16} className="shrink-0 text-foreground-muted" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          <span aria-hidden="true">{flagEmoji(country.code)}</span> {country.name}
        </span>
        <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[0.65rem] font-semibold text-foreground-muted md:inline">⌘K</kbd>
      </button>

      <div className="flex-1 max-md:hidden" />

      <button
        type="button"
        onClick={onShuffle}
        disabled={shuffling}
        aria-label="Play a random station"
        className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-3.5 text-sm font-bold text-accent-fg shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 md:px-5"
      >
        <Icon name="shuffle" size={20} className={shuffling ? 'animate-spin' : undefined} />
        <span className="hidden md:inline">Surprise me</span>
      </button>
      {menu}
    </header>
  )
}

