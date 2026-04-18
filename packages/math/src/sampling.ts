import { cholesky, matVec } from './matrix.js'

/**
 * Sample from standard normal distribution N(0, 1)
 * using Box-Muller transform.
 */
export function sampleStdNormal(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/**
 * Sample from multivariate normal distribution N(mu, Sigma).
 * Uses Cholesky decomposition: x = mu + L * z, where L * L^T = Sigma.
 *
 * @param mu - mean vector (n-dimensional)
 * @param Sigma - covariance matrix (n×n, symmetric positive-definite)
 * @returns random sample from the distribution
 */
export function sampleMVN(mu: number[], Sigma: number[][]): number[] {
  const n = mu.length
  const L = cholesky(Sigma)
  const z = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    z[i] = sampleStdNormal()
  }
  const Lz = matVec(L, z)
  const result = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    result[i] = mu[i]! + Lz[i]!
  }
  return result
}

/**
 * Sample from multivariate normal with DIAGONAL covariance.
 * N(mu, diag(sigmaSquared))
 *
 * O(n) instead of O(n³) - critical optimization for Thompson Sampling.
 *
 * For n=1554: ~2,400,000x faster than full Cholesky.
 *
 * @param mu - mean vector
 * @param sigmaSquared - diagonal variance values (NOT standard deviations)
 * @returns random sample
 */
export function sampleDiagonalMVN(
  mu: number[],
  sigmaSquared: number[],
): number[] {
  const n = mu.length
  const result = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const sigma = Math.sqrt(Math.max(sigmaSquared[i] ?? 0, 0))
    result[i] = mu[i]! + sigma * sampleStdNormal()
  }
  return result
}
