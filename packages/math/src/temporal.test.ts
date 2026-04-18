import { describe, it, expect } from 'vitest'
import { exponentialDecay, timeDecayWeights, oneHot, binValue } from './temporal.js'

describe('exponentialDecay', () => {
  it('returns 1 for 0 hours ago', () => {
    expect(exponentialDecay(0)).toBe(1)
  })

  it('decays over time', () => {
    const w1 = exponentialDecay(1)
    const w24 = exponentialDecay(24)
    const w72 = exponentialDecay(72)

    expect(w1).toBeCloseTo(0.97, 1)
    expect(w24).toBeCloseTo(0.49, 1)
    expect(w72).toBeLessThan(0.15)

    // Monotonically decreasing
    expect(w1).toBeGreaterThan(w24)
    expect(w24).toBeGreaterThan(w72)
  })

  it('handles negative hours (clamps to 0)', () => {
    expect(exponentialDecay(-5)).toBe(1)
  })

  it('uses custom lambda', () => {
    // Fast decay
    expect(exponentialDecay(1, 1)).toBeCloseTo(Math.exp(-1))
    // No decay
    expect(exponentialDecay(100, 0)).toBe(1)
  })
})

describe('timeDecayWeights', () => {
  it('assigns higher weight to more recent timestamps', () => {
    const now = new Date('2026-04-11T12:00:00Z')
    const timestamps = [
      new Date('2026-04-11T11:00:00Z'), // 1 hour ago
      new Date('2026-04-10T12:00:00Z'), // 24 hours ago
      new Date('2026-04-08T12:00:00Z'), // 72 hours ago
    ]
    const weights = timeDecayWeights(timestamps, 0.03, now)

    expect(weights).toHaveLength(3)
    expect(weights[0]).toBeGreaterThan(weights[1]!)
    expect(weights[1]).toBeGreaterThan(weights[2]!)
  })
})

describe('oneHot', () => {
  it('creates correct one-hot vector', () => {
    expect(oneHot(0, 4)).toEqual([1, 0, 0, 0])
    expect(oneHot(2, 4)).toEqual([0, 0, 1, 0])
    expect(oneHot(3, 4)).toEqual([0, 0, 0, 1])
  })

  it('returns all zeros for out-of-range index', () => {
    expect(oneHot(-1, 3)).toEqual([0, 0, 0])
    expect(oneHot(5, 3)).toEqual([0, 0, 0])
  })
})

describe('binValue', () => {
  it('bins values correctly', () => {
    // bins: [5, 30] -> 3 buckets: <5, 5-30, >30
    expect(binValue(2, [5, 30])).toEqual([1, 0, 0])
    expect(binValue(10, [5, 30])).toEqual([0, 1, 0])
    expect(binValue(50, [5, 30])).toEqual([0, 0, 1])
  })

  it('handles boundary values', () => {
    expect(binValue(5, [5, 30])).toEqual([0, 1, 0])
    expect(binValue(30, [5, 30])).toEqual([0, 0, 1])
  })
})
