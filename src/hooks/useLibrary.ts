import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { radioApi, type RadioStation } from '../services/radioApi'
import { readStorage, writeStorage } from '../lib/storage'

export interface Playlist {
  id: string
  name: string
  stations: RadioStation[]
}

const RECENTS_KEY = 'rxdio_recents'
const MAX_RECENTS = 20
const UNIQUE_VIOLATION = '23505'

/**
 * Favorites, playlists (Supabase, signed-in users) and recents (localStorage).
 * Writes are optimistic; a failed write rolls back and reports through `onError`.
 */
export function useLibrary(userId: string | undefined, onError: (message: string) => void) {
  const [favorites, setFavorites] = useState<RadioStation[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [recents, setRecents] = useState<RadioStation[]>(() => readStorage(RECENTS_KEY, []))

  useEffect(() => {
    if (!supabase || !userId) { setFavorites([]); setPlaylists([]); return }
    let cancelled = false
    ;(async () => {
      const [favs, lists, links] = await Promise.all([
        supabase.from('favorites').select('station_id').eq('user_id', userId).order('created_at'),
        supabase.from('playlists').select('id, name').eq('user_id', userId).order('created_at'),
        supabase.from('playlist_stations').select('playlist_id, station_id').eq('user_id', userId).order('created_at'),
      ])
      if (favs.error || lists.error || links.error) throw favs.error ?? lists.error ?? links.error

      const ids = [...new Set([...favs.data.map(r => r.station_id), ...links.data.map(r => r.station_id)])]
      const byId = new Map((await radioApi.getStationsByUuids(ids)).map(s => [s.stationuuid, s]))
      if (cancelled) return

      const pick = (stationIds: string[]) => stationIds.flatMap(id => byId.get(id) ?? [])
      setFavorites(pick(favs.data.map(r => r.station_id)))
      setPlaylists(lists.data.map(p => ({
        id: p.id,
        name: p.name,
        stations: pick(links.data.filter(l => l.playlist_id === p.id).map(l => l.station_id)),
      })))
    })().catch(() => { if (!cancelled) onError('Could not load your library') })
    return () => { cancelled = true }
  }, [userId, onError])

  const favoriteIds = useMemo(() => new Set(favorites.map(s => s.stationuuid)), [favorites])

  const toggleFavorite = useCallback(async (station: RadioStation) => {
    if (!supabase || !userId) return
    const remove = favoriteIds.has(station.stationuuid)
    setFavorites(prev => remove ? prev.filter(s => s.stationuuid !== station.stationuuid) : [...prev, station])
    const { error } = remove
      ? await supabase.from('favorites').delete().eq('user_id', userId).eq('station_id', station.stationuuid)
      : await supabase.from('favorites').insert({ user_id: userId, station_id: station.stationuuid, station_name: station.name })
    if (error && error.code !== UNIQUE_VIOLATION) {
      setFavorites(prev => remove ? [...prev, station] : prev.filter(s => s.stationuuid !== station.stationuuid))
      onError('Could not update favorites')
    }
  }, [userId, favoriteIds, onError])

  const createPlaylist = useCallback(async (name: string) => {
    if (!supabase || !userId) return null
    const { data, error } = await supabase.from('playlists').insert({ user_id: userId, name }).select('id, name').single()
    if (error) { onError('Could not create playlist'); return null }
    const playlist: Playlist = { id: data.id, name: data.name, stations: [] }
    setPlaylists(prev => [...prev, playlist])
    return playlist
  }, [userId, onError])

  const renamePlaylist = useCallback(async (id: string, name: string) => {
    if (!supabase || !userId) return
    const previous = playlists.find(p => p.id === id)?.name
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name } : p))
    const { error } = await supabase.from('playlists').update({ name }).eq('id', id).eq('user_id', userId)
    if (error) {
      setPlaylists(prev => prev.map(p => p.id === id && previous ? { ...p, name: previous } : p))
      onError('Could not rename playlist')
    }
  }, [userId, playlists, onError])

  const deletePlaylist = useCallback(async (id: string) => {
    if (!supabase || !userId) return
    const removed = playlists.find(p => p.id === id)
    setPlaylists(prev => prev.filter(p => p.id !== id))
    const { error } = await supabase.from('playlists').delete().eq('id', id).eq('user_id', userId)
    if (error && removed) {
      setPlaylists(prev => [...prev, removed])
      onError('Could not delete playlist')
    }
  }, [userId, playlists, onError])

  const toggleStationInPlaylist = useCallback(async (playlistId: string, station: RadioStation) => {
    if (!supabase || !userId) return
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) return
    const remove = playlist.stations.some(s => s.stationuuid === station.stationuuid)
    const apply = (add: boolean) => setPlaylists(prev => prev.map(p => p.id !== playlistId ? p : {
      ...p,
      stations: add ? [...p.stations, station] : p.stations.filter(s => s.stationuuid !== station.stationuuid),
    }))
    apply(!remove)
    const { error } = remove
      ? await supabase.from('playlist_stations').delete().eq('playlist_id', playlistId).eq('station_id', station.stationuuid).eq('user_id', userId)
      : await supabase.from('playlist_stations').insert({ playlist_id: playlistId, user_id: userId, station_id: station.stationuuid })
    if (error && error.code !== UNIQUE_VIOLATION) {
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
