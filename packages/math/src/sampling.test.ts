import { describe, it, expect } from 'vitest'
import { sampleStdNormal, sampleMVN, sampleDiagonalMVN } from './sampling.js'

describe('sampleStdNormal', () => {
  it('returns a finite number', () => {
    const val = sampleStdNormal()
    expect(Number.isFinite(val)).toBe(true)
  })

  it('samples are roughly centered around 0', () => {
    const N = 10_000
    let sum = 0
    for (let i = 0; i < N; i++) {
      sum += sampleStdNormal()
    }
    const mean = sum / N
    expect(Math.abs(mean)).toBeLessThan(0.1)
  })
})

describe('sampleMVN', () => {
  it('returns vector of correct dimensions', () => {
    const mu = [0, 0]
    const Sigma = [[1, 0], [0, 1]]
    const sample = sampleMVN(mu, Sigma)
    expect(sample).toHaveLength(2)
    expect(Number.isFinite(sample[0])).toBe(true)
    expect(Number.isFinite(sample[1])).toBe(true)
  })

  it('mean of many samples is close to mu', () => {
    const mu = [5, -3]
    const Sigma = [[1, 0], [0, 1]]
    const N = 5_000
    const sum = [0, 0]
    for (let i = 0; i < N; i++) {
      const s = sampleMVN(mu, Sigma)
      sum[0] += s[0]!
      sum[1] += s[1]!
    }
    expect(sum[0] / N).toBeCloseTo(5, 0)
    expect(sum[1] / N).toBeCloseTo(-3, 0)
  })
})

describe('sampleDiagonalMVN', () => {
  it('returns vector of correct dimensions', () => {
    const sample = sampleDiagonalMVN([0, 0, 0], [1, 1, 1])
    expect(sample).toHaveLength(3)
  })

  it('mean of many samples is close to mu', () => {
    const mu = [10, -5]
    const sigma2 = [0.01, 0.01]
    const N = 1_000
    const sum = [0, 0]
    for (let i = 0; i < N; i++) {
      const s = sampleDiagonalMVN(mu, sigma2)
      sum[0] += s[0]!
      sum[1] += s[1]!
    }
    expect(sum[0] / N).toBeCloseTo(10, 0)
    expect(sum[1] / N).toBeCloseTo(-5, 0)
  })

  it('handles zero variance (deterministic)', () => {
    const sample = sampleDiagonalMVN([3, 7], [0, 0])
    expect(sample[0]).toBe(3)
    expect(sample[1]).toBe(7)
  })
})
