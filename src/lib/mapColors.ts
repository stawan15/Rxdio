import { BORDERS } from './geo'

/** Which countries touch each other, found by shared border vertices (the data is topologically clean). */
export function countryNeighbours(): Map<string, Set<string>> {
  const owners = new Map<string, Set<string>>()
  for (const { code, rings } of BORDERS) {
    for (const ring of rings) {
      for (const [lon, lat] of ring) {
        const key = `${lon},${lat}`
        const set = owners.get(key) ?? new Set<string>()
        set.add(code)
        owners.set(key, set)
      }
    }
  }
  const neighbours = new Map<string, Set<string>>(BORDERS.map(b => [b.code, new Set<string>()]))
  for (const touching of owners.values()) {
    if (touching.size < 2) continue
    for (const a of touching) for (const b of touching) if (a !== b) neighbours.get(a)?.add(b)
  }
  return neighbours
}

let cached: Map<string, number> | undefined

/** One of `tones` shades per country so neighbours differ (greedy colouring, most-connected first). */
export function countryTones(tones = 4): Map<string, number> {
  if (cached) return cached
  const neighbours = countryNeighbours()
  const order = [...neighbours.keys()].sort((a, b) => (neighbours.get(b)?.size ?? 0) - (neighbours.get(a)?.size ?? 0))
  const result = new Map<string, number>()
  for (const code of order) {
    const used = new Array<number>(tones).fill(0)
    for (const n of neighbours.get(code) ?? []) {
      const tone = result.get(n)
      if (tone !== undefined) used[tone]++
    }
    result.set(code, used.indexOf(Math.min(...used))) // a free tone if any, otherwise the least-used one
  }
  cached = result
  return result
}
