import { useState } from 'react'
import { cn } from '../lib/cn'
import { flagEmoji } from '../lib/country'
import type { Playlist } from '../hooks/useLibrary'
import type { RadioStation } from '../services/radioApi'
import type { ThemeMode } from '../theme'
import type { PlayerState } from './AudioPlayer'
import { EqBars } from './EqBars'
import { Icon } from './icons'
import { StationArt } from './StationArt'

type Props = {
  country: { code: string; name: string }
  stations: RadioStation[]
  status: 'loading' | 'ready' | 'error'
  onRetry: () => void
  theme: ThemeMode
  currentId?: string
  playerState: PlayerState
  onPlay: (station: RadioStation, queue: RadioStation[]) => void
  favorites: RadioStation[]
  favoriteIds: Set<string>
  onToggleFavorite: (station: RadioStation) => void
  recents: RadioStation[]
  playlists: Playlist[]
  signedIn: boolean
  onRequestSignIn: () => void
  onManagePlaylists: () => void
  /** Fired when a tab is tapped (lets the phone sheet expand). */
  onTabChange?: () => void
}

const FILTER_MIN = 8
const SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g']

export function StationList(props: Props) {
  const { country, stations, status, onRetry, theme, currentId, playerState, onPlay, favorites, favoriteIds, onToggleFavorite, recents, playlists, signedIn, onRequestSignIn, onManagePlaylists, onTabChange } = props
  const [requestedTab, setTab] = useState('all')
  const [filter, setFilter] = useState('')

  // counts make what's inside each tab visible without opening it
  const tabs = [
    { id: 'all', label: 'Stations', count: 0 },
    { id: 'favs', label: 'Saved', count: favorites.length },
    { id: 'recent', label: 'Recent', count: recents.length },
    ...playlists.map(p => ({ id: p.id, label: p.name, count: p.stations.length })),
  ]
  const tab = tabs.some(t => t.id === requestedTab) ? requestedTab : 'all'

  const source = tab === 'all' ? stations : tab === 'favs' ? favorites : tab === 'recent' ? recents : (playlists.find(p => p.id === tab)?.stations ?? [])
  const query = filter.trim().toLowerCase()
  const visible = query ? source.filter(s => `${s.name} ${s.tags}`.toLowerCase().includes(query)) : source
  const loading = tab === 'all' && status === 'loading'

  const emptyMessage = () => {
    if (tab === 'all') return status === 'error' ? null : 'No stations found for this country.'
    if (query) return 'No matches.'
    if (tab === 'favs') return signedIn ? 'Tap the heart on a station to save it here.' : null
    if (tab === 'recent') return 'Stations you play will show up here.'
    return 'This playlist is empty. Use the + button in the player to add stations.'
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-baseline justify-between gap-3 px-4 pb-2 md:px-5 md:pt-4">
        <h1 className="truncate text-xl font-bold tracking-tight">
          <span aria-hidden="true">{flagEmoji(country.code)}</span> {country.name}
        </h1>
        <span className="shrink-0 text-xs tabular-nums text-foreground-muted">
          {loading ? 'Loading…' : `${visible.length} ${visible.length === 1 ? 'station' : 'stations'}`}
        </span>
      </div>

      <div className="scrollbar-hide flex shrink-0 items-center gap-2 overflow-x-auto px-4 pb-3 md:px-5" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => { setTab(t.id); setFilter(''); onTabChange?.() }}
            className={cn(
              'h-9 max-w-40 shrink-0 cursor-pointer truncate rounded-full px-4 text-[0.82rem] font-semibold transition-colors',
              tab === t.id ? 'bg-foreground text-surface' : 'bg-surface-muted text-foreground-muted hover:text-foreground',
            )}
          >
            {t.label}
            {t.count > 0 && <span className="ml-1.5 text-xs tabular-nums opacity-60">{t.count}</span>}
          </button>
        ))}
        {signedIn && (
          <button
            type="button"
            onClick={onManagePlaylists}
            aria-label="Playlists"
            title="Playlists"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-muted text-foreground hover:bg-border"
          >
            <Icon name="plus" size={18} />
          </button>
        )}
      </div>

      {source.length >= FILTER_MIN && (
        <label className="mx-4 mb-2 flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface-muted px-4 md:mx-5">
          <Icon name="search" size={16} className="text-foreground-muted" />
          <input
            type="search"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by name or genre"
            aria-label="Filter stations"
            className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-foreground-muted md:text-sm"
          />
        </label>
      )}

      <ul className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
        {loading && SKELETON_KEYS.map(key => (
          <li key={key} className="flex items-center gap-3 px-4 py-3 md:px-5">
            <div className="size-11 animate-pulse rounded-lg bg-surface-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-surface-muted" />
            </div>
          </li>
        ))}

        {!loading && tab === 'all' && status === 'error' && (
          <li className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-foreground-muted">
            Couldn't reach the radio directory.
            <button type="button" onClick={onRetry} className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 font-semibold text-surface">
              <Icon name="retry" size={16} /> Try again
            </button>
          </li>
        )}

        {!loading && tab === 'favs' && !signedIn && (
          <li className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-foreground-muted">
            Sign in to save your favorite stations.
            <button type="button" onClick={onRequestSignIn} className="h-10 cursor-pointer rounded-full bg-foreground px-5 font-semibold text-surface">
              Sign in
            </button>
          </li>
        )}

        {!loading && visible.length === 0 && emptyMessage() && (
          <li className="px-6 py-10 text-center text-sm text-foreground-muted">{emptyMessage()}</li>
        )}

        {!loading && visible.map(station => {
          const current = station.stationuuid === currentId
          const isFavorite = favoriteIds.has(station.stationuuid)
          const meta = [station.codec || 'LIVE', station.bitrate ? `${station.bitrate}k` : null, station.tags.split(',')[0]?.trim() || null].filter(Boolean).join(' · ')
          return (
            <li key={station.stationuuid} className={cn('flex items-center border-b border-border/60 pr-2 md:pr-3', current && 'bg-selected')}>
              <button
                type="button"
                onClick={() => onPlay(station, visible)}
                className="flex min-h-[60px] min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 pl-4 text-left md:pl-5"
              >
                <StationArt station={station} theme={theme} className="size-11 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[0.92rem] font-semibold', station.lastcheckok === 0 && 'text-foreground-muted line-through')}>{station.name}</span>
                  <span className="block truncate text-xs text-foreground-muted">{meta}</span>
                </span>
                {current && (playerState === 'connecting'
                  ? <span role="status" aria-label="Connecting" className="mr-1 size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  : <EqBars playing={playerState === 'playing'} className="mr-1" />)}
              </button>
              <button
                type="button"
                onClick={() => (signedIn ? onToggleFavorite(station) : onRequestSignIn())}
                aria-label={isFavorite ? `Remove ${station.name} from saved` : `Save ${station.name}`}
                aria-pressed={isFavorite}
                className={cn('flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform active:scale-90', isFavorite ? 'text-heart' : 'text-foreground-muted hover:text-foreground')}
              >
                <Icon name="heart" size={20} filled={isFavorite} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
