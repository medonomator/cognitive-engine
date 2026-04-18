# @cognitive-engine/temporal

[![npm](https://img.shields.io/npm/v/@cognitive-engine/temporal)](https://www.npmjs.com/package/@cognitive-engine/temporal)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Temporal reasoning for [cognitive-engine](https://github.com/medonomator/cognitive-engine). Detects behavior patterns, builds causal chains, and makes predictions.

## Install

```bash
npm install @cognitive-engine/temporal
```

## Components

### TemporalEngine

Coordinates all temporal reasoning capabilities.

```typescript
import { TemporalEngine } from '@cognitive-engine/temporal'

const temporal = new TemporalEngine()
const analysis = temporal.analyze(interactionHistory)

analysis.patterns      // Detected behavioral patterns
analysis.causalChains  // Cause-effect relationships
analysis.predictions   // Predicted future states
```

### PatternDetector

Finds recurring patterns in user behavior over time.

```typescript
import { PatternDetector } from '@cognitive-engine/temporal'

const detector = new PatternDetector()
detector.observe({ time: '09:00', action: 'ask_question', topic: 'code' })
detector.observe({ time: '09:15', action: 'ask_question', topic: 'code' })
// ...

const patterns = detector.detect()
// [{ pattern: 'morning_coding_questions', confidence: 0.85, frequency: 'daily' }]
```

### CausalChainBuilder

Builds chains of cause-and-effect from observed events.

```typescript
import { CausalChainBuilder } from '@cognitive-engine/temporal'

const builder = new CausalChainBuilder()
builder.addEvent('deadline_mentioned', { emotion: 'anxious' })
builder.addEvent('task_added', { follows: 'deadline_mentioned', emotion: 'stressed' })

const chains = builder.getChains()
// [{ cause: 'deadline_mentioned', effect: 'stress_increase', strength: 0.8 }]
```

### Predictor

Uses detected patterns and causal chains to predict future states.

```typescript
import { Predictor } from '@cognitive-engine/temporal'

const predictor = new Predictor(patterns, causalChains)
const prediction = predictor.predict(currentState)
// { likely: 'user_will_ask_about_deployment', confidence: 0.7 }
```

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
