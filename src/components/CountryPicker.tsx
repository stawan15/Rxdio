import { useState } from 'react'
import { cn } from '../lib/cn'
import { countryName, flagEmoji, isExactCountryMatch, localCountryName, matchesCountry } from '../lib/country'
import type { Country } from '../services/radioApi'
import { Dialog } from './Dialog'
import { Icon } from './icons'

const POPULAR = 8

type Props = {
  open: boolean
  countries: Country[]
  selectedCode: string
  onSelect: (code: string) => void
  onClose: () => void
}

export function CountryPicker({ open, countries, selectedCode, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim()

  const results = countries
    .map(c => ({ ...c, label: countryName(c.code, c.name) }))
    .filter(c => matchesCountry(c.code, c.label, q))

  // Without a query, offer a short "popular" chunk first, then everything A–Z, instead of one long list
  const byName = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label)
  const popular = q ? [] : results.slice(0, POPULAR)
  const rest = [...(q ? results : results.slice(POPULAR))].sort((a, b) => Number(isExactCountryMatch(b.code, q)) - Number(isExactCountryMatch(a.code, q)) || byName(a, b))

  const pick = (code: string) => { onSelect(code); setQuery(''); onClose() }

  const row = (c: (typeof results)[number]) => {
    const local = localCountryName(c.code)
    return (
      <li key={c.code}>
        <button
          type="button"
          onClick={() => pick(c.code)}
          className={cn('flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-muted', c.code === selectedCode && 'bg-selected')}
        >
          <span className="text-2xl" aria-hidden="true">{flagEmoji(c.code)}</span>
          <span className="min-w-0 flex-1 truncate font-medium">
            {c.label}
            {local && local !== c.label && <span className="ml-2 text-sm font-normal text-foreground-muted">{local}</span>}
          </span>
          <span className="font-mono text-xs tabular-nums text-foreground-muted">{c.stationcount}</span>
          {c.code === selectedCode && <Icon name="check" size={18} className="text-accent" />}
        </button>
      </li>
    )
  }

  const heading = (text: string) => <h3 className="px-2 pb-1 pt-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.18em] text-foreground-muted">{text}</h3>

  return (
    <Dialog open={open} onClose={onClose} title="Choose a country">
      <form onSubmit={e => { e.preventDefault(); const first = popular[0] ?? rest[0]; if (first) pick((q ? rest[0] : first).code) }} className="sticky top-0 z-10 -mx-5 bg-surface-raised px-5 pb-1">
        <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-4">
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
      </form>

      {countries.length === 0 && <p className="py-8 text-center text-sm text-foreground-muted">Country list unavailable. Check your connection.</p>}
      {countries.length > 0 && results.length === 0 && <p className="py-8 text-center text-sm text-foreground-muted">No countries match “{query}”.</p>}

      {popular.length > 0 && <section>{heading('Popular')}<ul>{popular.map(row)}</ul></section>}
      {rest.length > 0 && <section>{!q && heading('All countries')}<ul>{rest.map(row)}</ul></section>}
    </Dialog>
  )
}
