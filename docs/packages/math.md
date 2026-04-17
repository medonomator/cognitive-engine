# @cognitive-engine/math

Vector operations, linear algebra, and statistical sampling for cognitive-engine.

## Install

```bash
npm install @cognitive-engine/math
```

## Exports

### Vector Operations

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
```

### Matrix Operations

```typescript
import { matVec, outer, subMat, cholesky } from '@cognitive-engine/math'
```

### Statistical Sampling

```typescript
import { sampleStdNormal, sampleMVN, sampleDiagonalMVN } from '@cognitive-engine/math'
```

Used by the bandit package for Thompson Sampling.

### Temporal Utilities

```typescript
import { exponentialDecay, timeDecayWeights, oneHot, binValue, clamp } from '@cognitive-engine/math'
```

Used for memory decay calculations and temporal weighting.
