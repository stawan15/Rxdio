import { getToken, signOut } from './auth'

export interface LibraryData {
  favorites: string[]
  playlists: { id: string; name: string }[]
  links: { playlistId: string; stationId: string }[]
}

async function call<T = void>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${getToken()}`, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401) signOut() // expired or invalid token
  if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`)
  return (res.status === 204 ? undefined : await res.json()) as T
}

const id = encodeURIComponent

export const libraryApi = {
  load: () => call<LibraryData>('/library'),
  addFavorite: (stationId: string, name: string) => call(`/favorites/${id(stationId)}`, 'PUT', { name }),
  removeFavorite: (stationId: string) => call(`/favorites/${id(stationId)}`, 'DELETE'),
  createPlaylist: (name: string) => call<{ id: string; name: string }>('/playlists', 'POST', { name }),
  renamePlaylist: (playlistId: string, name: string) => call(`/playlists/${id(playlistId)}`, 'PATCH', { name }),
  deletePlaylist: (playlistId: string) => call(`/playlists/${id(playlistId)}`, 'DELETE'),
  addToPlaylist: (playlistId: string, stationId: string) => call(`/playlists/${id(playlistId)}/stations/${id(stationId)}`, 'PUT'),
  removeFromPlaylist: (playlistId: string, stationId: string) => call(`/playlists/${id(playlistId)}/stations/${id(stationId)}`, 'DELETE'),
}
