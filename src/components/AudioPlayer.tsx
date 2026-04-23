import { useEffect, useRef, useState } from 'react'
import { RadioStation } from '../services/radioApi'

export function AudioPlayer({ station, isDarkMode, favorites, toggleFavorite }: { 
  station: RadioStation | null, 
  isDarkMode?: boolean,
  favorites: RadioStation[],
  toggleFavorite: (s: RadioStation) => void
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)

  const theme = {
    bg: isDarkMode ? '#111' : '#fff',
    border: isDarkMode ? '#222' : '#eaeaea',
    text: isDarkMode ? '#fff' : '#111',
    subText: isDarkMode ? '#aaa' : '#666',
    imgBg: isDarkMode ? '#222' : '#f5f5f5',
    btnBg: isDarkMode ? '#fff' : '#111',
    btnText: isDarkMode ? '#111' : '#fff',
    track: isDarkMode ? '#fff' : '#111',
  }

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
    return `https://ui-avatars.com/api/?name=${char}&background=${isDarkMode ? '222' : 'f0f0f0'}&color=${isDarkMode ? 'fff' : '333'}&bold=true&format=svg`
  }

  if (!station) return null

  return (
    <div style={{
      height: '80px',
      background: theme.bg,
      borderTop: `1px solid ${theme.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 30px',
      zIndex: 100,
      fontFamily: 'inherit',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.02)',
      transition: 'all 0.3s'
    }}>
      {/* Station Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '30%' }}>
        <img 
          src={station.favicon && station.favicon.startsWith('http') ? station.favicon : getPlaceholder(station.name)} 
          alt="" 
          style={{ minWidth: '50px', width: '50px', height: '50px', borderRadius: '8px', objectFit: 'contain', background: theme.imgBg, border: `1px solid ${theme.border}` }}
          onError={(e) => (e.currentTarget.src = getPlaceholder(station.name))}
        />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {station.name}
            </div>
            <button
              title={favorites.some(s => s.stationuuid === station.stationuuid) ? 'Remove from Favorites' : 'Add to Favorites'}
              onClick={() => toggleFavorite(station)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '1.1rem', color: favorites.some(s => s.stationuuid === station.stationuuid) ? '#ffd700' : theme.text,
                opacity: favorites.some(s => s.stationuuid === station.stationuuid) ? 1 : 0.4,
                transition: 'all 0.2s', padding: 0,
                display: 'flex', alignItems: 'center', flexShrink: 0
              }}
            >
              {favorites.some(s => s.stationuuid === station.stationuuid) ? '★' : '☆'}
            </button>
          </div>
          <div style={{ fontSize: '0.8rem', color: theme.subText }}>{station.country}</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40%' }}>
        <button 
          title={isPlaying ? 'Pause' : 'Play'}
          onClick={() => {
            if (audioRef.current) {
              isPlaying ? audioRef.current.pause() : audioRef.current.play()
              setIsPlaying(!isPlaying)
            }
          }}
          style={{
            background: isPlaying ? theme.btnBg : 'transparent',
            color: isPlaying ? theme.btnText : theme.text,
            border: `1px solid ${theme.border}`,
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}
        >
          {isPlaying ? '■' : '▶'}
        </button>
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'flex-end', width: '30%' }}>
        <span style={{ fontSize: '0.8rem', color: theme.subText, fontWeight: 500 }}>Volume</span>
        <input 
          type="range" 
          min="0" max="1" step="0.01" 
          value={volume} 
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={{ width: '100px', accentColor: theme.track, cursor: 'pointer' }}
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
