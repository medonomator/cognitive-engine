/**
 * Matrix-vector multiplication: A * x
 * A is m×n, x is n×1, result is m×1
 */
export function matVec(A: number[][], x: number[]): number[] {
  const m = A.length
  const result = new Array<number>(m)
  for (let i = 0; i < m; i++) {
    const row = A[i]!
    let sum = 0
    const len = Math.min(row.length, x.length)
    for (let j = 0; j < len; j++) {
      sum += row[j]! * x[j]!
    }
    result[i] = sum
  }
  return result
}

/**
 * Outer product: u * v^T
 * Returns (m × n) matrix where m=len(u), n=len(v)
 */
export function outer(u: number[], v: number[]): number[][] {
  const m = u.length
  const n = v.length
  const result = new Array<number[]>(m)
  for (let i = 0; i < m; i++) {
    result[i] = new Array<number>(n)
    for (let j = 0; j < n; j++) {
      result[i]![j] = u[i]! * v[j]!
    }
  }
  return result
}

/**
 * Element-wise matrix subtraction: A - B
 */
export function subMat(A: number[][], B: number[][]): number[][] {
  const m = A.length
  const result = new Array<number[]>(m)
  for (let i = 0; i < m; i++) {
    const rowA = A[i]!
    const rowB = B[i]!
    const n = rowA.length
    result[i] = new Array<number>(n)
    for (let j = 0; j < n; j++) {
      result[i]![j] = rowA[j]! - (rowB[j] ?? 0)
    }
  }
  return result
}

/**
 * Cholesky decomposition: S = L * L^T
 * Input must be symmetric positive-definite.
 * Returns lower triangular matrix L.
 * Includes numerical stabilization (min sqrt value: 1e-6).
 */
export function cholesky(S: number[][]): number[][] {
  const n = S.length
  const L: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  )

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0
      for (let k = 0; k < j; k++) {
        sum += L[i]![k]! * L[j]![k]!
      }
      if (i === j) {
        const val = (S[i]![i] ?? 0) - sum
        L[i]![j] = Math.sqrt(Math.max(val, 1e-12))
      } else {
        const ljj = L[j]![j]!
        L[i]![j] = ljj > 1e-6 ? ((S[i]![j] ?? 0) - sum) / ljj : 0
      }
    }
  }

  return L
}
