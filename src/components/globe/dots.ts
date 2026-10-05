import { BORDERS, findCountryAt, latLonToXYZ } from '../../lib/geo'

const LATTICE = 36_000
const GOLDEN_ANGLE = 137.50776405

/**
 * An even Fibonacci lattice over the sphere, keeping only the points that fall on land.
 * `ids` holds each dot's index into BORDERS so the shader can recolour a whole country.
 */
export function buildLandDots(radius: number) {
  const indexOf = new Map(BORDERS.map((b, i) => [b.code, i]))
  const positions: number[] = []
  const ids: number[] = []
  for (let i = 0; i < LATTICE; i++) {
    const lat = (Math.asin(1 - (2 * (i + 0.5)) / LATTICE) * 180) / Math.PI
    const lon = ((i * GOLDEN_ANGLE) % 360) - 180
    const code = findCountryAt(lat, lon)
    const id = code ? indexOf.get(code) : undefined
    if (id === undefined) continue
    positions.push(...latLonToXYZ(lat, lon, radius))
    ids.push(id)
  }
  return { positions: new Float32Array(positions), ids: new Float32Array(ids) }
}

export const borderIndex = (code: string) => BORDERS.findIndex(b => b.code === code)
