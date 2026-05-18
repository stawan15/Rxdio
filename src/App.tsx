import { useEffect, useState, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Globe } from './components/Globe'
import { radioApi, RadioStation } from './services/radioApi'
import { StationList } from './components/StationList'
import { AudioPlayer } from './components/AudioPlayer'
import { supabase } from './services/supabaseClient'
import { Auth } from './components/Auth'
import { Session } from '@supabase/supabase-js'
import { isThemeMode, THEME_STORAGE_KEY, type ThemeMode } from './theme'
import { useThemeDocument } from './hooks/useThemeDocument'
import { cn } from './lib/cn'
import { IconMenu, IconSearch } from './components/icons'

export interface Playlist {
  id: string
  name: string
  stations: RadioStation[]
}

const ASIA = new Set(['afghanistan', 'armenia', 'azerbaijan', 'bahrain', 'bangladesh', 'bhutan', 'brunei', 'cambodia', 'china', 'cyprus', 'georgia', 'india', 'indonesia', 'iran', 'iraq', 'israel', 'japan', 'jordan', 'kazakhstan', 'kuwait', 'kyrgyzstan', 'laos', 'lebanon', 'malaysia', 'maldives', 'mongolia', 'myanmar', 'nepal', 'north korea', 'oman', 'pakistan', 'palestine', 'philippines', 'qatar', 'saudi arabia', 'singapore', 'south korea', 'sri lanka', 'syria', 'taiwan', 'tajikistan', 'thailand', 'timor-leste', 'turkey', 'turkmenistan', 'united arab emirates', 'uzbekistan', 'vietnam', 'yemen'])
const EUROPE = new Set(['albania', 'andorra', 'austria', 'belarus', 'belgium', 'bosnia and herzegovina', 'bulgaria', 'croatia', 'czech republic', 'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary', 'iceland', 'ireland', 'italy', 'kosovo', 'latvia', 'liechtenstein', 'lithuania', 'luxembourg', 'malta', 'moldova', 'monaco', 'montenegro', 'netherlands', 'north macedonia', 'norway', 'poland', 'portugal', 'romania', 'russia', 'san marino', 'serbia', 'slovakia', 'slovenia', 'spain', 'sweden', 'switzerland', 'ukraine', 'united kingdom', 'vatican city'])

function getContinent(name: string) {
  const n = name.toLowerCase()
  if (ASIA.has(n)) return 'Asia'
  if (EUROPE.has(n)) return 'Europe'
  return 'Other'
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [stations, setStations] = useState<RadioStation[]>([])
  const [countries, setCountries] = useState<{ name: string; stationcount: number }[]>([])
  const [selectedCountry, setSelectedCountry] = useState('Thailand')
  const [loading, setLoading] = useState(false)
  const [isManagingPlaylists, setIsManagingPlaylists] = useState(false)
  const [selectedStation, setSelectedStation] = useState<RadioStation | null>(null)
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [favorites, setFavorites] = useState<RadioStation[]>([])
  const [recents, setRecents] = useState<RadioStation[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])

  useThemeDocument(themeMode)

  useEffect(() => {
    if (!session) return
    const fetchPlaylists = async () => {
      const { data: playlistsData, error: pError } = await supabase.from('playlists').select('*').eq('user_id', session.user.id)
      if (pError) { console.error('Failed to load playlists:', pError); return }

      const { data: stationsData, error: sError } = await supabase.from('playlist_stations').select('*').eq('user_id', session.user.id)
      if (sError) { console.error('Failed to load playlist_stations:', sError); return }

      const stGrouped: Record<string, string[]> = {}
      stationsData.forEach((row: { playlist_id: string; station_id: string }) => {
        if (!stGrouped[row.playlist_id]) stGrouped[row.playlist_id] = []
        stGrouped[row.playlist_id].push(row.station_id)
      })

      const uniqueUuids = Array.from(new Set(stationsData.map((row: { station_id: string }) => row.station_id)))
      const allStations = uniqueUuids.length > 0 ? await radioApi.getStationsByUuids(uniqueUuids) : []

      setPlaylists(playlistsData.map((pl: { id: string; name: string }) => {
        const uuids = stGrouped[pl.id] ?? []
        return { id: pl.id, name: pl.name, stations: allStations.filter(s => uuids.includes(s.stationuuid)) }
      }))
    }
    fetchPlaylists()
  }, [session])

  const createPlaylist = async (name: string) => {
    if (!session) return
    const tempId = `temp-${Date.now()}`
    setPlaylists(prev => [...prev, { id: tempId, name, stations: [] }])
    const { data, error } = await supabase.from('playlists').insert({ user_id: session.user.id, name }).select().single()
    if (error) {
      console.error('Failed to save playlist:', error)
      setPlaylists(prev => prev.filter(p => p.id !== tempId))
    } else {
      setPlaylists(prev => prev.map(p => p.id === tempId ? { ...p, id: data.id } : p))
    }
  }

  const toggleStationInPlaylist = async (playlistId: string, station: RadioStation) => {
    if (!session) return
    const pl = playlists.find(p => p.id === playlistId)
    if (!pl) return
    const exists = pl.stations.some(s => s.stationuuid === station.stationuuid)

    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p
      return exists
        ? { ...p, stations: p.stations.filter(s => s.stationuuid !== station.stationuuid) }
        : { ...p, stations: [...p.stations, station] }
    }))

    if (exists) {
      const { error } = await supabase.from('playlist_stations').delete()
        .eq('playlist_id', playlistId).eq('station_id', station.stationuuid).eq('user_id', session.user.id)
      if (error) console.error('Failed to remove station from playlist:', error)
    } else {
      const { error } = await supabase.from('playlist_stations').insert({
        playlist_id: playlistId, user_id: session.user.id, station_id: station.stationuuid,
      })
      if (error) console.error('Failed to add station to playlist:', error)
    }
  }

  const renamePlaylist = async (id: string, newName: string) => {
    if (!session) return
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p))
    const { error } = await supabase.from('playlists').update({ name: newName }).eq('id', id).eq('user_id', session.user.id)
    if (error) console.error('Failed to rename playlist', error)
  }

  const deletePlaylist = async (id: string) => {
    if (!session) return
    setPlaylists(prev => prev.filter(p => p.id !== id))
    const { error } = await supabase.from('playlists').delete().eq('id', id).eq('user_id', session.user.id)
    if (error) console.error('Failed to delete playlist', error)
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rxdio_recents')
      if (stored) setRecents(JSON.parse(stored))
    } catch (e) { console.error('Failed to load recents', e) }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setFavorites([])
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    const loadFavorites = async () => {
      const { data, error } = await supabase.from('favorites').select('station_id').eq('user_id', session.user.id)
      if (error) { console.error('Failed to load favorites:', error); return }
      if (!data?.length) { setFavorites([]); return }
      setFavorites(await radioApi.getStationsByUuids(data.map(r => r.station_id)))
    }
    loadFavorites()
  }, [session])

  const toggleFavorite = useCallback(async (station: RadioStation) => {
    if (!session) return
    const isFav = favorites.some(s => s.stationuuid === station.stationuuid)
    if (isFav) {
      setFavorites(prev => prev.filter(s => s.stationuuid !== station.stationuuid))
      supabase.from('favorites').delete().eq('user_id', session.user.id).eq('station_id', station.stationuuid)
        .then(({ error }) => { if (error) console.error('Failed to remove favorite:', error) })
    } else {
      setFavorites(prev => [...prev, station])
      supabase.from('favorites').insert({ user_id: session.user.id, station_id: station.stationuuid, station_name: station.name })
        .then(({ error }) => { if (error) console.error('Failed to add favorite:', error) })
    }
  }, [session, favorites])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsDropdownOpen(false)
      if (!(event.target as Element).closest('.nav-menu-container')) setIsNavMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    document.title = selectedStation ? `Rxdio - ${selectedStation.name}` : 'Rxdio'
    if (selectedStation) {
      setRecents(prev => {
        const updated = [selectedStation, ...prev.filter(s => s.stationuuid !== selectedStation.stationuuid)].slice(0, 20)
        try { localStorage.setItem('rxdio_recents', JSON.stringify(updated)) } catch { /* ignore */ }
        return updated
      })
    }
  }, [selectedStation])

  useEffect(() => { radioApi.getCountries().then(setCountries) }, [])

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeMode(saved)) setThemeMode(saved)
  }, [])

  useEffect(() => { localStorage.setItem(THEME_STORAGE_KEY, themeMode) }, [themeMode])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    radioApi.getStationsByCountry(selectedCountry).then(data => {
      setStations(data)
      setLoading(false)
    })
  }, [selectedCountry, session])

  const handleSurprise = async () => {
    setLoading(true)
    const s = await radioApi.getRandomStation()
    if (s) { setSelectedCountry(s.country); setSelectedStation(s) }
    setLoading(false)
  }

  const filteredCountries = countries
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const groupedCountries = {
    Asia: filteredCountries.filter(c => getContinent(c.name) === 'Asia'),
    Europe: filteredCountries.filter(c => getContinent(c.name) === 'Europe'),
    Other: filteredCountries.filter(c => getContinent(c.name) === 'Other'),
  }

  if (!session) return <Auth />

  const isPink = themeMode === 'pink'

  const themeBtn = (mode: ThemeMode, label: string) => (
    <button
      type="button"
      onClick={() => { setThemeMode(mode); setIsNavMenuOpen(false) }}
      className={cn(
        'w-full border-b border-border px-4 py-3 text-left text-[0.8rem] transition-colors hover:bg-surface-muted',
        themeMode === mode ? 'font-bold text-foreground' : 'font-medium text-foreground',
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="app-container fixed inset-0 flex flex-col overflow-hidden bg-surface pb-[calc(64px+env(safe-area-inset-bottom))] text-foreground">
      <header className={cn('bunny-header z-[100] flex h-[calc(56px+env(safe-area-inset-top))] shrink-0 items-center justify-between border-b border-border bg-surface-raised px-7 pt-[env(safe-area-inset-top)]')}>
        <div className="flex items-center gap-2.5">
          <div className={cn('flex size-8 items-center justify-center text-[0.72rem] font-bold tracking-tight', isPink ? 'bunny-logo' : 'rounded-md bg-foreground text-surface')}>Rx</div>
          <span className={cn('text-[0.95rem] font-semibold tracking-tight', isPink && 'bunny-brand')}>Rxdio</span>
          {isPink && <span className="text-lg" aria-hidden>🎀</span>}
        </div>

        <div className="flex items-center gap-2">
          <div className="search-bar relative hidden md:block" ref={searchRef}>
            <div className={cn('flex items-center gap-1.5 border border-border bg-surface-muted px-3.5 py-1.5 transition-colors', isPink ? 'rounded-2xl' : 'rounded-md')}>
              <IconSearch className="text-foreground-muted" size={12} />
              <input
                type="text"
                placeholder={selectedCountry}
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={e => { setSearchQuery(e.target.value); setIsDropdownOpen(true) }}
                className="w-[120px] border-none bg-transparent text-[0.8rem] text-foreground outline-none"
              />
            </div>
            {isDropdownOpen && (
              <div className={cn('absolute right-0 top-[calc(100%+6px)] z-[1000] max-h-[300px] w-[220px] overflow-y-auto border border-border bg-surface-raised shadow-dropdown', isPink ? 'bunny-dropdown' : 'rounded-[10px]')}>
                {filteredCountries.length === 0 ? (
                  <p className="p-4 text-center text-[0.8rem] text-foreground-muted">No results</p>
                ) : Object.entries(groupedCountries).map(([continent, items]) => {
                  if (!items.length) return null
                  return (
                    <div key={continent}>
                      <p className="px-3.5 pb-1 pt-2 text-[0.6rem] font-semibold uppercase tracking-widest text-foreground-muted">{continent}</p>
                      {items.map(c => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => { setSelectedCountry(c.name); setSearchQuery(''); setIsDropdownOpen(false) }}
                          className="flex w-full cursor-pointer items-center justify-between border-b border-border px-3.5 py-2 text-[0.82rem] transition-colors hover:bg-surface-muted"
                        >
                          <span>{c.name}</span>
                          <span className="text-[0.65rem] text-foreground-muted">{c.stationcount}</span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            className={cn('mobile-search-toggle flex cursor-pointer items-center justify-center border border-border p-1.5 text-foreground md:hidden', isPink ? 'bunny-btn-ghost' : 'rounded-md')}
            onClick={() => setIsMobileSearchOpen(true)}
          >
            <IconSearch size={14} />
          </button>

          <button
            type="button"
            onClick={handleSurprise}
            className={cn('cursor-pointer border-none px-3.5 py-1.5 text-[0.78rem] font-medium tracking-wide transition-opacity', isPink ? 'bunny-btn-primary' : 'rounded-md bg-foreground text-surface hover:opacity-75')}
          >
            {isPink ? '♡ Shuffle' : 'Shuffle'}
          </button>

          <div className="nav-menu-container relative">
            <button
              type="button"
              onClick={() => setIsNavMenuOpen(v => !v)}
              className={cn('flex cursor-pointer items-center justify-center border border-border p-1.5 text-foreground-muted transition-colors hover:border-foreground hover:text-foreground', isPink ? 'bunny-btn-ghost' : 'rounded-md')}
            >
              <IconMenu />
            </button>
            {isNavMenuOpen && (
              <div className={cn('absolute right-0 top-[calc(100%+6px)] z-[1000] w-44 overflow-hidden border border-border bg-surface-raised shadow-dropdown', isPink ? 'bunny-dropdown' : 'rounded-lg')}>
                {themeBtn('dark', 'Dark Mode')}
                {themeBtn('light', 'Light Mode')}
                {themeBtn('pink', 'Ribbon Bunny Mode')}
                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="w-full px-4 py-3 text-left text-[0.8rem] text-red-500 transition-colors hover:bg-red-500/10 data-[theme=pink]:hover:bg-surface-muted"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="main-content flex flex-1 overflow-hidden max-md:flex-col">
        <div className={cn('globe-container bunny-scene relative flex-1 max-md:h-[55%]', !isPink && 'bg-surface')}>
          <Canvas className="globe-canvas absolute inset-0" camera={{ position: [0, 0, 6], fov: 45 }}>
            <Globe onSelectCountry={setSelectedCountry} themeMode={themeMode} selectedStation={selectedStation} />
          </Canvas>

          {selectedStation && (
            <div className={cn('pointer-events-none absolute left-6 top-6 z-[5] flex max-w-[320px] flex-col gap-0.5 border border-border border-l-4 border-l-accent bg-surface-panel p-3.5 pl-[22px] shadow-panel backdrop-blur-md', isPink ? 'bunny-live-card' : 'rounded-2xl')}>
              <span className="mb-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-accent opacity-80">{isPink ? '♡ Now Playing' : '● Live Data'}</span>
              <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">{selectedStation.name}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-foreground-muted">
                {selectedStation.country} / {selectedStation.codec || 'MP3'}
              </p>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-9 left-9 z-[3]">
            <h1 className={cn('text-[clamp(2rem,4vw,3.5rem)] font-bold leading-none tracking-tight', isPink ? 'bunny-country-title' : 'text-foreground')}>{selectedCountry}</h1>
            {!loading && stations.length > 0 && (
              <p className={cn('mt-2 tabular-nums', isPink ? 'bunny-country-meta' : 'text-[0.72rem] uppercase tracking-widest text-foreground-muted')}>
                {isPink ? `♡ ${stations.length} stations` : `${stations.length} stations`}
              </p>
            )}
          </div>
        </div>

        <StationList
          stations={stations}
          loading={loading}
          onSelect={setSelectedStation}
          selectedStation={selectedStation}
          themeMode={themeMode}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          recents={recents}
          playlists={playlists}
          createPlaylist={createPlaylist}
          onManagePlaylists={() => setIsManagingPlaylists(true)}
        />
      </div>

      {isManagingPlaylists && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-surface px-6 pb-20 pt-[env(safe-area-inset-top)]">
          <div className="mx-auto max-w-[600px] pt-6">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="m-0 text-3xl font-extrabold text-foreground">Manage Playlists</h2>
              <button type="button" onClick={() => setIsManagingPlaylists(false)} className="cursor-pointer border-none bg-transparent p-2 text-xl text-foreground-muted">✕</button>
            </div>
            {playlists.length === 0 ? (
              <p className="mt-10 text-center text-foreground-muted">No playlists to manage.</p>
            ) : playlists.map(pl => (
              <div key={pl.id} className="mb-4 flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-6 shadow-panel">
                <h3 className="m-0 text-2xl font-semibold text-foreground">{pl.name}</h3>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt('Rename playlist:', pl.name)
                      if (name?.trim()) renamePlaylist(pl.id, name.trim())
                    }}
                    className="flex-1 cursor-pointer rounded-xl border border-foreground bg-transparent px-4 py-4 text-base font-bold text-foreground"
                  >
                    RENAME
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (window.confirm('Delete playlist?')) deletePlaylist(pl.id) }}
                    className="flex-1 cursor-pointer rounded-xl border-none bg-red-500 px-4 py-4 text-base font-bold text-white"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AudioPlayer
        station={selectedStation}
        themeMode={themeMode}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        playlists={playlists}
        toggleStationInPlaylist={toggleStationInPlaylist}
      />

      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-surface p-4 pt-[calc(16px+env(safe-area-inset-top))]">
          <div className="mb-4 flex gap-2.5">
            <div className="flex flex-1 items-center rounded-lg border border-border bg-surface-muted px-3.5 py-2.5">
              <input
                autoFocus
                type="text"
                placeholder="Search country..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border-none bg-transparent text-base text-foreground outline-none"
              />
            </div>
            <button type="button" onClick={() => setIsMobileSearchOpen(false)} className="px-2.5 py-2.5 text-base font-semibold text-foreground">Close</button>
          </div>
          <div className="scrollbar-hide flex-1 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <p className="p-5 text-center text-foreground-muted">No countries found</p>
            ) : filteredCountries.map(c => (
              <button
                key={c.name}
                type="button"
                onClick={() => { setSelectedCountry(c.name); setIsMobileSearchOpen(false); setSearchQuery('') }}
                className="flex w-full items-center justify-between border-b border-border px-4 py-4 text-left text-base text-foreground"
              >
                {c.name}
                <span className="text-[0.8rem] text-foreground-muted">{c.stationcount} stn</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
