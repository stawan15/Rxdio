import { useState } from 'react'
import { RadioStation } from '../services/radioApi'

export function StationList({ stations, onSelect, loading, selectedStation, isDarkMode, favorites, toggleFavorite, recents }: { 
  stations: RadioStation[], 
  onSelect: (s: RadioStation) => void, 
  loading: boolean,
  selectedStation: RadioStation | null,
  isDarkMode?: boolean,
  favorites: RadioStation[],
  toggleFavorite: (s: RadioStation) => void | Promise<void>,
  recents: RadioStation[]
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'favs' | 'recent'>('all')
  const displayStations = activeTab === 'favs' ? favorites : activeTab === 'recent' ? recents : stations;

  const bg = isDarkMode ? '#000' : '#faf9f7'
  const border = isDarkMode ? '#1a1a1a' : '#e8e5e0'
  const text = isDarkMode ? '#fff' : '#1a1a1a'
  const muted = isDarkMode ? '#444' : '#9a9590'
  const subtle = isDarkMode ? '#222' : '#f3f1ee'
  const selectedBg = isDarkMode ? '#111' : '#efecea'

  const getPlaceholder = (name: string) => {
    const char = name.charAt(0).toUpperCase()
    return `https://ui-avatars.com/api/?name=${char}&background=${isDarkMode ? '111' : 'f3f1ee'}&color=${isDarkMode ? 'fff' : '1a1a1a'}&bold=true&format=svg`
  }

  return (
    <div className="station-list" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: bg, borderLeft: `1px solid ${border}`,
      width: '340px', fontFamily: 'inherit',
      position: 'relative', zIndex: 10
    }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', gap: '24px', borderBottom: `1px solid ${border}` }}>
          {(['all', 'favs', 'recent'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'transparent', border: 'none', padding: '0 0 14px',
                fontFamily: 'inherit', fontWeight: 500,
                fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                color: activeTab === tab ? text : muted,
                cursor: 'pointer',
                borderBottom: activeTab === tab ? `1px solid ${text}` : '1px solid transparent',
                marginBottom: '-1px', transition: 'color 0.2s',
              }}
            >
              {tab === 'all' ? 'Stations' : tab === 'favs' ? 'Saved' : 'Recent'}
            </button>
          ))}
        </div>
        <div style={{ padding: '12px 0', fontSize: '0.72rem', color: muted, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
          {activeTab === 'favs'
            ? favorites.length > 0 ? `${favorites.length} saved` : 'None saved yet'
            : activeTab === 'recent'
              ? recents.length > 0 ? `${recents.length} recently played` : 'No recent history'
            : loading ? 'Scanning...' : `${stations.length} active`
          }
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px 24px', color: muted, fontSize: '0.8rem', letterSpacing: '0.04em' }}>
            Loading...
          </div>
        ) : displayStations.length === 0 ? (
          <div style={{ padding: '40px 24px', color: muted, fontSize: '0.8rem' }}>
            {activeTab === 'favs' ? 'Star a station to save it.' : 'No stations found.'}
          </div>
        ) : (
          displayStations.map((station, i) => {
            const isSelected = selectedStation?.stationuuid === station.stationuuid
            const isFav = favorites.some(s => s.stationuuid === station.stationuuid)
            return (
              <div
                key={station.stationuuid}
                onClick={() => onSelect(station)}
                style={{
                  padding: '14px 24px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  background: isSelected ? selectedBg : 'transparent',
                  borderBottom: `1px solid ${border}`,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = subtle }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Index number */}
                <span style={{ fontSize: '0.7rem', color: muted, width: '18px', textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {(i + 1).toString().padStart(2, '0')}
                </span>

                {/* Favicon */}
                <img
                  src={station.favicon && station.favicon.startsWith('http') ? station.favicon : getPlaceholder(station.name)}
                  alt=""
                  style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'contain', background: subtle, flexShrink: 0 }}
                  onError={e => (e.currentTarget.src = getPlaceholder(station.name))}
                />

                {/* Name + meta */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                      fontSize: '0.88rem', fontWeight: 500, color: station.lastcheckok === 0 ? muted : text, 
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      textDecoration: station.lastcheckok === 0 ? 'line-through' : 'none'
                    }}>
                      {station.name}
                    </div>
                    {station.lastcheckok === 0 && (
                      <span style={{ 
                        fontSize: '0.55rem', background: isDarkMode ? '#330000' : '#ffebee', color: '#ff4444', 
                        padding: '2px 4px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.05em' 
                      }}>OFFLINE</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: muted, marginTop: '2px', letterSpacing: '0.03em', fontVariantNumeric: 'tabular-nums' }}>
                    {station.codec || 'LIVE'} · {station.bitrate ? `${station.bitrate}k` : '—'}
                  </div>
                </div>

                {/* Star */}
                <button
                  onClick={e => { e.stopPropagation(); e.preventDefault(); toggleFavorite(station) }}
                  style={{
                    flexShrink: 0, background: 'transparent', border: 'none',
                    cursor: 'pointer', fontSize: '1rem',
                    color: isFav ? '#f59e0b' : muted,
                    opacity: isFav ? 1 : 0.6,
                    padding: '6px', pointerEvents: 'all',
                    position: 'relative', zIndex: 20,
                    transition: 'color 0.15s, opacity 0.15s',
                    lineHeight: 1, display: 'flex', alignItems: 'center'
                  }}
                >
                  {isFav ? '★' : '☆'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
