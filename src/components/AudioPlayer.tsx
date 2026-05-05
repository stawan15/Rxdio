import { useEffect, useRef, useState } from 'react'
import { RadioStation } from '../services/radioApi'

export function AudioPlayer({ station, isDarkMode, favorites, toggleFavorite, playlists = [], toggleStationInPlaylist }: { 
  station: RadioStation | null, 
  isDarkMode?: boolean,
  favorites: RadioStation[],
  toggleFavorite: (s: RadioStation) => void | Promise<void>,
  playlists?: import('../App').Playlist[],
  toggleStationInPlaylist?: (id: string, s: RadioStation) => void
}) {
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

  const handleCustomTimer = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customTimerInput, 10);
    if (!isNaN(val) && val > 0) {
      setSleepTimer(val);
      setIsTimerMenuOpen(false);
      setCustomTimerInput('');
    }
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (sleepTimer !== null) {
      const endTime = Date.now() + sleepTimer * 60 * 1000;
      setTimeLeft(sleepTimer * 60);

      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          if (audioRef.current) audioRef.current.pause();
          setIsPlaying(false);
          setSleepTimer(null);
          setTimeLeft(null);
          clearInterval(interval);
        }
      }, 1000);
    } else {
      setTimeLeft(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sleepTimer]);

  const bg = isDarkMode ? '#0a0a0a' : '#faf9f7'
  const border = isDarkMode ? '#1a1a1a' : '#e8e5e0'
  const text = isDarkMode ? '#fff' : '#1a1a1a'
  const muted = isDarkMode ? '#555' : '#9a9590'
  const subtle = isDarkMode ? '#111' : '#f3f1ee'

  const getPlaceholder = (name: string) => {
    const char = name.charAt(0).toUpperCase()
    return `https://ui-avatars.com/api/?name=${char}&background=${isDarkMode ? '111' : 'f3f1ee'}&color=${isDarkMode ? 'fff' : '1a1a1a'}&bold=true&format=png`
  }

  const retryConnection = () => {
    if (!audioRef.current || !station) return;
    setIsReconnecting(true);
    setHasError(false);
    audioRef.current.load();
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        setIsPlaying(true);
        setIsReconnecting(false);
      }).catch(() => {
        setHasError(true);
        setIsPlaying(false);
        setIsReconnecting(false);
      });
    }
  };

  useEffect(() => {
    if (station && audioRef.current) {
      setHasError(false)
      setIsReconnecting(false)
      audioRef.current.load()
      audioRef.current.play().catch(() => {
        setIsPlaying(false)
        setHasError(true)
      })
      setIsPlaying(true)

      // --- Media Session API for Dynamic Island & Lock Screen ---
      if ('mediaSession' in navigator) {
        const artworkUrl = station.favicon && station.favicon.startsWith('http') 
          ? station.favicon 
          : getPlaceholder(station.name);
          
        navigator.mediaSession.metadata = new MediaMetadata({
          title: station.name,
          artist: station.country || 'Live Radio',
          album: 'Rxdio PWA',
          artwork: [
            { src: artworkUrl, sizes: '96x96', type: 'image/png' },
            { src: artworkUrl, sizes: '128x128', type: 'image/png' },
            { src: artworkUrl, sizes: '192x192', type: 'image/png' },
            { src: artworkUrl, sizes: '256x256', type: 'image/png' },
            { src: artworkUrl, sizes: '384x384', type: 'image/png' },
            { src: artworkUrl, sizes: '512x512', type: 'image/png' },
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
          audioRef.current?.play();
          setIsPlaying(true);
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
          audioRef.current?.pause();
          setIsPlaying(false);
        });
        
        navigator.mediaSession.setActionHandler('stop', () => {
          audioRef.current?.pause();
          setIsPlaying(false);
        });
      }
    }
  }, [station])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timerRef.current && !timerRef.current.contains(e.target as Node)) {
        setIsTimerMenuOpen(false)
      }
      if (playlistMenuRef.current && !playlistMenuRef.current.contains(e.target as Node)) {
        setIsPlaylistMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (hasError) {
      timeout = setTimeout(() => {
         retryConnection();
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [hasError]);

  useEffect(() => {
    const handleOnline = () => {
      if (hasError || isReconnecting) {
        retryConnection();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [hasError, isReconnecting]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  if (!station) {
    return (
      <div className="audio-player" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'calc(64px + env(safe-area-inset-bottom))', 
        background: isDarkMode ? 'rgba(10,10,10,0.92)' : 'rgba(250,249,247,0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', 
        padding: '0 32px', paddingBottom: 'env(safe-area-inset-bottom)',
        fontFamily: 'inherit', zIndex: 1000,
        boxShadow: isDarkMode ? '0 -4px 30px rgba(0,0,0,0.5)' : '0 -4px 30px rgba(0,0,0,0.04)',
      }}>
        <span style={{ fontSize: '0.75rem', color: muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Select a station to begin
        </span>
      </div>
    )
  }

  const isFav = favorites.some(s => s.stationuuid === station.stationuuid)

  return (
    <div className="audio-player" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'calc(64px + env(safe-area-inset-bottom))', 
      background: isDarkMode ? 'rgba(10,10,10,0.92)' : 'rgba(250,249,247,0.85)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${border}`,
      display: 'flex', alignItems: 'center', 
      padding: '0 32px', paddingBottom: 'env(safe-area-inset-bottom)',
      fontFamily: 'inherit', gap: '24px', zIndex: 1000,
      boxShadow: isDarkMode ? '0 -4px 30px rgba(0,0,0,0.5)' : '0 -4px 30px rgba(0,0,0,0.04)',
    }}>
      {/* Station info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
        <img
          src={station.favicon && station.favicon.startsWith('http') ? station.favicon : getPlaceholder(station.name)}
          alt=""
          style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'contain', background: subtle, flexShrink: 0 }}
          onError={e => (e.currentTarget.src = getPlaceholder(station.name))}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {station.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '0.7rem', color: muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {station.country}
            </span>
            {isReconnecting ? (
              <span style={{ 
                fontSize: '0.6rem', background: subtle, color: text, 
                padding: '2px 6px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.05em',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.5s linear infinite' }}>
                   <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                   <polyline points="21 3 21 8 16 8"></polyline>
                </svg>
                RECONNECTING
              </span>
            ) : hasError ? (
              <span style={{ 
                fontSize: '0.6rem', background: isDarkMode ? '#330000' : '#ffebee', color: '#ff4444', 
                padding: '2px 6px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.05em' 
              }}>STREAM FAILED</span>
            ) : null}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => toggleFavorite(station)}
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: '1.05rem',
              color: isFav ? '#f59e0b' : muted,
              padding: '0 4px', transition: 'color 0.15s',
              lineHeight: 1, display: 'flex', alignItems: 'center'
            }}
          >
            {isFav ? '★' : '☆'}
          </button>
          
          <div ref={playlistMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setIsPlaylistMenuOpen(!isPlaylistMenuOpen) }}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '1.2rem', color: muted, padding: '0 4px', lineHeight: 1,
                display: 'flex', alignItems: 'center', opacity: 0.8
              }}
            >
              +
            </button>
            {isPlaylistMenuOpen && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 10px)', left: 0,
                background: isDarkMode ? '#1a1a1a' : '#faf9f7',
                border: `1px solid ${border}`, borderRadius: '12px',
                boxShadow: isDarkMode ? '0 12px 40px rgba(0,0,0,0.9)' : '0 12px 40px rgba(0,0,0,0.06)',
                padding: '8px 0', minWidth: '160px', zIndex: 1100,
              }}>
                <div style={{ padding: '4px 16px 8px', fontSize: '0.7rem', color: muted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Add to Playlist
                </div>
                {playlists.length === 0 ? (
                  <div style={{ padding: '8px 16px', fontSize: '0.75rem', color: muted }}>
                    Use + tab to create one.
                  </div>
                ) : (
                  playlists.map(pl => {
                    const isAdded = pl.stations.some(s => s.stationuuid === station.stationuuid)
                    return (
                      <button
                        key={pl.id}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (toggleStationInPlaylist) toggleStationInPlaylist(pl.id, station); 
                        }}
                        style={{
                          width: '100%', padding: '10px 16px', background: 'transparent', border: 'none',
                          color: isAdded ? '#f59e0b' : text, textAlign: 'left', cursor: 'pointer',
                          fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: isAdded ? 600 : 400,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = subtle}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{pl.name}</span>
                        {isAdded && <span>✓</span>}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        disabled={hasError}
        onClick={() => {
          if (!audioRef.current || hasError) return
          isPlaying ? audioRef.current.pause() : audioRef.current.play()
          setIsPlaying(!isPlaying)
        }}
        style={{
          width: '40px', height: '40px',
          background: isPlaying ? text : 'transparent',
          color: isPlaying ? bg : text,
          border: `1px solid ${isDarkMode ? '#333' : '#ddd'}`,
          borderRadius: '50%',
          cursor: hasError ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.2s', opacity: hasError ? 0.4 : 1
        }}
      >
        {isPlaying ? '■' : '▶'}
      </button>

      {/* Sleep Timer */}
      <div ref={timerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => setIsTimerMenuOpen(!isTimerMenuOpen)}
          style={{
            background: sleepTimer ? text : 'transparent',
            color: sleepTimer ? bg : text,
            border: `1px solid ${isDarkMode ? '#333' : '#ddd'}`,
            borderRadius: sleepTimer ? '18px' : '50%',
            width: sleepTimer ? 'auto' : '36px', minWidth: '36px', height: '36px',
            padding: sleepTimer ? '0 8px' : '0',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0
          }}
          title="Sleep Timer"
        >
          {timeLeft !== null ? (
            timeLeft < 60 ? '<1m' : `${Math.ceil(timeLeft / 60)}m`
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          )}
        </button>

        {isTimerMenuOpen && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 12px)', right: '-10px',
            background: isDarkMode ? '#1a1a1a' : '#faf9f7',
            border: `1px solid ${border}`, borderRadius: '12px',
            boxShadow: isDarkMode ? '0 12px 40px rgba(0,0,0,0.9)' : '0 12px 40px rgba(0,0,0,0.06)',
            padding: '8px 0', minWidth: '140px', zIndex: 1100,
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '4px 16px 8px', fontSize: '0.7rem', color: muted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Sleep Timer
            </div>
            {[15, 30, 45, 60].map(mins => (
              <button
                key={mins}
                onClick={() => { setSleepTimer(mins); setIsTimerMenuOpen(false); }}
                style={{
                  width: '100%', padding: '10px 16px', background: 'transparent',
                  border: 'none', color: sleepTimer === mins ? '#f59e0b' : text,
                  textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem',
                  fontFamily: 'inherit', fontWeight: sleepTimer === mins ? 600 : 400,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = subtle}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {mins} minutes
              </button>
            ))}
            <div style={{ height: '1px', background: border, margin: '4px 0' }} />
            <form onSubmit={handleCustomTimer} style={{ padding: '6px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="number" min="1" placeholder="Mins" 
                value={customTimerInput}
                onChange={e => setCustomTimerInput(e.target.value)}
                style={{ 
                  flex: 1, width: '0', padding: '6px 8px', borderRadius: '6px',
                  border: `1px solid ${border}`, background: isDarkMode ? '#111' : '#fff',
                  color: text, fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none'
                }}
              />
              <button 
                type="submit"
                style={{
                  padding: '6px 12px', background: text, color: bg,
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 600, fontFamily: 'inherit'
                }}
              >Set</button>
            </form>
            <div style={{ height: '1px', background: border, margin: '4px 0' }} />
            <button
              onClick={() => { setSleepTimer(null); setIsTimerMenuOpen(false); }}
              style={{
                width: '100%', padding: '10px 16px', background: 'transparent',
                border: 'none', color: '#f87171', textAlign: 'left', cursor: 'pointer',
                fontSize: '0.85rem', fontFamily: 'inherit', transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = subtle}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Turn Off
            </button>
          </div>
        )}
      </div>

      {/* Volume */}
      <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
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
        onPlay={() => { setIsPlaying(true); setIsReconnecting(false); setHasError(false); }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsReconnecting(true)}
        onPlaying={() => setIsReconnecting(false)}
        onError={() => {
          setHasError(true)
          setIsPlaying(false)
        }}
      />
    </div>
  )
}
