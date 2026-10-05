import { useState } from 'react'
import { cn } from '../lib/cn'
import { countryName, flagEmoji } from '../lib/country'
import type { Country } from '../services/radioApi'
import { Dialog } from './Dialog'
import { Icon } from './icons'

type Props = {
  open: boolean
  countries: Country[]
  selectedCode: string
  onSelect: (code: string) => void
  onClose: () => void
}

export function CountryPicker({ open, countries, selectedCode, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const results = countries
    .map(c => ({ ...c, label: countryName(c.code, c.name) }))
    .filter(c => !q || c.label.toLowerCase().includes(q) || c.code.toLowerCase() === q)
    .sort((a, b) => (q ? a.label.localeCompare(b.label) : b.stationcount - a.stationcount))

  const pick = (code: string) => { onSelect(code); setQuery(''); onClose() }

  return (
    <Dialog open={open} onClose={onClose} title="Choose a country">
      <form onSubmit={e => { e.preventDefault(); if (results[0]) pick(results[0].code) }} className="sticky top-0 z-10 -mx-5 bg-surface-raised px-5 pb-3">
        <label className="flex items-center gap-2 rounded-full border border-border bg-surface-muted px-4">
          <Icon name="search" size={18} className="text-foreground-muted" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search countries"
            aria-label="Search countries"
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-foreground-muted"
          />
        </label>
        {!q && <p className="px-2 pt-3 text-xs font-semibold uppercase tracking-widest text-foreground-muted">Most stations</p>}
      </form>

      {countries.length === 0 && <p className="py-8 text-center text-sm text-foreground-muted">Country list unavailable. Check your connection.</p>}
      {countries.length > 0 && results.length === 0 && <p className="py-8 text-center text-sm text-foreground-muted">No countries match “{query}”.</p>}

      <ul>
        {results.map(c => (
          <li key={c.code}>
            <button
              type="button"
              onClick={() => pick(c.code)}
              className={cn('flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-muted', c.code === selectedCode && 'bg-selected')}
            >
              <span className="text-2xl" aria-hidden="true">{flagEmoji(c.code)}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{c.label}</span>
              <span className="text-xs tabular-nums text-foreground-muted">{c.stationcount}</span>
              {c.code === selectedCode && <Icon name="check" size={18} className="text-accent" />}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
