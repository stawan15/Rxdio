import borders from '../data/borders.json'
import centroids from '../data/centroids.json'

export type LatLon = readonly [lat: number, lon: number]
type Ring = readonly (readonly [number, number])[]
type Border = { code: string; rings: Ring[]; bbox: [number, number, number, number]; area: number }

const RAD = Math.PI / 180

/** Same axes as three's SphereGeometry, so it lines up with an equirectangular texture. */
export function latLonToXYZ(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * RAD
  const theta = (lon + 180) * RAD
  return [-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)]
}

export function xyzToLatLon(x: number, y: number, z: number): LatLon {
  const r = Math.hypot(x, y, z)
  const lat = 90 - Math.acos(y / r) / RAD
  const lon = ((Math.atan2(z, -x) / RAD - 180 + 540) % 360) - 180
  return [lat, lon]
}

export function angularDistance([lat1, lon1]: LatLon, [lat2, lon2]: LatLon): number {
  const a = Math.sin(((lat2 - lat1) * RAD) / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lon2 - lon1) * RAD) / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(a))) / RAD
}

export const centroidOf = (code: string): LatLon | undefined => (centroids as unknown as Record<string, LatLon>)[code]

export const BORDERS: Border[] = Object.entries(borders as unknown as Record<string, Ring[]>).map(([code, rings]) => {
  const lons = rings.flatMap(r => r.map(p => p[0]))
  const lats = rings.flatMap(r => r.map(p => p[1]))
  const bbox: Border['bbox'] = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
  return { code, rings, bbox, area: (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) }
})

function inRing(ring: Ring, lon: number, lat: number) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Country containing the point; the smallest match wins so enclaves (Lesotho) beat their host. */
export function findCountryAt(lat: number, lon: number): string | null {
  let best: Border | null = null
  for (const b of BORDERS) {
    const [minLon, minLat, maxLon, maxLat] = b.bbox
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue
    if ((!best || b.area < best.area) && b.rings.some(r => inRing(r, lon, lat))) best = b
  }
  return best?.code ?? null
}

/** Nearest centroid within `maxDeg` — catches islands and microstates missing from the border data. */
export function nearestCountry(lat: number, lon: number, codes: Iterable<string>, maxDeg: number): string | null {
  let best: string | null = null
  let bestDist = maxDeg
  for (const code of codes) {
    const c = centroidOf(code)
    if (!c) continue
    const d = angularDistance([lat, lon], c)
    if (d < bestDist) { best = code; bestDist = d }
  }
  return best
}
