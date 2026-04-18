/**
 * L2 (Euclidean) normalization to unit vector.
 * Returns zero vector unchanged.
 */
export function l2Normalize(vec: number[]): number[] {
  let sumSq = 0
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i]! * vec[i]!
  }
  const norm = Math.sqrt(sumSq)
  if (norm === 0) return vec
  const result = new Array<number>(vec.length)
  for (let i = 0; i < vec.length; i++) {
    result[i] = vec[i]! / norm
  }
  return result
}

/**
 * Cosine similarity between two vectors.
 * Returns 0 if vectors have different dimensions or either is zero.
 * Range: [-1, 1]
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (denom === 0) return 0

  return dot / denom
}

/**
 * Dot product of two vectors.
 * Uses the shorter vector's length if dimensions differ.
 */
export function dotProduct(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length)
  let sum = 0
  for (let i = 0; i < len; i++) {
    sum += a[i]! * b[i]!
  }
  return sum
}

/**
 * Arithmetic mean of multiple vectors.
 * All vectors must have the same dimensions.
 */
export function meanVector(vectors: number[][]): number[] {
  if (vectors.length === 0) return []
  const dim = vectors[0]!.length
  const result = new Array<number>(dim).fill(0)

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i]! += vec[i]!
    }
  }

  const n = vectors.length
  for (let i = 0; i < dim; i++) {
    result[i]! /= n
  }
  return result
}

/**
 * Weighted mean of multiple vectors.
 * weights[i] corresponds to vectors[i].
 * Normalizes by sum of weights.
 */
export function weightedMeanVector(
  vectors: number[][],
  weights: number[],
): number[] {
  if (vectors.length === 0 || vectors.length !== weights.length) return []
  const dim = vectors[0]!.length
  const result = new Array<number>(dim).fill(0)

  let totalWeight = 0
  for (let i = 0; i < vectors.length; i++) {
    totalWeight += weights[i]!
  }

  if (totalWeight === 0) return result

  for (let i = 0; i < vectors.length; i++) {
    const w = weights[i]! / totalWeight
    const vec = vectors[i]!
    for (let j = 0; j < dim; j++) {
      result[j]! += vec[j]! * w
    }
  }

  return result
}

/**
 * Euclidean distance between two vectors.
 * Returns Infinity if dimensions differ.
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity
  let sumSq = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i]! - b[i]!
    sumSq += diff * diff
  }
  return Math.sqrt(sumSq)
}

/**
 * Element-wise vector addition.
 * Returns copy of `a` if dimensions differ.
 */
export function addVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length) return [...a]
  const result = new Array<number>(a.length)
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i]! + b[i]!
  }
  return result
}

/**
 * Scalar multiplication of a vector.
 */
export function scaleVector(vec: number[], scalar: number): number[] {
  const result = new Array<number>(vec.length)
  for (let i = 0; i < vec.length; i++) {
    result[i] = vec[i]! * scalar
  }
  return result
}
