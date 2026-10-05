import { describe, expect, it } from 'vitest'
import { countryNeighbours, countryTones } from './mapColors'

describe('country tones', () => {
  const tones = countryTones()
  const neighbours = countryNeighbours()

  it('finds well-known borders', () => {
    expect(neighbours.get('TH')).toContain('LA')
    expect(neighbours.get('TH')).toContain('MM')
    expect(neighbours.get('FR')).toContain('DE')
    expect(neighbours.get('US')).toContain('CA')
  })

  it('gives neighbouring countries different tones', () => {
    for (const [a, b] of [['TH', 'LA'], ['TH', 'MM'], ['TH', 'KH'], ['FR', 'DE'], ['US', 'MX'], ['ES', 'PT'], ['IN', 'PK']]) {
      expect(tones.get(a)).not.toBe(tones.get(b))
    }
  })

  it('leaves at most a few neighbouring pairs sharing a tone', () => {
    let pairs = 0
    let same = 0
    for (const [code, set] of neighbours) {
      for (const other of set) {
        if (code < other) { pairs++; if (tones.get(code) === tones.get(other)) same++ }
      }
    }
    expect(same / pairs).toBeLessThan(0.03)
  })
})
