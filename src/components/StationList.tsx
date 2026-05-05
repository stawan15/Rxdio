import { useState } from 'react'
import { RadioStation } from '../services/radioApi'

export function StationList({ stations, onSelect, loading, selectedStation, isDarkMode, favorites, toggleFavorite, recents, playlists, createPlaylist, renamePlaylist, deletePlaylist }: { 
  stations: RadioStation[], 
  onSelect: (s: RadioStation) => void, 
  loading: boolean,
  selectedStation: RadioStation | null,
  isDarkMode?: boolean,
  favorites: RadioStation[],
  toggleFavorite: (s: RadioStation) => void | Promise<void>,
  recents: RadioStation[],
  playlists: import('../App').Playlist[],
  createPlaylist: (name: string) => void,
  renamePlaylist: (id: string, newName: string) => void,
  deletePlaylist: (id: string) => void
}) {
  const [activeTab, setActiveTab] = useState<string>('all')
  const [isEditingPlaylists, setIsEditingPlaylists] = useState(false)
  const displayStations: RadioStation[] = activeTab === 'all' ? stations 
    : activeTab === 'favs' ? favorites 
    : activeTab === 'recent' ? recents 
    : playlists.find(p => p.id === activeTab)?.stations || [];

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
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${border}` }}>
          
          <div style={{ flex: 1, display: 'flex', gap: '20px', overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {(['all', 'favs', 'recent', ...playlists.map(p => p.id)]).map(tab => {
              const isPl = tab !== 'all' && tab !== 'favs' && tab !== 'recent';
              const plData = isPl ? playlists.find(p => p.id === tab) : null;
              
              return (
                <div key={tab} style={{ 
                  position: 'relative', display: 'flex', alignItems: 'center', gap: '8px',
                  paddingBottom: '14px', marginBottom: '-1px',
                  borderBottom: activeTab === tab ? `2px solid ${text}` : '2px solid transparent',
                  transition: 'border-color 0.2s'
                }}>
                  <button
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: 'transparent', border: 'none', padding: '0',
                      fontFamily: 'inherit', fontWeight: activeTab === tab ? 700 : 500,
                      fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: activeTab === tab ? text : muted,
                      cursor: 'pointer', transition: 'color 0.2s',
                      display: 'flex', alignItems: 'center'
                    }}
                  >
                    {tab === 'all' ? 'Stations' : tab === 'favs' ? 'Saved' : tab === 'recent' ? 'Recent' : plData?.name}
                  </button>
                  
                  {isEditingPlaylists && isPl && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button onClick={() => {
                        const newName = window.prompt('Rename playlist:', plData?.name);
                        if (newName && newName.trim()) renamePlaylist(tab, newName.trim());
                      }} title="Rename" style={{ background:'transparent', border:'1px solid ' + muted, borderRadius: '6px', cursor:'pointer', padding: '0 12px', color: text, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.75rem', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        RENAME
                      </button>
                      <button onClick={() => {
                        if (window.confirm('Delete playlist?')) {
                          deletePlaylist(tab);
                          if (activeTab === tab) setActiveTab('all');
                        }
                      }} title="Delete" style={{ background:'transparent', border:'1px solid #f87171', borderRadius: '6px', cursor:'pointer', padding: '0 12px', color: '#f87171', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.75rem', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        DELETE
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '16px', paddingBottom: '14px', flexShrink: 0 }}>
            {playlists.length > 0 && (
              <button 
                onClick={() => setIsEditingPlaylists(!isEditingPlaylists)}
                style={{ background: 'transparent', border: 'none', padding: 0, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.8rem', color: isEditingPlaylists ? '#f59e0b' : muted, cursor: 'pointer', transition: 'color 0.2s', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isEditingPlaylists ? 'DONE' : 'EDIT'}
              </button>
            )}
            <button
              onClick={() => {
                const name = window.prompt("Enter playlist name:");
                if (name && name.trim()) createPlaylist(name.trim());
              }}
              style={{ background: 'transparent', border: 'none', padding: 0, fontFamily: 'inherit', fontWeight: 700, fontSize: '1.2rem', color: text, cursor: 'pointer', opacity: 0.8, minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              +
            </button>
          </div>
        </div>
        <div style={{ padding: '12px 0', fontSize: '0.72rem', color: muted, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
          {activeTab === 'all' ? (loading ? 'Scanning...' : `${stations.length} active`) 
            : displayStations.length > 0 ? `${displayStations.length} stations` : 'Empty playlist'}
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
