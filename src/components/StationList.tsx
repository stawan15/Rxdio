import { useState } from 'react'
import { RadioStation } from '../services/radioApi'
import { avatarUrl, type ThemeMode } from '../theme'
import { cn } from '../lib/cn'
import type { Playlist } from '../App'

type Props = {
  stations: RadioStation[]
  onSelect: (s: RadioStation) => void
  loading: boolean
  selectedStation: RadioStation | null
  themeMode: ThemeMode
  favorites: RadioStation[]
  toggleFavorite: (s: RadioStation) => void | Promise<void>
  recents: RadioStation[]
  playlists: Playlist[]
  createPlaylist: (name: string) => void
  onManagePlaylists?: () => void
}

export function StationList({
  stations, onSelect, loading, selectedStation, themeMode,
  favorites, toggleFavorite, recents, playlists, createPlaylist, onManagePlaylists,
}: Props) {
  const [activeTab, setActiveTab] = useState('all')

  const displayStations: RadioStation[] =
    activeTab === 'all' ? stations
    : activeTab === 'favs' ? favorites
    : activeTab === 'recent' ? recents
    : playlists.find(p => p.id === activeTab)?.stations ?? []

  const tabs = ['all', 'favs', 'recent', ...playlists.map(p => p.id)] as const

  return (
    <aside className="station-list relative z-10 flex h-full w-[340px] shrink-0 flex-col border-l border-border bg-surface max-md:h-[45%] max-md:w-full max-md:border-l-0 max-md:border-t">
      <header className="px-6 pt-6">
        <div className="flex items-center border-b border-border">
          <div className="scrollbar-hide flex flex-1 gap-5 overflow-x-auto whitespace-nowrap">
            {tabs.map(tab => {
              const isPl = tab !== 'all' && tab !== 'favs' && tab !== 'recent'
              const plData = isPl ? playlists.find(p => p.id === tab) : null
              const active = activeTab === tab
              return (
                <div
                  key={tab}
                  className={cn(
                    '-mb-px flex items-center gap-2 border-b-2 pb-3.5 transition-colors',
                    active ? 'border-foreground' : 'border-transparent',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'cursor-pointer text-[0.78rem] font-medium uppercase tracking-widest transition-colors',
                      active ? 'font-bold text-foreground' : 'text-foreground-muted',
                    )}
                  >
                    {tab === 'all' ? 'Stations' : tab === 'favs' ? 'Saved' : tab === 'recent' ? 'Recent' : plData?.name}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex shrink-0 items-center gap-3 border-b border-transparent pb-3.5 pl-4">
            {playlists.length > 0 && (
              <button
                type="button"
                onClick={onManagePlaylists}
                className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-[0.8rem] font-semibold text-foreground transition-colors hover:opacity-80"
              >
                MANAGE
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const name = window.prompt('Enter playlist name:')
                if (name?.trim()) createPlaylist(name.trim())
              }}
              className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-xl font-bold text-foreground opacity-80 transition-opacity hover:opacity-100"
            >
              +
            </button>
          </div>
        </div>

        <p className="py-3 text-[0.72rem] tracking-wide text-foreground-muted tabular-nums">
          {activeTab === 'all'
            ? loading ? 'Scanning...' : `${stations.length} active`
            : displayStations.length > 0 ? `${displayStations.length} stations` : 'Empty playlist'}
        </p>
      </header>

      <ul className="scrollbar-hide flex-1 overflow-y-auto">
        {loading ? (
          <li className="px-6 py-10 text-[0.8rem] tracking-wide text-foreground-muted">Loading...</li>
        ) : displayStations.length === 0 ? (
          <li className="px-6 py-10 text-[0.8rem] text-foreground-muted">
            {activeTab === 'favs' ? 'Star a station to save it.' : 'No stations found.'}
          </li>
        ) : (
          displayStations.map((station, i) => {
            const selected = selectedStation?.stationuuid === station.stationuuid
            const isFav = favorites.some(s => s.stationuuid === station.stationuuid)
            const offline = station.lastcheckok === 0
            const img = station.favicon?.startsWith('http') ? station.favicon : avatarUrl(themeMode, station.name)

            return (
              <li key={station.stationuuid}>
                <button
                  type="button"
                  onClick={() => onSelect(station)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3.5 border-b border-border px-6 py-3.5 text-left transition-colors',
                    selected ? 'bg-selected' : 'bg-transparent hover:bg-surface-muted',
                  )}
                >
                  <span className="w-[18px] shrink-0 text-right text-[0.7rem] tabular-nums text-foreground-muted">
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                  <img
                    src={img}
                    alt=""
                    className="size-9 shrink-0 rounded-md bg-surface-muted object-contain"
                    onError={e => { e.currentTarget.src = avatarUrl(themeMode, station.name) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'truncate text-[0.88rem] font-medium',
                        offline ? 'text-foreground-muted line-through' : 'text-foreground',
                      )}>
                        {station.name}
                      </span>
                      {offline && (
                        <span className="shrink-0 rounded bg-red-500/10 px-1 py-0.5 text-[0.55rem] font-bold tracking-wide text-red-500">
                          OFFLINE
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[0.7rem] tracking-wide text-foreground-muted tabular-nums">
                      {station.codec || 'LIVE'} · {station.bitrate ? `${station.bitrate}k` : '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleFavorite(station) }}
                    className={cn(
                      'relative z-20 shrink-0 cursor-pointer p-1.5 text-base leading-none transition-colors',
                      isFav ? 'text-amber-500 opacity-100' : 'text-foreground-muted opacity-60 hover:opacity-100',
                    )}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                </button>
              </li>
            )
          })
        )}
      </ul>
    </aside>
  )
}
