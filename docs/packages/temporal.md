# @cognitive-engine/temporal

Temporal reasoning: behavior patterns, causal chains, future predictions.

## Install

```bash
npm install @cognitive-engine/temporal
```

## Exports

### TemporalEngine

Orchestrates all temporal reasoning sub-modules.

```typescript
import { TemporalEngine } from '@cognitive-engine/temporal'

const temporal = new TemporalEngine(engine)
const context = await temporal.analyze(cognitiveState)
```

### PatternDetector

Detects recurring behavior patterns over time.

```typescript
import { PatternDetector } from '@cognitive-engine/temporal'
```

### CausalChainBuilder

Builds causal chains - sequences of events that led to specific outcomes.

```typescript
import { CausalChainBuilder } from '@cognitive-engine/temporal'
```

### Predictor

Makes predictions about future events based on patterns and causal chains.

```typescript
import { Predictor } from '@cognitive-engine/temporal'
```
