import { type CSSProperties, lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { AppMenu } from './components/AppMenu'
import { AudioPlayer } from './components/AudioPlayer'
import { AuthDialog } from './components/AuthDialog'
import { BottomSheet, type Snap } from './components/BottomSheet'
import { CountryPicker } from './components/CountryPicker'
import { Header } from './components/Header'
import { PlaylistManager, PlaylistPicker } from './components/Playlists'
import { StationList } from './components/StationList'
import { Toast } from './components/Toast'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { useLibrary } from './hooks/useLibrary'
import { useIsDesktop, usePrefersReducedMotion } from './hooks/useMediaQuery'
import { useCountries, useStations } from './hooks/useRadio'
import { useTheme } from './hooks/useTheme'
import { countryName, defaultCountryCode } from './lib/country'
import { radioApi, type RadioStation } from './services/radioApi'
import { signOut, useSession } from './services/auth'

const GlobeView = lazy(() => import('./components/globe/GlobeView'))

const TOAST_MS = 3500

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
  const [countryCode, setCountryCode] = useState(defaultCountryCode)
  const [focusKey, setFocusKey] = useState(0)
  const { stations, status, reload } = useStations(countryCode)

  const [station, setStation] = useState<RadioStation | null>(null)
  const [queue, setQueue] = useState<RadioStation[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [shuffling, setShuffling] = useState(false)

  const [snap, setSnap] = useState<Snap>('half')
  const [sheetHeight, setSheetHeight] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [playlistsOpen, setPlaylistsOpen] = useState(false)
  const [addToPlaylist, setAddToPlaylist] = useState<RadioStation | null>(null)

  const countryLabel = countryName(countryCode, countries.find(c => c.code === countryCode)?.name)

  useEffect(() => { document.title = station ? `${station.name} · Rxdio` : 'Rxdio' }, [station])
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
  }, [])

  const play = (next: RadioStation, list: RadioStation[]) => {
    setStation(next)
    setQueue(list)
    library.addRecent(next)
  }

  const shuffle = async () => {
    setShuffling(true)
    try {
      const random = await radioApi.getRandomStation()
      if (!random?.countrycode) { notify('No station found — try again'); return }
      selectCountry(random.countrycode)
      play(random, [random])
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

  const list = (
    <StationList
      country={{ code: countryCode, name: countryLabel }}
      stations={stations}
      status={status}
      onRetry={reload}
      theme={theme}
      currentId={station?.stationuuid}
      isPlaying={isPlaying}
      onPlay={play}
      favorites={library.favorites}
      favoriteIds={library.favoriteIds}
      onToggleFavorite={library.toggleFavorite}
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
              playing={station?.countrycode ? { code: station.countrycode, name: station.name, isPlaying } : null}
              bottomInset={isDesktop ? 0 : sheetHeight}
              reduceMotion={reduceMotion}
              compact={!isDesktop}
              onSelectCountry={selectCountry}
            />
          </Suspense>
        </div>

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
        onToggleFavorite={withAccount(library.toggleFavorite)}
        onAddToPlaylist={withAccount(setAddToPlaylist)}
        onPrev={step(-1)}
        onNext={step(1)}
        onPlayingChange={setIsPlaying}
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
