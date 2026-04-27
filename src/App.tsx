import { useEffect, useState, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Globe } from './components/Globe'
import { radioApi, RadioStation } from './services/radioApi'
import { StationList } from './components/StationList'
import { AudioPlayer } from './components/AudioPlayer'
import { supabase } from './services/supabaseClient'
import { Auth } from './components/Auth'
import { Session } from '@supabase/supabase-js'

const ASIA = new Set(['afghanistan','armenia','azerbaijan','bahrain','bangladesh','bhutan','brunei','cambodia','china','cyprus','georgia','india','indonesia','iran','iraq','israel','japan','jordan','kazakhstan','kuwait','kyrgyzstan','laos','lebanon','malaysia','maldives','mongolia','myanmar','nepal','north korea','oman','pakistan','palestine','philippines','qatar','saudi arabia','singapore','south korea','sri lanka','syria','taiwan','tajikistan','thailand','timor-leste','turkey','turkmenistan','united arab emirates','uzbekistan','vietnam','yemen'])
const EUROPE = new Set(['albania','andorra','austria','belarus','belgium','bosnia and herzegovina','bulgaria','croatia','czech republic','denmark','estonia','finland','france','germany','greece','hungary','iceland','ireland','italy','kosovo','latvia','liechtenstein','lithuania','luxembourg','malta','moldova','monaco','montenegro','netherlands','north macedonia','norway','poland','portugal','romania','russia','san marino','serbia','slovakia','slovenia','spain','sweden','switzerland','ukraine','united kingdom','vatican city'])

function getContinent(name: string) {
  const n = name.toLowerCase();
  if (ASIA.has(n)) return 'Asia';
  if (EUROPE.has(n)) return 'Europe';
  return 'Other';
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [stations, setStations] = useState<RadioStation[]>([])
  const [countries, setCountries] = useState<{ name: string; stationcount: number }[]>([])
  const [selectedCountry, setSelectedCountry] = useState('Thailand')
  const [loading, setLoading] = useState(false)
  const [selectedStation, setSelectedStation] = useState<RadioStation | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [favorites, setFavorites] = useState<RadioStation[]>([])
  const [recents, setRecents] = useState<RadioStation[]>([])

  // Load recents
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rxdio_recents')
      if (stored) setRecents(JSON.parse(stored))
    } catch (e) {
      console.error('Failed to load recents', e)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setFavorites([]) // clear on logout
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load favorites from Supabase when session is ready
  useEffect(() => {
    if (!session) return
    const loadFavorites = async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('station_id')
        .eq('user_id', session.user.id)
      if (error) { console.error('Failed to load favorites:', error); return }
      if (!data || data.length === 0) { setFavorites([]); return }
      const uuids = data.map((row: { station_id: string }) => row.station_id)
      const stations = await radioApi.getStationsByUuids(uuids)
      setFavorites(stations)
    }
    loadFavorites()
  }, [session])

  const toggleFavorite = useCallback(async (station: RadioStation) => {
    if (!session) return
    const isFav = favorites.some(s => s.stationuuid === station.stationuuid)

    // Optimistic local update first — always show visual response immediately
    if (isFav) {
      setFavorites(prev => prev.filter(s => s.stationuuid !== station.stationuuid))
      supabase.from('favorites').delete()
        .eq('user_id', session.user.id)
        .eq('station_id', station.stationuuid)
        .then(({ error }) => {
          if (error) console.error('Failed to remove favorite:', error)
        })
    } else {
      setFavorites(prev => [...prev, station])
      supabase.from('favorites')
        .insert({ user_id: session.user.id, station_id: station.stationuuid, station_name: station.name })
        .then(({ error }) => {
          if (error) console.error('Failed to add favorite:', error)
        })
    }
  }, [session, favorites])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
      // Assuming naive handling for nav menu if click is outside (this can be improved but doing broad close)
      const target = event.target as Element
      if (!target.closest('.nav-menu-container')) {
        setIsNavMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    document.title = selectedStation ? `Rxdio - ${selectedStation.name}` : `Rxdio`
    
    // Add to recents when selected
    if (selectedStation) {
      setRecents(prev => {
        const filtered = prev.filter(s => s.stationuuid !== selectedStation.stationuuid)
        const updated = [selectedStation, ...filtered].slice(0, 20)
        try { localStorage.setItem('rxdio_recents', JSON.stringify(updated)) } catch (e) {}
        return updated
      })
    }
  }, [selectedStation])

  const theme = {
    bg: isDarkMode ? '#000' : '#fff',
    text: isDarkMode ? '#fff' : '#000',
    border: isDarkMode ? '#1a1a1a' : '#eaeaea',
    muted: isDarkMode ? '#444' : '#bbb',
    inputBg: isDarkMode ? '#111' : '#f5f5f5',
    headerBg: isDarkMode ? '#000' : '#fff',
  }

  useEffect(() => {
    radioApi.getCountries().then(setCountries)
  }, [])

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
    if (s) {
      setSelectedCountry(s.country)
      setSelectedStation(s)
    }
    setLoading(false)
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className="app-container" style={{
      width: '100vw', height: '100vh',
      background: theme.bg, color: theme.text,
      fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* ══ Header ══ */}
      <header style={{
        height: 'calc(56px + env(safe-area-inset-top))', 
        padding: 'env(safe-area-inset-top) 28px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.border}`,
        background: theme.headerBg, zIndex: 100, flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', background: theme.text,
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.bg, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '-0.3px',
          }}>Rx</div>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.2px' }}>Rxdio</span>
        </div>

        {/* Nav actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Country search */}
          <div className="search-bar" ref={searchRef} style={{ position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: theme.inputBg, padding: '6px 14px',
              borderRadius: '6px', border: `1px solid ${theme.border}`, transition: 'all 0.2s',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder={selectedCountry}
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={e => { setSearchQuery(e.target.value); setIsDropdownOpen(true) }}
                style={{
                  background: 'transparent', color: theme.text,
                  border: 'none', outline: 'none',
                  fontSize: '0.8rem', width: '120px', fontFamily: 'inherit',
                }}
              />
            </div>

            {isDropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: '220px',
                background: theme.headerBg, border: `1px solid ${theme.border}`,
                borderRadius: '10px',
                boxShadow: isDarkMode ? '0 12px 40px rgba(0,0,0,0.9)' : '0 8px 24px rgba(0,0,0,0.08)',
                maxHeight: '300px', overflowY: 'auto', zIndex: 1000,
              }}>
                {(() => {
                  const filtered = countries
                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a, b) => a.name.localeCompare(b.name));
                  if (filtered.length === 0) return (
                    <div style={{ padding: '16px', fontSize: '0.8rem', color: theme.muted, textAlign: 'center' }}>No results</div>
                  );
                  const grouped = {
                    Asia: filtered.filter(c => getContinent(c.name) === 'Asia'),
                    Europe: filtered.filter(c => getContinent(c.name) === 'Europe'),
                    Other: filtered.filter(c => getContinent(c.name) === 'Other'),
                  }
                  return Object.entries(grouped).map(([continent, items]) => {
                    if (items.length === 0) return null;
                    return (
                      <div key={continent}>
                        <div style={{
                          padding: '8px 14px 4px',
                          fontSize: '0.6rem', fontWeight: 600,
                          color: theme.muted, letterSpacing: '0.1em', textTransform: 'uppercase',
                        }}>{continent}</div>
                        {items.map(c => (
                          <div
                            key={c.name}
                            onClick={() => { setSelectedCountry(c.name); setSearchQuery(''); setIsDropdownOpen(false) }}
                            style={{
                              padding: '9px 14px', cursor: 'pointer', fontSize: '0.82rem',
                              borderBottom: `1px solid ${theme.border}`,
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = theme.inputBg}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span>{c.name}</span>
                            <span style={{ fontSize: '0.65rem', color: theme.muted }}>{c.stationcount}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>

           {/* Mobile Search Toggle */}
          <button
            className="mobile-search-toggle"
            onClick={() => setIsMobileSearchOpen(true)}
            style={{
              background: 'transparent', border: `1px solid ${theme.border}`,
              color: theme.text, padding: '6px 10px',
              borderRadius: '6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>

          {/* Surprise */}
          <button
            onClick={handleSurprise}
            style={{
              background: theme.text, color: theme.bg,
              border: 'none', padding: '6px 14px',
              borderRadius: '6px', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '0.78rem',
              letterSpacing: '0.04em', transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Shuffle
          </button>

          {/* Hamburger Menu (Theme & Sign Out) */}
          <div className="nav-menu-container" style={{ position: 'relative' }}>
            <button
              onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
              style={{
                background: 'transparent', border: `1px solid ${theme.border}`,
                color: theme.muted, padding: '6px 10px',
                borderRadius: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = theme.text; e.currentTarget.style.borderColor = theme.text }}
              onMouseLeave={e => { e.currentTarget.style.color = theme.muted; e.currentTarget.style.borderColor = theme.border }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            
            {isNavMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: '160px',
                background: theme.headerBg, border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                boxShadow: isDarkMode ? '0 12px 40px rgba(0,0,0,0.9)' : '0 8px 24px rgba(0,0,0,0.08)',
                zIndex: 1000, overflow: 'hidden'
              }}>
                <button
                  onClick={() => { setIsDarkMode(!isDarkMode); setIsNavMenuOpen(false); }}
                  style={{
                    width: '100%', padding: '12px 16px', background: 'transparent', border: 'none',
                    borderBottom: `1px solid ${theme.border}`, textAlign: 'left', outline: 'none',
                    color: theme.text, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = theme.inputBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={() => supabase.auth.signOut()}
                  style={{
                    width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', outline: 'none',
                    textAlign: 'left', color: '#ff4444', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? '#330000' : '#ffebee'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══ Main ══ */}
      <div className="main-content" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Globe */}
        <div className="globe-container" style={{ flex: 1, position: 'relative', background: theme.bg }}>
          <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
            <Globe onSelectCountry={setSelectedCountry} isDarkMode={isDarkMode} selectedStation={selectedStation} />
          </Canvas>

          {/* Modern Minimal Playing Banner */}
          {selectedStation && (
            <div style={{
              position: 'absolute', top: '24px', left: '24px',
              padding: '14px 22px',
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              borderLeft: '2px solid #00ff88',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              borderRight: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '2px', // Sharp
              display: 'flex', flexDirection: 'column', gap: '2px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              zIndex: 5,
              pointerEvents: 'none',
              maxWidth: '320px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ 
                  fontSize: '9px', fontWeight: 600, letterSpacing: '0.15em', 
                  textTransform: 'uppercase', color: '#00ff88', opacity: 0.8 
                }}>
                  ● Live Data
                </span>
              </div>
              <div style={{ 
                fontSize: '15px', fontWeight: 600, color: '#fff', 
                letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
              }}>
                {selectedStation.name}
              </div>
              <div style={{ 
                fontSize: '10px', color: 'rgba(255,255,255,0.4)', 
                letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '2px' 
              }}>
                {selectedStation.country} / {selectedStation.codec || 'MP3'}
              </div>
            </div>
          )}

          {/* Country label */}
          <div style={{ position: 'absolute', bottom: '36px', left: '36px', pointerEvents: 'none' }}>
            <div style={{
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              fontWeight: 700, color: theme.text,
              letterSpacing: '-0.03em', lineHeight: 1,
            }}>
              {selectedCountry}
            </div>
            {!loading && stations.length > 0 && (
              <div style={{
                marginTop: '8px', fontSize: '0.72rem', color: theme.muted,
                letterSpacing: '0.08em', textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums',
              }}>
                {stations.length} stations
              </div>
            )}
          </div>
        </div>

        {/* Station list */}
        <StationList
          stations={stations}
          loading={loading}
          onSelect={setSelectedStation}
          selectedStation={selectedStation}
          isDarkMode={isDarkMode}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          recents={recents}
        />
      </div>

      {/* ══ Player ══ */}
      <AudioPlayer
        station={selectedStation}
        isDarkMode={isDarkMode}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #000;
        }
        ::-webkit-scrollbar { display: none; }
        * { box-sizing: border-box; scrollbar-width: none; }
        
        @media (max-width: 768px) {
          .main-content {
            flex-direction: column !important;
          }
          .station-list {
            width: 100% !important;
            height: 45% !important;
            border-left: none !important;
            border-top: 1px solid ${theme.border} !important;
          }
          .globe-container {
            height: 55% !important;
          }
          .search-bar {
            display: none !important;
          }
          .mobile-search-toggle {
            display: flex !important;
          }
          .audio-player {
            padding: 0 16px !important;
            gap: 12px !important;
            height: calc(85px + env(safe-area-inset-bottom)) !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
        }
        .mobile-search-toggle {
          display: none;
        }
      `}</style>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: theme.bg, zIndex: 9999,
          padding: 'calc(16px + env(safe-area-inset-top)) 16px 16px',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: theme.inputBg,
              padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
              <input
                autoFocus
                type="text"
                placeholder="Search country..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', color: theme.text, border: 'none', outline: 'none', width: '100%', fontSize: '1rem', fontFamily: 'inherit' }}
              />
            </div>
            <button
              onClick={() => setIsMobileSearchOpen(false)}
              style={{ background: 'transparent', color: theme.text, border: 'none', padding: '10px', fontSize: '1rem', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {(() => {
              const filtered = countries.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
              if (filtered.length === 0) return <div style={{ padding: '20px', textAlign: 'center', color: theme.muted }}>No countries found</div>;
              return filtered.map(c => (
                <div
                  key={c.name}
                  onClick={() => { setSelectedCountry(c.name); setIsMobileSearchOpen(false); setSearchQuery(''); }}
                  style={{ padding: '16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', color: theme.text, fontSize: '1rem' }}
                >
                  {c.name} <span style={{ color: theme.muted, fontSize: '0.8rem' }}>{c.stationcount} stn</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
