import { useEffect, useRef, useState, useCallback } from 'react'
import { RadioStation } from '../services/radioApi'
import { avatarUrl, type ThemeMode } from '../theme'
import { cn } from '../lib/cn'
import { IconClock, IconReconnect } from './icons'
import type { Playlist } from '../App'

type Props = {
  station: RadioStation | null
  themeMode: ThemeMode
  favorites: RadioStation[]
  toggleFavorite: (s: RadioStation) => void | Promise<void>
  playlists?: Playlist[]
  toggleStationInPlaylist?: (id: string, s: RadioStation) => void
}

const playerBar = cn(
  'audio-player fixed inset-x-0 bottom-0 z-[1000] flex items-center border-t border-border bg-surface-muted shadow-player',
  'h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]',
)

const dropdown = 'bunny-dropdown absolute z-[1100] min-w-[140px] rounded-2xl border border-border bg-surface-raised py-2 shadow-dropdown'

export function AudioPlayer({
  station, themeMode, favorites, toggleFavorite,
  playlists = [], toggleStationInPlaylist,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [sleepTimer, setSleepTimer] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false)
  const [customTimerInput, setCustomTimerInput] = useState('')
  const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false)
  const timerRef = useRef<HTMLDivElement>(null)
  const playlistMenuRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const getArtworkUrl = useCallback((s: RadioStation) => {
    if (!s) return ''
    return s.favicon?.startsWith('http') ? s.favicon : avatarUrl(themeMode, s.name, 'png')
  }, [themeMode])

  const retryConnection = useCallback(() => {
    if (!audioRef.current || !station) return
    setIsReconnecting(true)
    setHasError(false)
    audioRef.current.load()
    audioRef.current.play()
      .then(() => { setIsPlaying(true); setIsReconnecting(false) })
      .catch(() => { setHasError(true); setIsPlaying(false); setIsReconnecting(false) })
  }, [station])

  useEffect(() => {
    if (!sleepTimer) { setTimeLeft(null); return }
    const end = Date.now() + sleepTimer * 60_000
    setTimeLeft(sleepTimer * 60)
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        audioRef.current?.pause()
        setIsPlaying(false)
        setSleepTimer(null)
        setTimeLeft(null)
        clearInterval(id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [sleepTimer])

  useEffect(() => {
    if (!station || !audioRef.current) return
    setHasError(false)
    setIsReconnecting(false)
    audioRef.current.load()
    audioRef.current.play().catch(() => { setIsPlaying(false); setHasError(true) })
    setIsPlaying(true)

    if ('mediaSession' in navigator) {
      const art = getArtworkUrl(station)
      const sizes = ['96x96', '128x128', '192x192', '256x256', '384x384', '512x512'] as const
      navigator.mediaSession.metadata = new MediaMetadata({
        title: station.name,
        artist: station.country || 'Live Radio',
        album: 'Rxdio PWA',
        artwork: sizes.map(s => ({ src: art, sizes: s, type: 'image/png' })),
      })
      navigator.mediaSession.setActionHandler('play', () => { audioRef.current?.play(); setIsPlaying(true) })
      navigator.mediaSession.setActionHandler('pause', () => { audioRef.current?.pause(); setIsPlaying(false) })
      navigator.mediaSession.setActionHandler('stop', () => { audioRef.current?.pause(); setIsPlaying(false) })
    }
  }, [station, getArtworkUrl])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (timerRef.current && !timerRef.current.contains(e.target as Node)) setIsTimerMenuOpen(false)
      if (playlistMenuRef.current && !playlistMenuRef.current.contains(e.target as Node)) setIsPlaylistMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (!hasError) return
    const t = setTimeout(retryConnection, 5000)
    return () => clearTimeout(t)
  }, [hasError, retryConnection])

  useEffect(() => {
    const onOnline = () => { if (hasError || isReconnecting) retryConnection() }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [hasError, isReconnecting, retryConnection])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!audioRef.current || hasError) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
    setIsPlaying(!isPlaying)
  }

  const playBtnClass = (large?: boolean) => cn(
    'flex shrink-0 items-center justify-center rounded-full border transition-all',
    large ? 'size-16 text-2xl' : 'size-11 text-sm',
    hasError && 'cursor-not-allowed opacity-40',
    isPlaying
      ? 'border-accent bg-foreground text-surface'
      : 'border-border bg-transparent text-foreground hover:border-accent',
  )

  const StatusTag = () => {
    if (isReconnecting) {
      return (
        <span className="flex items-center gap-1 rounded bg-surface-muted px-1.5 py-0.5 text-[0.6rem] font-semibold text-foreground">
          <IconReconnect /> RECONNECTING
        </span>
      )
    }
    if (hasError) {
      return (
        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[0.6rem] font-bold text-red-500">
          STREAM FAILED
        </span>
      )
    }
    return null
  }

  const TimerMenu = ({ align = 'left' }: { align?: 'left' | 'center' | 'top' }) => (
    <div ref={timerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setIsTimerMenuOpen(v => !v) }}
        title="Sleep Timer"
        className={cn(
          'flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center text-xs font-semibold transition-all',
          sleepTimer ? 'rounded-full border border-accent bg-foreground px-3 text-surface' : 'rounded-full border border-border',
        )}
      >
        {timeLeft !== null
          ? timeLeft < 60 ? '<1m' : `${Math.ceil(timeLeft / 60)}m`
          : <IconClock />}
      </button>
      {isTimerMenuOpen && (
        <div
          onClick={e => e.stopPropagation()}
          className={cn(dropdown, align === 'center' && 'bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2', align === 'top' && 'bottom-[calc(100%+12px)] left-0', align === 'left' && 'bottom-[calc(100%+12px)] left-0')}
        >
          <p className="px-4 pb-2 pt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-foreground-muted">Sleep Timer</p>
          {[15, 30, 45, 60].map(mins => (
            <button
              key={mins}
              type="button"
              onClick={() => { setSleepTimer(mins); setIsTimerMenuOpen(false) }}
              className={cn('w-full px-4 py-2.5 text-left text-[0.85rem] hover:bg-surface-muted', sleepTimer === mins ? 'font-semibold text-amber-500' : 'text-foreground')}
            >
              {mins} minutes
            </button>
          ))}
          <hr className="my-1 border-border" />
          <form
            onSubmit={e => {
              e.preventDefault()
              const v = parseInt(customTimerInput, 10)
              if (!isNaN(v) && v > 0) { setSleepTimer(v); setIsTimerMenuOpen(false); setCustomTimerInput('') }
            }}
            className="flex items-center gap-2 px-4 py-1.5"
          >
            <input
              type="number"
              min={1}
              placeholder="Mins"
              value={customTimerInput}
              onChange={e => setCustomTimerInput(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-[0.8rem] text-foreground outline-none"
            />
            <button type="submit" className="rounded-md bg-foreground px-3 py-1.5 text-[0.75rem] font-semibold text-surface">Set</button>
          </form>
          <hr className="my-1 border-border" />
          <button type="button" onClick={() => { setSleepTimer(null); setIsTimerMenuOpen(false) }} className="w-full px-4 py-2.5 text-left text-[0.85rem] text-red-400 hover:bg-surface-muted">
            Turn Off
          </button>
        </div>
      )}
    </div>
  )

  const PlaylistMenu = ({ align = 'left' }: { align?: 'left' | 'center' }) => {
    if (!station) return null
    return (
      <div ref={playlistMenuRef} className="relative">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setIsPlaylistMenuOpen(v => !v) }}
          className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center text-xl text-foreground-muted opacity-80 hover:opacity-100"
        >
          +
        </button>
        {isPlaylistMenuOpen && (
          <div
            onClick={e => e.stopPropagation()}
            className={cn(dropdown, 'bottom-[calc(100%+10px)] min-w-[160px]', align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0')}
          >
            <p className="px-4 pb-2 pt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-foreground-muted">Add to Playlist</p>
            {playlists.length === 0 ? (
              <p className="px-4 py-2 text-[0.75rem] text-foreground-muted">Use + tab to create one.</p>
            ) : playlists.map(pl => {
              const added = pl.stations.some(s => s.stationuuid === station.stationuuid)
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={e => { e.stopPropagation(); toggleStationInPlaylist?.(pl.id, station) }}
                  className={cn('flex w-full items-center justify-between px-4 py-2.5 text-left text-[0.85rem] hover:bg-surface-muted', added ? 'font-semibold text-amber-500' : 'text-foreground')}
                >
                  <span className="max-w-[120px] truncate">{pl.name}</span>
                  {added && <span>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderPlayer = () => {
    if (!station) {
      return (
        <div className={cn(playerBar, 'empty-player px-8 max-md:gap-3 max-md:px-4')}>
          <span className="text-[0.75rem] uppercase tracking-widest text-foreground-muted">Select a station to begin</span>
        </div>
      )
    }

    const isFav = favorites.some(s => s.stationuuid === station.stationuuid)
    const art = getArtworkUrl(station)

    if (isMobile && !isExpanded) {
      return (
        <div className={cn(playerBar, 'mini-player cursor-pointer justify-between gap-4 px-5')} onClick={() => setIsExpanded(true)}>
          <img src={art} alt="" className="size-[42px] shrink-0 rounded-md bg-surface-muted object-contain" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-[0.9rem] font-semibold text-foreground">{station.name}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-[0.7rem] uppercase text-foreground-muted">{station.country}</span>
              <StatusTag />
            </div>
          </div>
          <button type="button" className={playBtnClass()} disabled={hasError} onClick={togglePlay}>
            {isPlaying ? '■' : '▶'}
          </button>
        </div>
      )
    }

    if (isMobile && isExpanded) {
      return (
        <div className="audio-player full-player fixed inset-0 z-[9999] flex animate-slide-up flex-col bg-surface-muted px-6 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
          <button type="button" onClick={() => setIsExpanded(false)} className="flex w-full cursor-pointer justify-center py-4">
            <div className="h-1.5 w-10 rounded-full bg-foreground/30" />
          </button>
          <div className="my-[2vh] flex flex-1 flex-col items-center justify-center">
            <img src={art} alt="" className="aspect-square w-full max-w-[300px] rounded-xl bg-surface-muted object-contain shadow-panel" />
          </div>
          <div className="mb-6 text-center">
            <h2 className="mb-1 text-2xl font-bold text-foreground">{station.name}</h2>
            <div className="flex items-center justify-center gap-2">
              <p className="text-[0.9rem] uppercase tracking-wide text-foreground-muted">{station.country}</p>
              <StatusTag />
            </div>
          </div>
          <div className="mb-8 flex items-center justify-center gap-6">
            <button type="button" onClick={() => toggleFavorite(station)} className={cn('cursor-pointer border-none bg-transparent text-2xl', isFav ? 'text-heart' : 'text-foreground-muted')}>
              {isFav ? '♥' : '♡'}
            </button>
            <button type="button" className={playBtnClass(true)} disabled={hasError} onClick={togglePlay}>{isPlaying ? '■' : '▶'}</button>
            <PlaylistMenu align="center" />
          </div>
          <div className="flex items-center justify-between px-4">
            <TimerMenu align="top" />
            <div className="flex items-center gap-2.5">
              <span className="text-[0.7rem] text-foreground-muted">VOL</span>
              <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(+e.target.value)} className="w-[120px] accent-foreground" />
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className={cn(playerBar, 'desktop-player justify-between gap-4 px-6 max-md:gap-3 max-md:px-4')}>
        <div className="flex min-w-0 max-w-[300px] flex-1 items-center gap-3.5">
          <img src={art} alt="" className="size-12 shrink-0 rounded-md bg-surface-muted object-contain" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-[0.95rem] font-semibold text-foreground">{station.name}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-[0.75rem] uppercase text-foreground-muted">{station.country}</span>
              <StatusTag />
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center gap-5">
          <button type="button" className={playBtnClass()} disabled={hasError} onClick={togglePlay}>{isPlaying ? '■' : '▶'}</button>
        </div>
        <div className="flex flex-1 shrink-0 items-center justify-end gap-4">
          <button type="button" onClick={() => toggleFavorite(station)} className={cn('cursor-pointer border-none bg-transparent text-xl', isFav ? 'text-heart' : 'text-foreground-muted')}>
            {isFav ? '♥' : '♡'}
          </button>
          <PlaylistMenu align="center" />
          <TimerMenu align="center" />
          <div className="flex items-center gap-2">
            <span className="text-[0.7rem] uppercase text-foreground-muted">Vol</span>
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(+e.target.value)} className="w-20 cursor-pointer accent-foreground" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={station?.url_resolved || ''}
        onPlay={() => { setIsPlaying(true); setIsReconnecting(false); setHasError(false) }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsReconnecting(true)}
        onPlaying={() => setIsReconnecting(false)}
        onError={() => { setHasError(true); setIsPlaying(false) }}
      />
      {renderPlayer()}
    </>
  )
}
