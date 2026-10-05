import { describe, expect, it } from 'vitest'
import { BORDERS } from '../../lib/geo'
import { borderIndex, buildLandDots } from './dots'

describe('buildLandDots', () => {
  const started = performance.now()
  const { positions, ids } = buildLandDots(2)
  const elapsed = performance.now() - started

  it('builds fast enough to do on the main thread at load', () => {
    expect(elapsed).toBeLessThan(600)
    console.log(`buildLandDots: ${ids.length} dots in ${Math.round(elapsed)} ms`)
  })

  it('keeps roughly the land share of the sphere', () => {
    expect(ids.length).toBeGreaterThan(8000)
    expect(ids.length).toBeLessThan(14000)
    expect(positions.length).toBe(ids.length * 3)
  })

  it('puts every dot on the sphere and gives it a valid country', () => {
    for (let i = 0; i < ids.length; i += 97) {
      expect(Math.hypot(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])).toBeCloseTo(2, 4)
      expect(ids[i]).toBeGreaterThanOrEqual(0)
      expect(ids[i]).toBeLessThan(BORDERS.length)
    }
  })

  it('covers a mid-sized country with enough dots to read as a shape', () => {
    const thailand = borderIndex('TH')
    expect(thailand).toBeGreaterThanOrEqual(0)
    expect([...ids].filter(id => id === thailand).length).toBeGreaterThan(25)
  })
})
