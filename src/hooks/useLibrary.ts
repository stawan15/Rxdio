import { useCallback, useEffect, useMemo, useState } from 'react'
import { libraryApi } from '../services/libraryApi'
import { radioApi, type RadioStation } from '../services/radioApi'
import { readStorage, writeStorage } from '../lib/storage'

export interface Playlist {
  id: string
  name: string
  stations: RadioStation[]
}

const RECENTS_KEY = 'rxdio_recents'
const MAX_RECENTS = 20

/**
 * Favorites and playlists (stored in D1 via /api, signed-in users) plus recents (localStorage).
 * Writes are optimistic; a failed write rolls back and reports through `onError`.
 */
export function useLibrary(userId: string | undefined, onError: (message: string) => void) {
  const [favorites, setFavorites] = useState<RadioStation[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [recents, setRecents] = useState<RadioStation[]>(() => readStorage(RECENTS_KEY, []))

  useEffect(() => {
    if (!userId) { setFavorites([]); setPlaylists([]); return }
    let cancelled = false
    ;(async () => {
      const library = await libraryApi.load()
      const ids = [...new Set([...library.favorites, ...library.links.map(l => l.stationId)])]
      const byId = new Map((await radioApi.getStationsByUuids(ids)).map(s => [s.stationuuid, s]))
      if (cancelled) return

      const pick = (stationIds: string[]) => stationIds.flatMap(id => byId.get(id) ?? [])
      setFavorites(pick(library.favorites))
      setPlaylists(library.playlists.map(p => ({
        ...p,
        stations: pick(library.links.filter(l => l.playlistId === p.id).map(l => l.stationId)),
      })))
    })().catch(() => { if (!cancelled) onError('Could not load your library') })
    return () => { cancelled = true }
  }, [userId, onError])

  const favoriteIds = useMemo(() => new Set(favorites.map(s => s.stationuuid)), [favorites])

  const toggleFavorite = useCallback(async (station: RadioStation) => {
    if (!userId) return
    const remove = favoriteIds.has(station.stationuuid)
    const apply = (add: boolean) => setFavorites(prev => add ? [...prev, station] : prev.filter(s => s.stationuuid !== station.stationuuid))
    apply(!remove)
    try {
      await (remove ? libraryApi.removeFavorite(station.stationuuid) : libraryApi.addFavorite(station.stationuuid, station.name))
    } catch {
      apply(remove)
      onError('Could not update favorites')
    }
  }, [userId, favoriteIds, onError])

  const createPlaylist = useCallback(async (name: string) => {
    if (!userId) return null
    try {
      const playlist: Playlist = { ...(await libraryApi.createPlaylist(name)), stations: [] }
      setPlaylists(prev => [...prev, playlist])
      return playlist
    } catch {
      onError('Could not create playlist')
      return null
    }
  }, [userId, onError])

  const renamePlaylist = useCallback(async (id: string, name: string) => {
    if (!userId) return
    const previous = playlists.find(p => p.id === id)?.name
    const apply = (value: string) => setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: value } : p))
    apply(name)
    try {
      await libraryApi.renamePlaylist(id, name)
    } catch {
      if (previous) apply(previous)
      onError('Could not rename playlist')
    }
  }, [userId, playlists, onError])

  const deletePlaylist = useCallback(async (id: string) => {
    if (!userId) return
    const removed = playlists.find(p => p.id === id)
    setPlaylists(prev => prev.filter(p => p.id !== id))
    try {
      await libraryApi.deletePlaylist(id)
    } catch {
      if (removed) setPlaylists(prev => [...prev, removed])
      onError('Could not delete playlist')
    }
  }, [userId, playlists, onError])

  const toggleStationInPlaylist = useCallback(async (playlistId: string, station: RadioStation) => {
    if (!userId) return
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) return
    const remove = playlist.stations.some(s => s.stationuuid === station.stationuuid)
    const apply = (add: boolean) => setPlaylists(prev => prev.map(p => p.id !== playlistId ? p : {
      ...p,
      stations: add ? [...p.stations, station] : p.stations.filter(s => s.stationuuid !== station.stationuuid),
    }))
    apply(!remove)
    try {
      await (remove ? libraryApi.removeFromPlaylist(playlistId, station.stationuuid) : libraryApi.addToPlaylist(playlistId, station.stationuuid))
    } catch {
      apply(remove)
      onError('Could not update playlist')
    }
  }, [userId, playlists, onError])

  const addRecent = useCallback((station: RadioStation) => {
    setRecents(prev => {
      const next = [station, ...prev.filter(s => s.stationuuid !== station.stationuuid)].slice(0, MAX_RECENTS)
      writeStorage(RECENTS_KEY, next)
      return next
    })
  }, [])

  return { favorites, favoriteIds, toggleFavorite, playlists, createPlaylist, renamePlaylist, deletePlaylist, toggleStationInPlaylist, recents, addRecent }
}
