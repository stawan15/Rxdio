import { useEffect, useRef, useState, useCallback } from 'react'
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
  
  // Responsive / Expanded state
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const getPlaceholder = useCallback((name: string) => {
    const char = name.charAt(0).toUpperCase()
    return `https://ui-avatars.com/api/?name=${char}&background=${isDarkMode ? '111' : 'f3f1ee'}&color=${isDarkMode ? 'fff' : '1a1a1a'}&bold=true&format=png`
  }, [isDarkMode])

  const getArtworkUrl = useCallback((s: RadioStation) => {
    if (!s) return '';
    return s.favicon && s.favicon.startsWith('http') ? s.favicon : getPlaceholder(s.name);
  }, [getPlaceholder])

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

      // --- Media Session API ---
      if ('mediaSession' in navigator) {
        const artworkUrl = getArtworkUrl(station);
          
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
  }, [station, getArtworkUrl])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timerRef.current && !timerRef.current.contains(e.target as Node)) setIsTimerMenuOpen(false)
      if (playlistMenuRef.current && !playlistMenuRef.current.contains(e.target as Node)) setIsPlaylistMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (hasError) timeout = setTimeout(() => retryConnection(), 5000);
    return () => clearTimeout(timeout);
  }, [hasError]);

  useEffect(() => {
    const handleOnline = () => { if (hasError || isReconnecting) retryConnection() };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [hasError, isReconnecting]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // ================= RENDER PART =================

  // Reusable action buttons renderers
  const renderPlayPause = (size: 'small' | 'large' = 'small') => {
    const dim = size === 'large' ? '64px' : '44px'
    const fz = size === 'large' ? '1.4rem' : '0.85rem'
    return (
      <button
        disabled={hasError}
        onClick={(e) => {
          e.stopPropagation()
          if (!audioRef.current || hasError) return
          isPlaying ? audioRef.current.pause() : audioRef.current.play()
          setIsPlaying(!isPlaying)
        }}
        style={{
          width: dim, height: dim,
          background: isPlaying ? text : 'transparent',
          color: isPlaying ? bg : text,
          border: `1px solid ${isDarkMode ? '#333' : '#ddd'}`,
          borderRadius: '50%', cursor: hasError ? 'not-allowed' : 'pointer', 
          fontSize: fz, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.2s', opacity: hasError ? 0.4 : 1
        }}
      >
        {isPlaying ? '■' : '▶'}
      </button>
    )
  }

  const renderTimerMenu = (menuAlign: 'left' | 'right' | 'center' | 'top') => {
    const alignStyles = menuAlign === 'right' ? { right: '0px', bottom: 'calc(100% + 12px)' }
      : menuAlign === 'center' ? { left: '50%', transform: 'translateX(-50%)', bottom: 'calc(100% + 12px)' }
      : menuAlign === 'top' ? { left: '0', bottom: 'calc(100% + 12px)' } 
      : { left: '0', bottom: 'calc(100% + 12px)' }

    return (
      <div ref={timerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <button
          onClick={(e) => { e.stopPropagation(); setIsTimerMenuOpen(!isTimerMenuOpen) }}
          style={{
            background: sleepTimer ? text : 'transparent', color: sleepTimer ? bg : text,
            border: `1px solid ${isDarkMode ? '#333' : '#ddd'}`,
            borderRadius: sleepTimer ? '22px' : '50%',
            width: sleepTimer ? 'auto' : '44px', minWidth: '44px', height: '44px',
            padding: sleepTimer ? '0 12px' : '0',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0
          }}
          title="Sleep Timer"
        >
          {timeLeft !== null ? (timeLeft < 60 ? '<1m' : `${Math.ceil(timeLeft / 60)}m`) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          )}
        </button>

        {isTimerMenuOpen && (
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', ...alignStyles,
            background: isDarkMode ? '#1a1a1a' : '#faf9f7',
            border: `1px solid ${border}`, borderRadius: '12px',
            boxShadow: isDarkMode ? '0 12px 40px rgba(0,0,0,0.9)' : '0 12px 40px rgba(0,0,0,0.06)',
            padding: '8px 0', minWidth: '140px', zIndex: 1100, display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '4px 16px 8px', fontSize: '0.7rem', color: muted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Sleep Timer</div>
            {[15, 30, 45, 60].map(mins => (
              <button
                key={mins} onClick={() => { setSleepTimer(mins); setIsTimerMenuOpen(false); }}
                style={{
                  width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', color: sleepTimer === mins ? '#f59e0b' : text,
                  textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: sleepTimer === mins ? 600 : 400
                }}
              >{mins} minutes</button>
            ))}
            <div style={{ height: '1px', background: border, margin: '4px 0' }} />
            <form onSubmit={handleCustomTimer} style={{ padding: '6px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="number" min="1" placeholder="Mins" value={customTimerInput} onChange={e => setCustomTimerInput(e.target.value)}
                style={{ flex: 1, width: '0', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${border}`, background: isDarkMode ? '#111' : '#fff', color: text, fontSize: '0.8rem', outline: 'none' }} />
              <button type="submit" style={{ padding: '6px 12px', background: text, color: bg, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Set</button>
            </form>
            <div style={{ height: '1px', background: border, margin: '4px 0' }} />
            <button onClick={() => { setSleepTimer(null); setIsTimerMenuOpen(false); }}
              style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', color: '#f87171', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}
            >Turn Off</button>
          </div>
        )}
      </div>
    )
  }

  const renderPlaylistMenu = (menuAlign: 'left' | 'right' | 'center' = 'left') => {
    if (!station) return null;
    const alignStyles = menuAlign === 'center' ? { left: '50%', transform: 'translateX(-50%)' }
      : menuAlign === 'right' ? { right: 0 } : { left: 0 }

    return (
      <div ref={playlistMenuRef} style={{ position: 'relative' }}>
        <button
          onClick={e => { e.stopPropagation(); setIsPlaylistMenuOpen(!isPlaylistMenuOpen) }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: muted, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8, minWidth: '44px', minHeight: '44px' }}
        >+</button>
        {isPlaylistMenuOpen && (
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', bottom: 'calc(100% + 10px)', ...alignStyles,
            background: isDarkMode ? '#1a1a1a' : '#faf9f7', border: `1px solid ${border}`, borderRadius: '12px',
            boxShadow: isDarkMode ? '0 12px 40px rgba(0,0,0,0.9)' : '0 12px 40px rgba(0,0,0,0.06)', padding: '8px 0', minWidth: '160px', zIndex: 1100
          }}>
            <div style={{ padding: '4px 16px 8px', fontSize: '0.7rem', color: muted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Add to Playlist</div>
            {playlists.length === 0 ? (
              <div style={{ padding: '8px 16px', fontSize: '0.75rem', color: muted }}>Use + tab to create one.</div>
            ) : (
              playlists.map(pl => {
                const isAdded = pl.stations.some(s => s.stationuuid === station.stationuuid)
                return (
                  <button
                    key={pl.id}
                    onClick={(e) => { e.stopPropagation(); if (toggleStationInPlaylist) toggleStationInPlaylist(pl.id, station); }}
                    style={{
                      width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', color: isAdded ? '#f59e0b' : text,
                      textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: isAdded ? 600 : 400,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{pl.name}</span>
                    {isAdded && <span>✓</span>}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    )
  }

  const tagIndicator = isReconnecting ? (
    <span style={{ fontSize: '0.6rem', background: subtle, color: text, padding: '2px 6px', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.5s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><polyline points="21 3 21 8 16 8"></polyline>
      </svg>
      RECONNECTING
    </span>
  ) : hasError ? (
    <span style={{ fontSize: '0.6rem', background: isDarkMode ? '#330000' : '#ffebee', color: '#ff4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>STREAM FAILED</span>
  ) : null;


  // Base player styling wrappers
  const glassmorphism = {
    background: isDarkMode ? '#0a0a0a' : '#ffffff',
  }

  const renderPlayer = () => {
    if (!station) {
      return (
        <div className="audio-player empty-player" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 'calc(64px + env(safe-area-inset-bottom))', 
          ...glassmorphism, borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', 
          padding: '0 32px', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 1000
        }}>
          <span style={{ fontSize: '0.75rem', color: muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Select a station to begin</span>
        </div>
      )
    }

    const isFav = favorites.some(s => s.stationuuid === station.stationuuid)
    const artworkUrl = getArtworkUrl(station);

    if (isMobile && !isExpanded) {
      // MINI PLAYER (MOBILE)
      return (
        <div className="audio-player mini-player" onClick={() => setIsExpanded(true)} style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 'calc(64px + env(safe-area-inset-bottom))', 
          ...glassmorphism, borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 1000, cursor: 'pointer', gap: '16px',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.3)'
        }}>
          <img src={artworkUrl} alt="" style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'contain', background: subtle, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{station.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.7rem', color: muted, textTransform: 'uppercase' }}>{station.country}</span>
              {tagIndicator}
            </div>
          </div>
          {renderPlayPause('small')}
        </div>
      )
    }

    if (isMobile && isExpanded) {
      // FULL-SCREEN PLAYER (MOBILE)
      return (
        <div className="audio-player full-player" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: isDarkMode ? 'rgba(5,5,5,0.98)' : 'rgba(250,249,247,0.98)',
          backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          padding: 'env(safe-area-inset-top) 24px calc(32px + env(safe-area-inset-bottom))',
          animation: 'slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}>
          <style>{`
            @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
          
          <button onClick={() => setIsExpanded(false)} style={{ background: 'transparent', border: 'none', color: text, width: '100%', padding: '16px 0', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '40px', height: '5px', background: isDarkMode ? '#444' : '#ccc', borderRadius: '3px' }} />
          </button>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', margin: '2vh 0 4vh' }}>
            <img src={artworkUrl} alt="" style={{ width: '100%', maxWidth: '300px', aspectRatio: '1/1', borderRadius: '12px', objectFit: 'contain', background: subtle, boxShadow: isDarkMode ? '0 20px 50px rgba(0,0,0,0.8)' : '0 20px 50px rgba(0,0,0,0.1)' }} />
          </div>

          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 700, color: text }}>{station.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{station.country}</p>
              {tagIndicator}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '32px' }}>
            <button onClick={() => toggleFavorite(station)} style={{ background: 'transparent', border: 'none', color: isFav ? '#f59e0b' : muted, fontSize: '1.6rem', cursor: 'pointer' }}>
              {isFav ? '★' : '☆'}
            </button>
            {renderPlayPause('large')}
            {renderPlaylistMenu('center')}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
            {renderTimerMenu('top')}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.7rem', color: muted }}>VOL</span>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} style={{ width: '120px', accentColor: text }} />
            </div>
          </div>
        </div>
      )
    }

    // DESKTOP PLAYER (DEFAULT)
    return (
      <div className="audio-player desktop-player" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 'calc(64px + env(safe-area-inset-bottom))', 
        ...glassmorphism, borderTop: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', gap: '16px', zIndex: 1000,
        boxShadow: isDarkMode ? '0 -4px 30px rgba(0,0,0,0.5)' : '0 -4px 30px rgba(0,0,0,0.04)',
        minWidth: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0, maxWidth: '300px' }}>
          <img src={artworkUrl} alt="" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'contain', background: subtle, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{station.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.75rem', color: muted, textTransform: 'uppercase' }}>{station.country}</span>
              {tagIndicator}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flex: 1 }}>
          {renderPlayPause('small')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', flex: 1, flexShrink: 0 }}>
          <button onClick={() => toggleFavorite(station)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: isFav ? '#f59e0b' : muted }}>
            {isFav ? '★' : '☆'}
          </button>
          {renderPlaylistMenu('center')}
          {renderTimerMenu('center')}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: muted, textTransform: 'uppercase' }}>Vol</span>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} style={{ width: '80px', accentColor: text, cursor: 'pointer' }} />
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
        onPlay={() => { setIsPlaying(true); setIsReconnecting(false); setHasError(false); }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsReconnecting(true)}
        onPlaying={() => setIsReconnecting(false)}
        onError={() => {
          setHasError(true)
          setIsPlaying(false)
        }}
      />
      {renderPlayer()}
    </>
  )
}
