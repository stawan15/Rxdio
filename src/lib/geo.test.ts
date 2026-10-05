import { describe, expect, it } from 'vitest'
import { angularDistance, findCountryAt, latLonToXYZ, nearestCountry, xyzToLatLon } from './geo'
import { subsolarPoint } from './sun'

describe('geo', () => {
  it('round-trips lat/lon through 3D space', () => {
    for (const [lat, lon] of [[13.7, 100.5], [-33.9, 151.2], [64, -22], [0, 180]] as const) {
      const [rLat, rLon] = xyzToLatLon(...latLonToXYZ(lat, lon, 2))
      expect(rLat).toBeCloseTo(lat, 5)
      expect(Math.abs(Math.abs(rLon) - Math.abs(lon)) % 360).toBeLessThan(1e-6)
    }
  })

  it('finds the country under a point', () => {
    expect(findCountryAt(13.7, 100.5)).toBe('TH')
    expect(findCountryAt(47, 2)).toBe('FR')
    expect(findCountryAt(40, -100)).toBe('US')
    expect(findCountryAt(0, -30)).toBeNull()
  })

  it('prefers the enclave over its host country', () => {
    expect(findCountryAt(-29.6, 28.2)).toBe('LS')
  })

  it('snaps to a nearby centroid for islands', () => {
    expect(nearestCountry(1.4, 103.8, ['SG', 'TH'], 4)).toBe('SG')
    expect(nearestCountry(0, -30, ['SG', 'TH'], 4)).toBeNull()
  })

  it('measures great-circle distance in degrees', () => {
    expect(angularDistance([0, 0], [0, 90])).toBeCloseTo(90)
    expect(angularDistance([10, 20], [10, 20])).toBe(0)
  })
})

describe('sun', () => {
  it('is over the tropic of Cancer at the June solstice', () => {
    const [lat, lon] = subsolarPoint(new Date('2026-06-21T12:00:00Z'))
    expect(lat).toBeGreaterThan(22.5)
    expect(lat).toBeLessThan(24)
    expect(Math.abs(lon)).toBeLessThan(5)
  })

  it('moves west as UTC time advances', () => {
    const [, a] = subsolarPoint(new Date('2026-03-20T06:00:00Z'))
    const [, b] = subsolarPoint(new Date('2026-03-20T12:00:00Z'))
    expect(a - b).toBeCloseTo(90, 0)
  })
})
