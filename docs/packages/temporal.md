# @cognitive-engine/temporal

Temporal reasoning: recurring behavior patterns, causal chain analysis, and future predictions.

## Install

```bash
npm install @cognitive-engine/temporal
```

## Quick Start

```typescript
import { TemporalEngine } from '@cognitive-engine/temporal'

const temporal = new TemporalEngine(store, llm, {
  lookbackDays: 30,           // How far back to analyze (default: 30)
  minPatternConfidence: 0.5,  // Minimum confidence for patterns (default: 0.5)
})

// Run temporal analysis (call periodically, not per-message)
await temporal.analyze('user-123', episodes)

// Get context for reasoning
const ctx = await temporal.getContext('user-123', recentEpisodes)
```

## Sub-Modules

### PatternDetector

Detects recurring behavior patterns from episodic memory.

```typescript
import { PatternDetector } from '@cognitive-engine/temporal'

const detector = new PatternDetector(store, llm, 30, 0.5)

// Detect patterns from episodes
const patterns = await detector.detect('user-123', episodes)
// [{ type: 'emotional', description: 'Mood drops on Mondays',
//    frequency: 'weekly', confidence: 0.7 }]

// Get active patterns
const active = await detector.getActive('user-123')

// Filter by type
const emotional = await detector.getByType('user-123', 'emotional')

// Decay confidence over time
await detector.decay(pattern.id, 0.8) // multiply confidence by 0.8
```

**Pattern types:** emotional, behavioral, social, temporal, health.

**Frequencies:** daily, weekly, biweekly, monthly, irregular.

### CausalChainBuilder

Finds cause-effect relationships across episodes using LLM analysis.

```typescript
import { CausalChainBuilder } from '@cognitive-engine/temporal'

const builder = new CausalChainBuilder(store, llm)

// Build chains from episodes
const chains = await builder.build('user-123', episodes)
// [{ type: 'stress_cascade', rootCause: 'deadline pressure',
//    links: [...], finalEffect: 'sleep disruption', confidence: 0.6 }]

// Query chains
const all = await builder.getAll('user-123')
const stress = await builder.getByType('user-123', 'stress_cascade')
const deadline = await builder.getByRootCause('user-123', 'deadline')
```

**Chain types:** stress_cascade, positive_spiral, behavioral_loop, external_trigger, other.

### Predictor

Makes predictions about future behavior based on patterns and causal chains.

```typescript
import { Predictor } from '@cognitive-engine/temporal'

const predictor = new Predictor(store, llm)

// Generate predictions
const predictions = await predictor.predict(
  'user-123', patterns, chains, recentEpisodes
)
// [{ type: 'risk', description: 'Likely burnout in 2 weeks',
//    timeframe: '2 weeks', confidence: 0.65,
//    severity: 'high', isWarning: true }]

// Get active warnings
const warnings = await predictor.getWarnings('user-123')

// Resolve and track accuracy
await predictor.resolve(prediction.id, true) // was correct

const accuracy = await predictor.getAccuracy('user-123')
// { total: 12, resolved: 8, correct: 6, accuracy: 0.75 }
```

**Prediction types:** emotional, behavioral, risk, opportunity.

**Severities:** low, medium, high.

## Temporal Context

```typescript
const ctx = await temporal.getContext('user-123', recentEpisodes)
ctx.activePatterns  // BehaviorPattern[] — recurring behaviors
ctx.causalChains    // CausalChain[] — cause-effect relationships
ctx.predictions     // FuturePrediction[] — what might happen next
ctx.warnings        // FuturePrediction[] — high-severity predictions only
ctx.formattedContext // Text summary for system prompt
```
