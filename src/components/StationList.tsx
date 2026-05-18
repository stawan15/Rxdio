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

function promptNewPlaylist(createPlaylist: (name: string) => void) {
  const name = window.prompt('Enter playlist name:')
  if (name?.trim()) createPlaylist(name.trim())
}

export function StationList({
  stations, onSelect, loading, selectedStation, themeMode,
  favorites, toggleFavorite, recents, playlists, createPlaylist, onManagePlaylists,
}: Props) {
  const [activeTab, setActiveTab] = useState('all')
  const isPink = themeMode === 'pink'

  const displayStations: RadioStation[] =
    activeTab === 'all' ? stations
    : activeTab === 'favs' ? favorites
    : activeTab === 'recent' ? recents
    : playlists.find(p => p.id === activeTab)?.stations ?? []

  const tabs = ['all', 'favs', 'recent', ...playlists.map(p => p.id)] as const

  const tabLabel = (tab: string) => {
    if (tab === 'all') return 'Stations'
    if (tab === 'favs') return isPink ? '♡ Saved' : 'Saved'
    if (tab === 'recent') return 'Recent'
    return playlists.find(p => p.id === tab)?.name ?? tab
  }

  const addPlaylistBtn = (
    <button
      type="button"
      onClick={() => promptNewPlaylist(createPlaylist)}
      title="New playlist"
      aria-label="New playlist"
      className={cn(
        'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-lg font-bold transition-transform active:scale-95',
        isPink
          ? 'bunny-btn-primary shadow-[0_3px_12px_rgb(233_140_181/0.4)]'
          : 'border border-border bg-surface-muted text-foreground hover:bg-selected',
      )}
    >
      +
    </button>
  )

  return (
    <aside className="station-list relative z-10 flex h-full w-[340px] shrink-0 flex-col border-l border-border bg-surface max-md:h-[45%] max-md:w-full max-md:border-l-0 max-md:border-t">
      <header className={cn('px-4 pt-4 md:px-5 md:pt-5')}>
        <div className={cn('flex items-center gap-2', !isPink && 'border-b border-border')}>
          <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap">
            {tabs.map(tab => {
              const active = activeTab === tab
              if (isPink) {
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={active ? 'bunny-tab-active' : 'bunny-tab-idle'}
                  >
                    {tabLabel(tab)}
                  </button>
                )
              }
              return (
                <div
                  key={tab}
                  className={cn(
                    '-mb-px flex items-center border-b-2 pb-3.5 transition-colors',
                    active ? 'border-foreground' : 'border-transparent',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'cursor-pointer px-1 text-[0.78rem] font-medium uppercase tracking-widest',
                      active ? 'font-bold text-foreground' : 'text-foreground-muted',
                    )}
                  >
                    {tabLabel(tab)}
                  </button>
                </div>
              )
            })}
          </div>
          {addPlaylistBtn}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 pb-1">
          <p className={cn('text-[0.72rem] tabular-nums', isPink ? 'font-semibold text-accent' : 'tracking-wide text-foreground-muted')}>
            {activeTab === 'all'
              ? loading ? 'Scanning...' : isPink ? `♡ ${stations.length} stations` : `${stations.length} active`
              : displayStations.length > 0 ? `${displayStations.length} stations` : 'Empty playlist'}
          </p>
          {playlists.length > 0 && (
            <button
              type="button"
              onClick={onManagePlaylists}
              className="hidden cursor-pointer text-[0.72rem] font-semibold text-foreground-muted underline-offset-2 hover:text-accent hover:underline md:inline"
            >
              Manage
            </button>
          )}
        </div>
        {playlists.length > 0 && (
          <button
            type="button"
            onClick={onManagePlaylists}
            className="mb-1 cursor-pointer text-[0.7rem] font-semibold text-accent underline-offset-2 hover:underline md:hidden"
          >
            Manage playlists
          </button>
        )}
      </header>

      <ul className="scrollbar-hide flex-1 overflow-y-auto pb-3">
        {loading ? (
          <li className="px-6 py-10 text-[0.8rem] text-foreground-muted">{isPink ? 'Loading...' : 'Loading...'}</li>
        ) : displayStations.length === 0 ? (
          <li className="px-6 py-10 text-center text-[0.8rem] text-foreground-muted">
            {activeTab === 'favs' ? (isPink ? 'Tap ♡ to save a station!' : 'Star a station to save it.') : 'No stations found.'}
          </li>
        ) : (
          displayStations.map((station, i) => {
            const selected = selectedStation?.stationuuid === station.stationuuid
            const isFav = favorites.some(s => s.stationuuid === station.stationuuid)
            const offline = station.lastcheckok === 0
            const img = station.favicon?.startsWith('http') ? station.favicon : avatarUrl(themeMode, station.name)

            return (
              <li key={station.stationuuid} className={isPink ? 'px-1' : undefined}>
                <button
                  type="button"
                  onClick={() => onSelect(station)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3.5 text-left transition-all',
                    isPink
                      ? cn('bunny-station-row px-4 py-3', selected && 'is-selected')
                      : cn('border-b border-border px-6 py-3.5', selected ? 'bg-selected' : 'hover:bg-surface-muted'),
                  )}
                >
                  <span className={cn(
                    'shrink-0 text-right text-[0.7rem] tabular-nums',
                    isPink ? 'font-bold text-accent' : 'w-[18px] text-foreground-muted',
                  )}>
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                  <img
                    src={img}
                    alt=""
                    className={cn('size-10 shrink-0 object-contain', isPink ? 'bunny-avatar' : 'size-9 rounded-md bg-surface-muted')}
                    onError={e => { e.currentTarget.src = avatarUrl(themeMode, station.name) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'truncate text-[0.88rem]',
                        isPink ? 'font-bold' : 'font-medium',
                        offline ? 'text-foreground-muted line-through' : 'text-foreground',
                      )}>
                        {station.name}
                      </span>
                      {offline && (
                        <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[0.55rem] font-bold text-red-500">
                          OFFLINE
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[0.7rem] text-foreground-muted tabular-nums">
                      {station.codec || 'LIVE'} · {station.bitrate ? `${station.bitrate}k` : '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleFavorite(station) }}
                    className={cn(
                      'relative z-20 shrink-0 cursor-pointer p-1.5 text-lg leading-none transition-transform hover:scale-110',
                      isFav ? 'text-heart opacity-100' : 'text-foreground-muted opacity-50',
                    )}
                  >
                    {isFav ? '♥' : '♡'}
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
