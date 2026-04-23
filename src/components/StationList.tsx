import { useState } from 'react'
import { RadioStation } from '../services/radioApi'

export function StationList({ stations, onSelect, loading, selectedStation, isDarkMode, favorites, toggleFavorite }: { 
  stations: RadioStation[], 
  onSelect: (s: RadioStation) => void, 
  loading: boolean,
  selectedStation: RadioStation | null,
  isDarkMode?: boolean,
  favorites: RadioStation[],
  toggleFavorite: (s: RadioStation) => void | Promise<void>
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'favs'>('all')
  const displayStations = activeTab === 'favs' ? favorites : stations;
  const theme = {
    bg: isDarkMode ? '#0a0a0a' : '#fff',
    border: isDarkMode ? '#222' : '#eaeaea',
    text: isDarkMode ? '#fff' : '#111',
    subText: isDarkMode ? '#aaa' : '#666',
    hoverBg: isDarkMode ? '#111' : '#fcfcfc',
    selectedBg: isDarkMode ? '#1a1a1a' : '#f9f9f9',
    imgBg: isDarkMode ? '#222' : '#f5f5f5'
  }

  const getPlaceholder = (name: string) => {
    const char = name.charAt(0).toUpperCase()
    return `https://ui-avatars.com/api/?name=${char}&background=${isDarkMode ? '222' : 'f0f0f0'}&color=${isDarkMode ? 'fff' : '333'}&bold=true&format=svg`
  }

  return (
    <div className="station-list" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: theme.bg,
      borderLeft: `1px solid ${theme.border}`,
      width: '350px',
      fontFamily: 'inherit',
      transition: 'all 0.3s ease',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{ padding: '24px 24px 0', borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <button 
            onClick={() => setActiveTab('all')}
            style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '1.2rem', fontWeight: 600, color: activeTab === 'all' ? theme.text : theme.subText, cursor: 'pointer', transition: 'color 0.2s', letterSpacing: '-0.3px', fontFamily: 'inherit' }}
          >Stations</button>
          <button 
            onClick={() => setActiveTab('favs')}
            style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '1.2rem', fontWeight: 600, color: activeTab === 'favs' ? theme.text : theme.subText, cursor: 'pointer', transition: 'color 0.2s', letterSpacing: '-0.3px', fontFamily: 'inherit' }}
          >Favorites</button>
        </div>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: theme.subText }}>
          {activeTab === 'favs' ? (favorites.length > 0 ? `${favorites.length} saved stations` : 'No stations saved yet') : (loading ? 'Scanning...' : `${stations.length} active nodes`)}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
            Loading streams...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {displayStations.map((station) => (
              <div 
                key={station.stationuuid}
                onClick={() => onSelect(station)}
                style={{
                  padding: '16px 24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  background: selectedStation?.stationuuid === station.stationuuid ? theme.selectedBg : 'transparent',
                  borderBottom: `1px solid ${theme.border}`,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedStation?.stationuuid !== station.stationuuid) {
                    e.currentTarget.style.background = theme.hoverBg
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedStation?.stationuuid !== station.stationuuid) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <img 
                  src={station.favicon && station.favicon.startsWith('http') ? station.favicon : getPlaceholder(station.name)} 
                  alt="" 
                  style={{ minWidth: '44px', width: '44px', height: '44px', borderRadius: '8px', objectFit: 'contain', background: theme.imgBg, border: `1px solid ${theme.border}` }}
                  onError={(e) => (e.currentTarget.src = getPlaceholder(station.name))}
                />
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.95rem', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {station.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: theme.subText, marginTop: '4px' }}>
                    {station.codec || 'Live'} • {station.bitrate ? `${station.bitrate} kbps` : 'Auto'}
                  </div>
                </div>
                <button 
                  title={favorites.some(s => s.stationuuid === station.stationuuid) ? 'Remove from Favorites' : 'Add to Favorites'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(station)
                  }}
                  style={{
                    marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: '1.2rem', color: favorites.some(s => s.stationuuid === station.stationuuid) ? '#ffd700' : theme.text,
                    opacity: favorites.some(s => s.stationuuid === station.stationuuid) ? 1 : 0.4,
                    transition: 'all 0.2s', padding: '4px', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {favorites.some(s => s.stationuuid === station.stationuuid) ? '★' : '☆'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
