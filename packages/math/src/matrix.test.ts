import { describe, it, expect } from 'vitest'
import { matVec, outer, subMat, cholesky } from './matrix.js'

describe('matVec', () => {
  it('multiplies matrix by vector', () => {
    const A = [[1, 2], [3, 4]]
    const x = [5, 6]
    expect(matVec(A, x)).toEqual([17, 39])
  })

  it('handles non-square matrix', () => {
    const A = [[1, 2, 3]]
    const x = [1, 1, 1]
    expect(matVec(A, x)).toEqual([6])
  })
})

describe('outer', () => {
  it('computes outer product', () => {
    const result = outer([1, 2], [3, 4])
    expect(result).toEqual([[3, 4], [6, 8]])
  })
})

describe('subMat', () => {
  it('subtracts element-wise', () => {
    const A = [[5, 6], [7, 8]]
    const B = [[1, 2], [3, 4]]
    expect(subMat(A, B)).toEqual([[4, 4], [4, 4]])
  })
})

describe('cholesky', () => {
  it('decomposes identity matrix', () => {
    const I = [[1, 0], [0, 1]]
    const L = cholesky(I)
    expect(L[0]![0]).toBeCloseTo(1)
    expect(L[0]![1]).toBeCloseTo(0)
    expect(L[1]![0]).toBeCloseTo(0)
    expect(L[1]![1]).toBeCloseTo(1)
  })

  it('decomposes a positive-definite matrix', () => {
    // S = [[4, 2], [2, 3]]
    // L should be [[2, 0], [1, sqrt(2)]]
    const S = [[4, 2], [2, 3]]
    const L = cholesky(S)
    expect(L[0]![0]).toBeCloseTo(2)
    expect(L[0]![1]).toBeCloseTo(0)
    expect(L[1]![0]).toBeCloseTo(1)
    expect(L[1]![1]).toBeCloseTo(Math.sqrt(2))
  })

  it('reconstructs original matrix: L * L^T = S', () => {
    const S = [[4, 2], [2, 3]]
    const L = cholesky(S)

    // Verify L * L^T ≈ S
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        let val = 0
        for (let k = 0; k < 2; k++) {
          val += L[i]![k]! * L[j]![k]!
        }
        expect(val).toBeCloseTo(S[i]![j]!)
      }
    }
  })
})
