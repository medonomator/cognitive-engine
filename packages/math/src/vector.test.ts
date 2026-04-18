import { describe, it, expect } from 'vitest'
import {
  l2Normalize,
  cosineSimilarity,
  dotProduct,
  meanVector,
  weightedMeanVector,
  euclideanDistance,
  addVectors,
  scaleVector,
} from './vector.js'

describe('l2Normalize', () => {
  it('normalizes a vector to unit length', () => {
    const result = l2Normalize([3, 4])
    expect(result[0]).toBeCloseTo(0.6)
    expect(result[1]).toBeCloseTo(0.8)
  })

  it('returns zero vector unchanged', () => {
    expect(l2Normalize([0, 0, 0])).toEqual([0, 0, 0])
  })

  it('returns unit vector for single-element vector', () => {
    const result = l2Normalize([5])
    expect(result[0]).toBeCloseTo(1)
  })
})

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('returns 0 for dimension mismatch', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0)
  })

  it('returns 0 for zero vectors', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0)
  })

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0)
  })
})

describe('dotProduct', () => {
  it('computes dot product correctly', () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32)
  })

  it('handles different lengths (uses shorter)', () => {
    expect(dotProduct([1, 2], [3, 4, 5])).toBe(11)
  })
})

describe('meanVector', () => {
  it('computes arithmetic mean', () => {
    const result = meanVector([[2, 4], [6, 8]])
    expect(result).toEqual([4, 6])
  })

  it('returns empty for empty input', () => {
    expect(meanVector([])).toEqual([])
  })
})

describe('weightedMeanVector', () => {
  it('computes weighted average', () => {
    const result = weightedMeanVector(
      [[0, 0], [10, 10]],
      [1, 1],
    )
    expect(result).toEqual([5, 5])
  })

  it('weights correctly', () => {
    const result = weightedMeanVector(
      [[0, 0], [10, 10]],
      [3, 1],
    )
    expect(result[0]).toBeCloseTo(2.5)
    expect(result[1]).toBeCloseTo(2.5)
  })

  it('returns empty for mismatched lengths', () => {
    expect(weightedMeanVector([[1]], [1, 2])).toEqual([])
  })

  it('returns zeros when all weights are zero', () => {
    expect(weightedMeanVector([[1, 2]], [0])).toEqual([0, 0])
  })
})

describe('euclideanDistance', () => {
  it('computes distance correctly', () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBeCloseTo(5)
  })

  it('returns 0 for identical vectors', () => {
    expect(euclideanDistance([1, 2], [1, 2])).toBe(0)
  })

  it('returns Infinity for dimension mismatch', () => {
    expect(euclideanDistance([1], [1, 2])).toBe(Infinity)
  })
})

describe('addVectors', () => {
  it('adds element-wise', () => {
    expect(addVectors([1, 2], [3, 4])).toEqual([4, 6])
  })

  it('returns copy of a for dimension mismatch', () => {
    expect(addVectors([1, 2], [3])).toEqual([1, 2])
  })
})

describe('scaleVector', () => {
  it('scales by scalar', () => {
    expect(scaleVector([1, 2, 3], 2)).toEqual([2, 4, 6])
  })

  it('handles zero scalar', () => {
    expect(scaleVector([1, 2], 0)).toEqual([0, 0])
  })
})
