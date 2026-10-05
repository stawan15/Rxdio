import { centroidOf } from '../lib/centroids'

export interface RadioStation {
  stationuuid: string
  name: string
  url_resolved: string
  homepage: string
  favicon: string
  tags: string
  country: string
  countrycode?: string
  votes: number
  codec: string
  bitrate: number
  lastcheckok: number
  hls?: number
}

export interface Country {
  code: string
  name: string
  stationcount: number
}

const HOSTS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info']
const PAGE_SIZE = 100
const UUID_CHUNK = 50

// https pages can't play http streams (mixed content), so only ask for https there
const httpsOnly = () => location.protocol === 'https:'

async function getJson<T>(path: string, params: Record<string, string> = {}, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams({ hidebroken: 'true', ...(httpsOnly() && { is_https: 'true' }), ...params })
  let lastError: unknown
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}/json${path}?${query}`, { signal })
      if (res.ok) return (await res.json()) as T
      lastError = new Error(`Radio Browser responded ${res.status}`)
    } catch (e) {
      if (signal?.aborted) throw e
      lastError = e
    }
  }
  throw lastError
}

// Stations missing from the Radio Browser directory. `custom-` ids are never sent to the API.
const CUSTOM_STATIONS: RadioStation[] = [
  {
    stationuuid: 'custom-efm94-uuid-1',
    name: 'EFM 94',
    url_resolved: 'https://live.atimemedia.com/efm/live.m3u8',
    homepage: 'https://atime.live/efm',
    favicon: 'https://atime.live/images/v2/logo_efm.png',
    tags: 'pop,thailand',
    country: 'Thailand',
    countrycode: 'TH',
    votes: 9999,
    codec: 'HLS',
    bitrate: 128,
    lastcheckok: 1,
    hls: 1,
  },
]

const isPlayable = (s: RadioStation) => Boolean(s.name?.trim() && s.url_resolved)

export const radioApi = {
  async getCountries(signal?: AbortSignal): Promise<Country[]> {
    const data = await getJson<{ name: string; iso_3166_1: string; stationcount: number }[]>('/countries', {}, signal)
    return data
      .filter(c => c.stationcount > 0 && /^[A-Z]{2}$/.test(c.iso_3166_1))
      .map(c => ({ code: c.iso_3166_1, name: c.name, stationcount: c.stationcount }))
      .sort((a, b) => b.stationcount - a.stationcount)
  },

  async getStationsByCountry(code: string, signal?: AbortSignal): Promise<RadioStation[]> {
    const data = await getJson<RadioStation[]>(
      '/stations/search',
      { countrycode: code, order: 'votes', reverse: 'true', limit: String(PAGE_SIZE) },
      signal,
    )
    const custom = CUSTOM_STATIONS.filter(s => s.countrycode === code)
    return [...custom, ...data.filter(isPlayable)]
  },

  /** A random station from a country we can place on the globe. */
  async getRandomStation(signal?: AbortSignal): Promise<RadioStation | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const [station] = await getJson<RadioStation[]>('/stations/search', { order: 'random', limit: '1' }, signal)
      if (station && isPlayable(station) && station.countrycode && centroidOf(station.countrycode)) return station
    }
    return null
  },

  /** Resolves saved station ids, keeping the requested order. */
  async getStationsByUuids(uuids: string[], signal?: AbortSignal): Promise<RadioStation[]> {
    const apiIds = uuids.filter(id => !id.startsWith('custom-'))
    const found = new Map<string, RadioStation>(CUSTOM_STATIONS.map(s => [s.stationuuid, s]))
    for (let i = 0; i < apiIds.length; i += UUID_CHUNK) {
      const chunk = apiIds.slice(i, i + UUID_CHUNK)
      const data = await getJson<RadioStation[]>('/stations/byuuid', { uuids: chunk.join(',') }, signal)
      for (const s of data) found.set(s.stationuuid, s)
    }
    return uuids.flatMap(id => found.get(id) ?? [])
  },
}
