# @cognitive-engine/math

[![npm](https://img.shields.io/npm/v/@cognitive-engine/math)](https://www.npmjs.com/package/@cognitive-engine/math)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Vector operations, linear algebra, and statistical sampling for [cognitive-engine](https://github.com/medonomator/cognitive-engine).

Pure TypeScript, zero dependencies. Usable standalone without any LLM or AI context.

## Install

```bash
npm install @cognitive-engine/math
```

## API

### Vector Operations

```typescript
import {
  cosineSimilarity,
  dotProduct,
  euclideanDistance,
  l2Normalize,
  addVectors,
  scaleVector,
  meanVector,
  weightedMeanVector,
} from '@cognitive-engine/math'

const a = [1, 0, 0]
const b = [0, 1, 0]

cosineSimilarity(a, b)    // 0
dotProduct(a, b)           // 0
euclideanDistance(a, b)     // 1.414...
l2Normalize([3, 4])        // [0.6, 0.8]
addVectors(a, b)           // [1, 1, 0]
scaleVector(a, 2)          // [2, 0, 0]
meanVector([a, b])         // [0.5, 0.5, 0]
```

### Matrix Operations

```typescript
import { matVec, outer, subMat, cholesky } from '@cognitive-engine/math'

matVec([[1, 0], [0, 1]], [3, 4])  // [3, 4]
outer([1, 2], [3, 4])             // [[3, 4], [6, 8]]
```

### Statistical Sampling

```typescript
import { sampleStdNormal, sampleMVN, sampleDiagonalMVN } from '@cognitive-engine/math'

sampleStdNormal()                              // ~N(0, 1)
sampleMVN([0, 0], [[1, 0], [0, 1]])           // 2D multivariate normal
sampleDiagonalMVN([0, 0], [1, 1])             // Faster diagonal covariance
```

### Decay & Encoding

```typescript
import { exponentialDecay, timeDecayWeights, oneHot, binValue, clamp } from '@cognitive-engine/math'

exponentialDecay(1.0, 0.1, 5)     // Value after 5 time steps
timeDecayWeights(10, 0.95)        // Decay weights for 10 items
oneHot(3, 5)                      // [0, 0, 0, 1, 0]
binValue(0.7, 4)                  // Discretize into 4 bins
clamp(15, 0, 10)                  // 10
```

## Used By

This package provides the mathematical foundation for:
- **@cognitive-engine/bandit** — Thompson Sampling with multivariate normal posteriors
- **@cognitive-engine/memory** — Cosine similarity search, decay-based forgetting
- **@cognitive-engine/perception** — Vector similarity for quick analysis
- **@cognitive-engine/social** — Rapport tracking calculations

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
