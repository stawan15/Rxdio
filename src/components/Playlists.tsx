import { useState } from 'react'
import { cn } from '../lib/cn'
import type { Playlist } from '../hooks/useLibrary'
import type { RadioStation } from '../services/radioApi'
import { Dialog } from './Dialog'
import { Icon } from './icons'

function NewPlaylistForm({ onCreate }: { onCreate: (name: string) => Promise<void> | void }) {
  const [name, setName] = useState('')
  return (
    <form
      onSubmit={async e => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) return
        setName('')
        await onCreate(trimmed)
      }}
      className="flex gap-2"
    >
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="New playlist name"
        aria-label="New playlist name"
        maxLength={60}
        className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface-muted px-4 text-base outline-none focus:border-accent"
      />
      <button type="submit" disabled={!name.trim()} className="h-12 shrink-0 cursor-pointer rounded-xl bg-accent px-5 font-bold text-accent-fg disabled:opacity-40">Add</button>
    </form>
  )
}

type PickerProps = {
  station: RadioStation | null
  playlists: Playlist[]
  onToggle: (playlistId: string, station: RadioStation) => void
  onCreate: (name: string) => Promise<Playlist | null>
  onClose: () => void
}

/** "Add to playlist" sheet opened from the player. */
export function PlaylistPicker({ station, playlists, onToggle, onCreate, onClose }: PickerProps) {
  return (
    <Dialog open={station !== null} onClose={onClose} title="Add to playlist">
      {station && (
        <div className="flex flex-col gap-4">
          <p className="-mt-1 truncate text-sm text-foreground-muted">{station.name}</p>
          {playlists.length > 0 && (
            <ul>
              {playlists.map(p => {
                const added = p.stations.some(s => s.stationuuid === station.stationuuid)
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(p.id, station)}
                      aria-pressed={added}
                      className={cn('flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left hover:bg-surface-muted', added && 'bg-selected')}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <span className="text-xs text-foreground-muted">{p.stations.length}</span>
                      {added && <Icon name="check" size={18} className="text-accent" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <NewPlaylistForm onCreate={async name => { const created = await onCreate(name); if (created) onToggle(created.id, station) }} />
        </div>
      )}
    </Dialog>
  )
}

type ManagerProps = {
  open: boolean
  playlists: Playlist[]
  onCreate: (name: string) => Promise<Playlist | null>
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function PlaylistManager({ open, playlists, onCreate, onRename, onDelete, onClose }: ManagerProps) {
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const commit = () => {
    const draft = editing?.draft.trim()
    if (editing && draft) onRename(editing.id, draft)
    setEditing(null)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Playlists">
      <div className="flex flex-col gap-4">
        {playlists.length === 0 && <p className="py-4 text-center text-sm text-foreground-muted">No playlists yet. Create your first one below.</p>}
        <ul className="flex flex-col gap-2">
          {playlists.map(p => (
            <li key={p.id} className="flex items-center gap-1 rounded-2xl border border-border bg-surface-muted pl-4 pr-1">
              {editing?.id === p.id ? (
                <input
                  autoFocus
                  value={editing.draft}
                  onChange={e => setEditing({ id: p.id, draft: e.target.value })}
                  onBlur={commit}
                  onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(null) }}
                  aria-label="Playlist name"
                  maxLength={60}
                  className="h-14 min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
                />
              ) : (
                <span className="min-w-0 flex-1 py-3">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block text-xs text-foreground-muted">{p.stations.length} stations</span>
                </span>
              )}
              <button type="button" onClick={() => setEditing({ id: p.id, draft: p.name })} aria-label={`Rename ${p.name}`} className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-border">
                <Icon name="edit" size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDelete !== p.id) { setConfirmDelete(p.id); return }
                  setConfirmDelete(null)
                  onDelete(p.id)
                }}
                onBlur={() => setConfirmDelete(null)}
                aria-label={confirmDelete === p.id ? `Confirm delete ${p.name}` : `Delete ${p.name}`}
                className={cn('flex h-11 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-bold text-red-500 hover:bg-red-500/10', confirmDelete === p.id && 'bg-red-500 text-white hover:bg-red-500')}
              >
                {confirmDelete === p.id ? 'Delete?' : <Icon name="trash" size={18} />}
              </button>
            </li>
          ))}
        </ul>
        <NewPlaylistForm onCreate={async name => { await onCreate(name) }} />
      </div>
    </Dialog>
  )
}
