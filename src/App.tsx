import { useEffect, useState, useRef } from 'react'
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
  const searchRef = useRef<HTMLDivElement>(null)

  const [favorites, setFavorites] = useState<RadioStation[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('radio_favs') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    localStorage.setItem('radio_favs', JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (station: RadioStation) => {
    setFavorites(prev => {
      const isFav = prev.some(s => s.stationuuid === station.stationuuid)
      if (isFav) return prev.filter(s => s.stationuuid !== station.stationuuid)
      return [...prev, station]
    })
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    document.title = selectedStation ? `Rxdio - ${selectedStation.name}` : `Rxdio`
  }, [selectedStation])

  const theme = {
    wrapperBg: isDarkMode ? '#000' : '#f0f2f5',
    bg: isDarkMode ? '#0a0a0a' : '#fff',
    text: isDarkMode ? '#fff' : '#111',
    headerBg: isDarkMode ? '#0f0f0f' : '#fff',
    border: isDarkMode ? '#222' : '#eaeaea',
    inputBg: isDarkMode ? '#1a1a1a' : '#f4f5f7',
    buttonBg: isDarkMode ? '#fff' : '#111',
    buttonText: isDarkMode ? '#111' : '#fff'
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
      width: '100vw', height: '100vh', background: theme.bg, color: theme.text, 
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'background 0.3s, color 0.3s'
    }}>
      {/* Top Navigation */}
      <header style={{ 
        height: '70px', padding: '0 30px', display: 'flex', alignItems: 'center', 
        justifyContent: 'space-between', borderBottom: `1px solid ${theme.border}`,
        background: theme.headerBg, zIndex: 100, transition: 'all 0.3s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div title="Rxdio Logo" style={{ width: '32px', height: '32px', background: theme.text, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.bg, fontWeight: 'bold', letterSpacing: '-0.5px', transition: 'all 0.3s' }}>Rx</div>
          <div style={{ fontWeight: 600, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>Rxdio</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{ 
              background: 'transparent', border: 'none', color: theme.text, 
              cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center',
              padding: '8px', borderRadius: '50%'
            }}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          
          <div className="search-bar" ref={searchRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: theme.inputBg, padding: '8px 16px', borderRadius: '30px', border: `1px solid ${theme.border}`, transition: 'all 0.3s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text"
                placeholder={selectedCountry}
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsDropdownOpen(true)
                }}
                style={{ background: 'transparent', color: theme.text, border: 'none', outline: 'none', fontSize: '0.85rem', width: '130px', fontFamily: 'inherit' }}
              />
            </div>
            
            {isDropdownOpen && (
              <div className="dropdown-menu" style={{ 
                position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '220px',
                background: theme.headerBg, border: `1px solid ${theme.border}`, borderRadius: '12px', 
                boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.8)' : '0 10px 30px rgba(0,0,0,0.1)', 
                maxHeight: '300px', overflowY: 'auto', zIndex: 1000 
              }}>
                {(() => {
                  const filtered = countries
                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a, b) => a.name.localeCompare(b.name));
                  
                  if (filtered.length === 0) return <div style={{ padding: '16px', fontSize: '0.85rem', color: theme.text, opacity: 0.5, textAlign: 'center' }}>No countries found</div>;
                    
                  const grouped = {
                    Asia: filtered.filter(c => getContinent(c.name) === 'Asia'),
                    Europe: filtered.filter(c => getContinent(c.name) === 'Europe'),
                    Other: filtered.filter(c => getContinent(c.name) === 'Other'),
                  }
                  
                  return Object.entries(grouped).map(([continent, items]) => {
                    if (items.length === 0) return null;
                    return (
                      <div key={continent}>
                        <div style={{ padding: '8px 16px', fontSize: '0.65rem', fontWeight: 600, color: theme.text, opacity: 0.4, letterSpacing: '1px', textTransform: 'uppercase', background: theme.bg }}>
                          {continent}
                        </div>
                        {items.map(c => (
                          <div 
                            key={c.name} 
                            onClick={() => {
                              setSelectedCountry(c.name)
                              setSearchQuery('')
                              setIsDropdownOpen(false)
                            }}
                            style={{ 
                              padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem', 
                              borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = theme.inputBg}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span>{c.name}</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.3 }}>{c.stationcount}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
          
          <button 
            title="Play a random radio station"
            onClick={handleSurprise}
            style={{ 
              background: theme.buttonBg, color: theme.buttonText, border: 'none', padding: '8px 16px', 
              borderRadius: '6px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'inherit', fontSize: '0.9rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            Surprise Me
          </button>

          <button 
            onClick={() => supabase.auth.signOut()}
            style={{ 
              background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', 
              borderRadius: '6px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'inherit', fontSize: '0.9rem'
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="main-content" style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        
        {/* Globe Viewport */}
        <div className="globe-container" style={{ flex: 1, position: 'relative', background: theme.bg }}>
          <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
            <Globe onSelectCountry={setSelectedCountry} isDarkMode={isDarkMode} />
          </Canvas>
          
          {/* Overlay Info */}
          <div style={{ position: 'absolute', bottom: '40px', left: '40px', pointerEvents: 'none' }}>
            <div style={{ fontSize: '3rem', fontWeight: 600, color: theme.text, letterSpacing: '-1px' }}>{selectedCountry}</div>
          </div>
        </div>

        {/* Sidebar Station List */}
        <StationList 
          stations={stations} 
          loading={loading} 
          onSelect={setSelectedStation} 
          selectedStation={selectedStation}
          isDarkMode={isDarkMode}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
        />
      </div>

      {/* Persistent Audio Player */}
      <AudioPlayer 
        station={selectedStation} 
        isDarkMode={isDarkMode} 
        favorites={favorites}
        toggleFavorite={toggleFavorite}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
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
        }
      `}</style>
    </div>
  )
}

export default App
