import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { countryName, flagEmoji } from '../lib/country'
import { useIsDesktop } from '../hooks/useMediaQuery'
import type { RadioStation } from '../services/radioApi'
import type { ThemeMode } from '../theme'
import { Dialog } from './Dialog'
import { EqBars } from './EqBars'
import { Icon } from './icons'
import { IconButton } from './IconButton'
import { StationArt } from './StationArt'

export type PlayerState = 'connecting' | 'playing' | 'paused' | 'error'

type Props = {
  station: RadioStation | null
  theme: ThemeMode
  isFavorite: boolean
  onToggleFavorite: (station: RadioStation) => void
  onAddToPlaylist: (station: RadioStation) => void
  onPrev?: () => void
  onNext?: () => void
  onStateChange: (state: PlayerState) => void
  /** False for a station restored from the last session: load it, but wait for the user to press play. */
  autoplay: boolean
  /** Bumped on every explicit "play this" so tapping the current station restarts it. */
  playRequest: number
  onTimerEnd?: () => void
}

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 4000
const TIMER_PRESETS = [15, 30, 45, 60, 90]
const FALLBACK_ART = '/icons/icon-512.png'
const FADE_SECONDS = 10 // sleep timer eases the volume down instead of cutting off

export function AudioPlayer({ station, theme, isFavorite, onToggleFavorite, onAddToPlaylist, onPrev, onNext, onStateChange, autoplay, playRequest, onTimerEnd }: Props) {
  const isDesktop = useIsDesktop()
  const audioRef = useRef<HTMLAudioElement>(null)
  const retries = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [expanded, setExpanded] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [customMinutes, setCustomMinutes] = useState('')
  const [drag, setDrag] = useState<{ startY: number; dy: number } | null>(null)

  // Latest callbacks for the long-lived Media Session handlers
  const nav = useRef({ onPrev, onNext, onTimerEnd })
  nav.current = { onPrev, onNext, onTimerEnd }
  const volumeRef = useRef(volume)
  volumeRef.current = volume

  const state: PlayerState = failed ? 'error' : playing ? 'playing' : buffering ? 'connecting' : 'paused'
  useEffect(() => onStateChange(state), [state, onStateChange])

  // Load and play the current station (HLS via hls.js where the browser has no native support)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` retries a dropped stream, `playRequest` restarts the current station
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !station) return
    let hls: { destroy: () => void } | undefined
    let cancelled = false
    setFailed(false)
    setBuffering(autoplay)

    const play = () => !autoplay ? undefined : audio.play().catch(err => { if (!cancelled && err.name !== 'NotAllowedError') setFailed(true) })
    const url = station.url_resolved
    const isHls = station.hls === 1 || /\.m3u8(\?|$)/i.test(url)

    if (isHls && !audio.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (cancelled) return
          if (!Hls.isSupported()) { setFailed(true); return }
          const instance = new Hls({ lowLatencyMode: true })
          hls = instance
          instance.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) setFailed(true) })
          instance.loadSource(url)
          instance.attachMedia(audio)
          play()
        })
        .catch(() => { if (!cancelled) setFailed(true) })
    } else {
      audio.src = url
      play()
    }
    return () => { cancelled = true; hls?.destroy(); audio.pause() }
  }, [station, attempt, autoplay, playRequest])

  // Retry a dropped stream a few times, then wait for a manual tap
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new station resets the retry budget
  useEffect(() => { retries.current = 0 }, [station])
  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-arms the retry timer after each try
  useEffect(() => {
    if (!failed || retries.current >= MAX_RETRIES) return
    const id = setTimeout(() => { retries.current++; setAttempt(a => a + 1) }, RETRY_DELAY_MS)
    return () => clearTimeout(id)
  }, [failed, attempt])

  const retryNow = useCallback(() => { retries.current = 0; setAttempt(a => a + 1) }, [])

  useEffect(() => {
    const onOnline = () => { if (failed) retryNow() }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [failed, retryNow])

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

  // Sleep timer
  useEffect(() => {
    if (!timerEndsAt) return
    const audio = audioRef.current
    const tick = () => {
      const left = (timerEndsAt - Date.now()) / 1000
      if (left <= 0) { audio?.pause(); setTimerEndsAt(null); nav.current.onTimerEnd?.(); return }
      setTimeLeft(Math.ceil(left))
      if (audio && left <= FADE_SECONDS) audio.volume = volumeRef.current * (left / FADE_SECONDS)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => { clearInterval(id); if (audio) audio.volume = volumeRef.current }
  }, [timerEndsAt])

  // Lock-screen / notification controls
  useEffect(() => {
    if (!station || !('mediaSession' in navigator)) return
    const art = station.favicon?.startsWith('https://') ? station.favicon : new URL(FALLBACK_ART, location.origin).href
    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: station.country || 'Live radio',
      album: 'Rxdio',
      artwork: [{ src: art, sizes: '512x512' }],
    })
    const audio = audioRef.current
    navigator.mediaSession.setActionHandler('play', () => { audio?.play() })
    navigator.mediaSession.setActionHandler('pause', () => audio?.pause())
    navigator.mediaSession.setActionHandler('stop', () => audio?.pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => nav.current.onPrev?.())
    navigator.mediaSession.setActionHandler('nexttrack', () => nav.current.onNext?.())
  }, [station])

  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !station) return
    if (failed) retryNow()
    else if (playing) audio.pause()
    else audio.play().catch(() => setFailed(true))
  }

  const startTimer = (minutes: number) => { setTimerEndsAt(Date.now() + minutes * 60_000); setTimerOpen(false) }

  const status = failed
    ? retries.current >= MAX_RETRIES ? 'Stream failed — tap play to retry' : 'Stream dropped — reconnecting…'
    : buffering && !playing ? 'Connecting…' : buffering ? 'Buffering…' : null

  const timerLabel = timerEndsAt ? (timeLeft < 60 ? '<1m' : `${Math.ceil(timeLeft / 60)}m`) : null

  const timerButton = (
    <button
      type="button"
      onClick={() => setTimerOpen(true)}
      aria-label={timerLabel ? `Sleep timer: ${timerLabel} left` : 'Sleep timer'}
      className={cn('flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs font-bold hover:bg-surface-muted', timerLabel && 'bg-accent text-accent-fg hover:bg-accent')}
    >
      {timerLabel ?? <Icon name="timer" size={22} />}
    </button>
  )

  const volumeSlider = (
    <label className="flex items-center gap-2 text-foreground-muted">
      <Icon name="volume" size={20} />
      <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(+e.target.value)} aria-label="Volume" className="w-24 accent-accent" />
    </label>
  )

  const playButton = (size: 'md' | 'lg') => (
    <IconButton
      icon={playing && !failed ? 'pause' : 'play'}
      label={playing && !failed ? 'Pause' : 'Play'}
      size="lg"
      onClick={togglePlay}
      className={size === 'md' ? 'size-12 [&_svg]:size-6' : undefined}
    />
  )

  const audio = (
    // biome-ignore lint/a11y/useMediaCaption: live radio has no captions
    <audio
      ref={audioRef}
      preload="none"
      onPlay={() => setBuffering(true)}
      onPlaying={() => { setPlaying(true); setBuffering(false); setFailed(false) }}
      onPause={() => setPlaying(false)}
      onWaiting={() => setBuffering(true)}
      onError={e => { const err = e.currentTarget.error; if (err && err.code !== MediaError.MEDIA_ERR_ABORTED) setFailed(true) }}
    />
  )

  const timerDialog = (
    <Dialog open={timerOpen} onClose={() => setTimerOpen(false)} title="Sleep timer">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          {TIMER_PRESETS.map(m => (
            <button key={m} type="button" onClick={() => startTimer(m)} className="h-12 cursor-pointer rounded-xl bg-surface-muted font-semibold hover:bg-border">{m} min</button>
          ))}
        </div>
        <form
          onSubmit={e => { e.preventDefault(); const m = Number.parseInt(customMinutes, 10); if (m > 0) { startTimer(m); setCustomMinutes('') } }}
          className="flex gap-2"
        >
          <input type="number" min={1} max={720} inputMode="numeric" value={customMinutes} onChange={e => setCustomMinutes(e.target.value)} placeholder="Custom minutes" aria-label="Custom minutes" className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface-muted px-4 text-base outline-none focus:border-accent" />
          <button type="submit" className="h-12 cursor-pointer rounded-xl bg-accent px-5 font-bold text-accent-fg">Set</button>
        </form>
        {timerEndsAt && (
          <button type="button" onClick={() => { setTimerEndsAt(null); setTimerOpen(false) }} className="h-12 cursor-pointer rounded-xl border border-red-500/40 font-semibold text-red-500">
            Turn off ({Math.ceil(timeLeft / 60)} min left)
          </button>
        )}
      </div>
    </Dialog>
  )

  if (!station) return <>{audio}</>

  const meta = (
    <>
      <span aria-hidden="true">{flagEmoji(station.countrycode ?? '')}</span> {station.countrycode ? countryName(station.countrycode, station.country) : station.country || 'Live radio'}
      {station.codec && <> · {station.codec}</>}
    </>
  )

  const bar = 'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised/92 pb-[env(safe-area-inset-bottom)] shadow-player backdrop-blur-xl'

  if (isDesktop) {
    return (
      <>
        {audio}
        <div className={cn(bar, 'grid h-[calc(72px+env(safe-area-inset-bottom))] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6')}>
          <div className="flex min-w-0 items-center gap-3">
            <StationArt station={station} theme={theme} className="size-12 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{station.name}</p>
              <p className="flex items-center gap-2 truncate text-xs text-foreground-muted">
                <span className="truncate">{meta}</span>
                {playing && !failed && <EqBars />}
              </p>
              {status && <p className="text-[0.7rem] font-semibold text-amber-500">{status}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <IconButton icon="prev" label="Previous station" onClick={onPrev} disabled={!onPrev} />
            {playButton('md')}
            <IconButton icon="next" label="Next station" onClick={onNext} disabled={!onNext} />
          </div>
          <div className="flex items-center justify-end gap-1">
            <IconButton icon="heart" label={isFavorite ? 'Remove from saved' : 'Save station'} active={isFavorite} filled={isFavorite} onClick={() => onToggleFavorite(station)} />
            <IconButton icon="plus" label="Add to playlist" onClick={() => onAddToPlaylist(station)} />
            {timerButton}
            {volumeSlider}
          </div>
        </div>
        {timerDialog}
      </>
    )
  }

  if (!expanded) {
    return (
      <>
        {audio}
        <div className={cn(bar, 'flex h-[calc(64px+env(safe-area-inset-bottom))] items-center gap-1 pl-3 pr-2')}>
          <button type="button" onClick={() => setExpanded(true)} aria-label={`Now playing: ${station.name}. Open player`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
            <StationArt station={station} theme={theme} className="size-11 rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.92rem] font-semibold">{station.name}</span>
              <span className="flex items-center gap-2 truncate text-xs text-foreground-muted">
                <span className="truncate">{status ?? meta}</span>
                {playing && !failed && <EqBars />}
              </span>
            </span>
          </button>
          {playButton('md')}
          <IconButton icon="next" label="Next station" onClick={onNext} disabled={!onNext} />
        </div>
        {timerDialog}
      </>
    )
  }

  return (
    <>
      {audio}
      <div
        className="fixed inset-0 z-50 flex animate-slide-up flex-col bg-surface px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+8px)]"
        style={{ transform: drag ? `translateY(${drag.dy}px)` : undefined, transition: drag ? 'none' : 'transform 0.25s ease-out' }}
      >
        {/* Swipe down to dismiss like every other music player; tap or keyboard also close it */}
        <button
          type="button"
          aria-label="Close player"
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ startY: e.clientY, dy: 0 }) }}
          onPointerMove={e => setDrag(d => d && { ...d, dy: Math.max(0, e.clientY - d.startY) })}
          onPointerUp={() => { if (drag && (drag.dy > 120 || drag.dy < 6)) setExpanded(false); setDrag(null) }}
          onPointerCancel={() => setDrag(null)}
          onClick={e => { if (e.detail === 0) setExpanded(false) }}
          className="flex h-12 w-full cursor-grab touch-none items-center justify-center text-foreground-muted"
        >
          <Icon name="chevron" size={28} />
        </button>
        <div className="flex min-h-0 flex-1 items-center justify-center py-4">
          <StationArt station={station} theme={theme} className="aspect-square max-h-full w-full max-w-[320px] rounded-3xl shadow-panel" />
        </div>
        <div className="mb-6 text-center">
          <h2 className="truncate text-2xl font-bold tracking-tight">{station.name}</h2>
          <p className="mt-1 truncate text-sm text-foreground-muted">{meta}</p>
          <p className="mt-2 flex h-5 items-center justify-center gap-2 text-xs font-semibold text-amber-500">
            {status ?? (playing ? <EqBars /> : null)}
          </p>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <IconButton icon="heart" label={isFavorite ? 'Remove from saved' : 'Save station'} active={isFavorite} filled={isFavorite} onClick={() => onToggleFavorite(station)} />
          <IconButton icon="prev" label="Previous station" onClick={onPrev} disabled={!onPrev} />
          {playButton('lg')}
          <IconButton icon="next" label="Next station" onClick={onNext} disabled={!onNext} />
          <IconButton icon="plus" label="Add to playlist" onClick={() => onAddToPlaylist(station)} />
        </div>
        <div className="flex items-center justify-between">
          {timerButton}
          {volumeSlider}
        </div>
      </div>
      {timerDialog}
    </>
  )
}
