import { useEffect, useRef, useState } from 'react'
import { RadioStation } from '../services/radioApi'

export function AudioPlayer({ station, isDarkMode, favorites, toggleFavorite }: { 
  station: RadioStation | null, 
  isDarkMode?: boolean,
  favorites: RadioStation[],
  toggleFavorite: (s: RadioStation) => void | Promise<void>
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)

  const bg = isDarkMode ? '#0a0a0a' : '#fff'
  const border = isDarkMode ? '#1a1a1a' : '#eaeaea'
  const text = isDarkMode ? '#fff' : '#000'
  const muted = isDarkMode ? '#555' : '#aaa'
  const subtle = isDarkMode ? '#111' : '#f8f8f8'

  useEffect(() => {
    if (station && audioRef.current) {
      audioRef.current.load()
      audioRef.current.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
    }
  }, [station])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const getPlaceholder = (name: string) => {
    const char = name.charAt(0).toUpperCase()
    return `https://ui-avatars.com/api/?name=${char}&background=${isDarkMode ? '111' : 'f0f0f0'}&color=${isDarkMode ? 'fff' : '000'}&bold=true&format=svg`
  }

  if (!station) {
    return (
      <div style={{
        height: '72px', background: bg, borderTop: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', padding: '0 32px',
        fontFamily: 'inherit',
      }}>
        <span style={{ fontSize: '0.75rem', color: muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Select a station to begin
        </span>
      </div>
    )
  }

  const isFav = favorites.some(s => s.stationuuid === station.stationuuid)

  return (
    <div style={{
      height: '72px', background: bg, borderTop: `1px solid ${border}`,
      display: 'flex', alignItems: 'center', padding: '0 32px',
      fontFamily: 'inherit', gap: '24px', zIndex: 100,
    }}>
      {/* Station info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
        <img
          src={station.favicon && station.favicon.startsWith('http') ? station.favicon : getPlaceholder(station.name)}
          alt=""
          style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'contain', background: subtle, flexShrink: 0 }}
          onError={e => (e.currentTarget.src = getPlaceholder(station.name))}
        />
        <div style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
              {station.name}
            </div>
            <button
              onClick={() => toggleFavorite(station)}
              style={{
                background: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: '0.95rem',
                color: isFav ? '#f59e0b' : muted,
                padding: 0, flexShrink: 0, transition: 'color 0.15s',
                lineHeight: 1, display: 'flex', alignItems: 'center'
              }}
            >
              {isFav ? '★' : '☆'}
            </button>
          </div>
          <div style={{ fontSize: '0.7rem', color: muted, marginTop: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {station.country}
          </div>
        </div>
      </div>

      {/* Play / Pause */}
      <button
        onClick={() => {
          if (!audioRef.current) return
          isPlaying ? audioRef.current.pause() : audioRef.current.play()
          setIsPlaying(!isPlaying)
        }}
        style={{
          width: '40px', height: '40px',
          background: isPlaying ? text : 'transparent',
          color: isPlaying ? bg : text,
          border: `1px solid ${isDarkMode ? '#333' : '#ddd'}`,
          borderRadius: '50%',
          cursor: 'pointer', fontSize: '0.85rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.2s',
        }}
      >
        {isPlaying ? '■' : '▶'}
      </button>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.7rem', color: muted, letterSpacing: '0.06em', textTransform: 'uppercase', userSelect: 'none' }}>Vol</span>
        <input
          type="range" min="0" max="1" step="0.01"
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          style={{ width: '90px', accentColor: text, cursor: 'pointer' }}
        />
      </div>

      <audio
        ref={audioRef}
        src={station.url_resolved}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  )
}
