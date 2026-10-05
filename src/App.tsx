import { type CSSProperties, lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { AppMenu } from './components/AppMenu'
import { AudioPlayer, type PlayerState } from './components/AudioPlayer'
import { AuthDialog } from './components/AuthDialog'
import { BottomSheet, type Snap } from './components/BottomSheet'
import { CountryPicker } from './components/CountryPicker'
import { Header } from './components/Header'
import { Icon } from './components/icons'
import { PlaylistManager, PlaylistPicker } from './components/Playlists'
import { StationList } from './components/StationList'
import { Toast } from './components/Toast'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { useLibrary } from './hooks/useLibrary'
import { useIsDesktop, usePrefersReducedMotion } from './hooks/useMediaQuery'
import { useCountries, useStations } from './hooks/useRadio'
import { useTheme } from './hooks/useTheme'
import { countryName, defaultCountryCode } from './lib/country'
import { tick } from './lib/haptics'
import { readStorage, writeStorage } from './lib/storage'
import { radioApi, type RadioStation } from './services/radioApi'
import { signOut, useSession } from './services/auth'

const GlobeView = lazy(() => import('./components/globe/GlobeView'))

const TOAST_MS = 3500
const HINT_MS = 15_000
const LAST_KEY = 'rxdio_last'
const HINT_KEY = 'rxdio_hint_seen'

type Last = { countryCode?: string; station?: RadioStation | null }

const isStation = (value: unknown): value is RadioStation =>
  typeof value === 'object' && value !== null && typeof (value as RadioStation).stationuuid === 'string' && typeof (value as RadioStation).url_resolved === 'string'

function GlobePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="size-48 animate-pulse rounded-full bg-surface-muted" />
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const isDesktop = useIsDesktop()
  const reduceMotion = usePrefersReducedMotion()
  const session = useSession()
  const install = useInstallPrompt()

  const [toast, setToast] = useState<string | null>(null)
  const notify = useCallback((message: string) => setToast(message), [])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(id)
  }, [toast])

  const library = useLibrary(session?.userId, notify)
  const { countries } = useCountries()
  // Pick up where the listener left off: last country and last station (loaded, but not auto-played)
  const [last] = useState(() => readStorage<Last>(LAST_KEY, {}))
  const [countryCode, setCountryCode] = useState(() => (last.countryCode && /^[A-Z]{2}$/.test(last.countryCode) ? last.countryCode : defaultCountryCode()))
  const [focusKey, setFocusKey] = useState(0)
  const { stations, status, reload } = useStations(countryCode)

  const [station, setStation] = useState<RadioStation | null>(() => (isStation(last.station) ? last.station : null))
  const [queue, setQueue] = useState<RadioStation[]>([])
  const [autoplay, setAutoplay] = useState(false)
  const [playRequest, setPlayRequest] = useState(0)
  const [playerState, setPlayerState] = useState<PlayerState>('paused')
  const [shuffling, setShuffling] = useState(false)
  const [hintOpen, setHintOpen] = useState(() => !readStorage<boolean>(HINT_KEY, false))

  const [snap, setSnap] = useState<Snap>('half')
  const [sheetHeight, setSheetHeight] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [playlistsOpen, setPlaylistsOpen] = useState(false)
  const [addToPlaylist, setAddToPlaylist] = useState<RadioStation | null>(null)

  const countryLabel = countryName(countryCode, countries.find(c => c.code === countryCode)?.name)

  useEffect(() => { document.title = station ? `${station.name} · Rxdio` : 'Rxdio' }, [station])
  useEffect(() => writeStorage(LAST_KEY, { countryCode, station }), [countryCode, station])

  const dismissHint = useCallback(() => { setHintOpen(false); writeStorage(HINT_KEY, true) }, [])
  useEffect(() => {
    if (!hintOpen) return
    const id = setTimeout(dismissHint, HINT_MS)
    return () => clearTimeout(id)
  }, [hintOpen, dismissHint])
  useEffect(() => { if (session) setAuthOpen(false) }, [session])

  useEffect(() => {
    const onOffline = () => notify("You're offline — streams will resume when you're back")
    window.addEventListener('offline', onOffline)
    return () => window.removeEventListener('offline', onOffline)
  }, [notify])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target.tagName))
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
        e.preventDefault()
        setPickerOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const requestSignIn = useCallback(() => setAuthOpen(true), [])

  const selectCountry = useCallback((code: string) => {
    setCountryCode(code)
    setFocusKey(k => k + 1)
    setSnap('half')
    dismissHint()
  }, [dismissHint])

  const play = (next: RadioStation, list: RadioStation[]) => {
    tick()
    dismissHint()
    setStation(next)
    setQueue(list)
    setAutoplay(true)
    setPlayRequest(n => n + 1)
    library.addRecent(next)
  }

  const onTimerEnd = useCallback(() => notify('Sleep timer finished. Good night.'), [notify])

  const shuffle = async () => {
    setShuffling(true)
    try {
      const random = await radioApi.getRandomStation()
      if (!random?.countrycode) { notify('No station found — try again'); return }
      selectCountry(random.countrycode)
      play(random, [random])
      notify(`Tuned in to ${random.name} · ${countryName(random.countrycode, random.country)}`)
    } catch {
      notify("Couldn't reach the radio directory")
    } finally {
      setShuffling(false)
    }
  }

  const step = (delta: number) => {
    const index = queue.findIndex(s => s.stationuuid === station?.stationuuid)
    if (index < 0 || queue.length < 2) return undefined
    return () => play(queue[(index + delta + queue.length) % queue.length], queue)
  }

  const signedIn = session !== null
  const withAccount = (action: (s: RadioStation) => void) => (s: RadioStation) => (signedIn ? action(s) : requestSignIn())
  const toggleFavorite = (s: RadioStation) => { tick(); library.toggleFavorite(s) }

  const list = (
    <StationList
      country={{ code: countryCode, name: countryLabel }}
      stations={stations}
      status={status}
      onRetry={reload}
      theme={theme}
      currentId={station?.stationuuid}
      playerState={playerState}
      onPlay={play}
      favorites={library.favorites}
      favoriteIds={library.favoriteIds}
      onToggleFavorite={toggleFavorite}
      recents={library.recents}
      playlists={library.playlists}
      signedIn={signedIn}
      onRequestSignIn={requestSignIn}
      onManagePlaylists={() => setPlaylistsOpen(true)}
      onTabChange={() => setSnap(s => (s === 'peek' ? 'half' : s))}
    />
  )

  return (
    <div
      className="fixed inset-0 flex flex-col bg-surface text-foreground"
      style={{ '--player-h': station ? 'calc(var(--player-bar) + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)' } as CSSProperties}
    >
      <Header
        country={{ code: countryCode, name: countryLabel }}
        onOpenPicker={() => setPickerOpen(true)}
        onShuffle={shuffle}
        shuffling={shuffling}
        onSignIn={signedIn ? undefined : requestSignIn}
        menu={
          <AppMenu
            theme={theme}
            onTheme={setTheme}
            email={session?.email ?? session?.userId}
            onSignIn={requestSignIn}
            onSignOut={signOut}
            onPlaylists={() => setPlaylistsOpen(true)}
            canInstall={install.canInstall}
            onInstall={install.install}
            showIosHint={install.showIosHint}
          />
        }
      />

      <main className="relative flex min-h-0 flex-1" style={{ marginBottom: 'var(--player-h)' }}>
        <div className="relative min-w-0 flex-1">
          <Suspense fallback={<GlobePlaceholder />}>
            <GlobeView
              theme={theme}
              countries={countries}
              selectedCode={countryCode}
              focusKey={focusKey}
              playing={station?.countrycode ? { code: station.countrycode, name: station.name, isPlaying: playerState === 'playing' } : null}
              bottomInset={isDesktop ? 0 : sheetHeight}
              reduceMotion={reduceMotion}
              compact={!isDesktop}
              onSelectCountry={selectCountry}
            />
          </Suspense>
          {hintOpen && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
              <p className="pointer-events-auto flex animate-fade-in items-center gap-1 rounded-lg border border-border bg-surface-panel py-1 pl-4 pr-1 text-sm shadow-dropdown">
                <span>Tap a country, or hit scan for a random station</span>
                <button type="button" onClick={dismissHint} aria-label="Dismiss tip" className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-surface-muted">
                  <Icon name="close" size={16} />
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Scan (random station) lives in the thumb zone on phones, riding on top of the sheet */}
        {!isDesktop && snap !== 'full' && (
          <button
            type="button"
            onClick={shuffle}
            disabled={shuffling}
            aria-label="Play a random station"
            style={{ bottom: sheetHeight + 16, transition: 'bottom 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
            className="absolute right-4 z-10 flex size-14 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-fg shadow-panel active:scale-95 disabled:opacity-60"
          >
            <Icon name="scan" size={26} className={shuffling ? 'animate-spin' : undefined} />
          </button>
        )}

        {isDesktop ? (
          <aside className="w-[380px] shrink-0 border-l border-border bg-surface">{list}</aside>
        ) : (
          <BottomSheet snap={snap} onSnapChange={setSnap} onHeight={setSheetHeight}>{list}</BottomSheet>
        )}
      </main>

      <AudioPlayer
        station={station}
        theme={theme}
        isFavorite={station ? library.favoriteIds.has(station.stationuuid) : false}
        onToggleFavorite={withAccount(toggleFavorite)}
        onAddToPlaylist={withAccount(setAddToPlaylist)}
        onPrev={step(-1)}
        onNext={step(1)}
        onStateChange={setPlayerState}
        autoplay={autoplay}
        playRequest={playRequest}
        onTimerEnd={onTimerEnd}
      />

      <CountryPicker open={pickerOpen} countries={countries} selectedCode={countryCode} onSelect={selectCountry} onClose={() => setPickerOpen(false)} />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      <PlaylistManager
        open={playlistsOpen}
        playlists={library.playlists}
        onCreate={library.createPlaylist}
        onRename={library.renamePlaylist}
        onDelete={library.deletePlaylist}
        onClose={() => setPlaylistsOpen(false)}
      />
      <PlaylistPicker
        station={addToPlaylist}
        playlists={library.playlists}
        onToggle={library.toggleStationInPlaylist}
        onCreate={library.createPlaylist}
        onClose={() => setAddToPlaylist(null)}
      />
      <Toast message={toast} />
      <SpeedInsights />
    </div>
  )
}
