# @cognitive-engine/math

Pure TypeScript mathematical foundations — no LLM calls, no external dependencies. Used throughout cognitive-engine for vector operations, statistical sampling, and temporal calculations.

## Install

```bash
npm install @cognitive-engine/math
```

## Vector Operations

Core building blocks for similarity search, memory retrieval, and embedding manipulation.

```typescript
import {
  l2Normalize,
  cosineSimilarity,
  dotProduct,
  meanVector,
  weightedMeanVector,
  euclideanDistance,
  addVectors,
  scaleVector,
} from '@cognitive-engine/math'

// Normalize embedding to unit vector
const unit = l2Normalize([3, 4]) // [0.6, 0.8]

// Compare two embeddings
const sim = cosineSimilarity(embeddingA, embeddingB) // -1 to 1

// Blend multiple memory vectors with recency weighting
const blended = weightedMeanVector(
  [recentMemory, olderMemory],
  [0.8, 0.2]
)

// Distance between two points in embedding space
const dist = euclideanDistance(a, b)
```

## Matrix Operations

Linear algebra primitives used by the bandit package for Bayesian posterior updates.

```typescript
import { matVec, outer, subMat, cholesky } from '@cognitive-engine/math'

// Matrix-vector multiplication
const result = matVec(A, x) // A * x

// Outer product (rank-1 update for covariance matrices)
const update = outer(u, v) // u * v^T

// Element-wise matrix subtraction
const diff = subMat(A, B)

// Cholesky decomposition (for sampling from multivariate normal)
// Includes numerical stabilization for near-singular matrices
const L = cholesky(covarianceMatrix)
```

## Statistical Sampling

Random sampling functions powering Thompson Sampling in the bandit module.

```typescript
import {
  sampleStdNormal,
  sampleMVN,
  sampleDiagonalMVN,
} from '@cognitive-engine/math'

// Standard normal sample (Box-Muller transform)
const z = sampleStdNormal() // ~N(0, 1)

// Multivariate normal — full covariance
const sample = sampleMVN(mu, Sigma) // ~N(mu, Sigma)

// Diagonal covariance — O(n) optimized for Thompson Sampling
// Use this when dimensions are independent (default in bandit)
const fast = sampleDiagonalMVN(mu, sigmaSquared)
```

## Temporal Utilities

Time-aware weighting for memory decay, feature encoding, and value clamping.

```typescript
import {
  exponentialDecay,
  timeDecayWeights,
  oneHot,
  binValue,
  clamp,
} from '@cognitive-engine/math'

// How much weight should a 24-hour-old memory get?
const weight = exponentialDecay(24) // ~0.49 (lambda=0.03)
const fresh = exponentialDecay(1)   // ~0.97

// Decay weights for a batch of timestamped memories
const weights = timeDecayWeights(
  [episode1.createdAt, episode2.createdAt],
  0.03 // lambda — higher = faster decay
)

// Feature encoding for bandit context vectors
const intent = oneHot(2, 5) // [0, 0, 1, 0, 0]
const urgency = binValue(0.7, [0, 0.3, 0.6, 0.9]) // [0, 0, 1, 0]

// Safe value clamping
const priority = clamp(rawScore, 0, 1)
```
