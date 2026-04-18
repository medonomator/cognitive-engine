# @cognitive-engine/metacognition

[![npm](https://img.shields.io/npm/v/@cognitive-engine/metacognition)](https://www.npmjs.com/package/@cognitive-engine/metacognition)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Self-monitoring and strategy selection for [cognitive-engine](https://github.com/medonomator/cognitive-engine). Confidence assessment, confusion detection, contradiction detection, and cognitive load analysis.

## Install

```bash
npm install @cognitive-engine/metacognition
```

## Components

### MetacognitionService

Top-level self-assessment that evaluates the agent's own cognitive state.

```typescript
import { MetacognitionService } from '@cognitive-engine/metacognition'

const meta = new MetacognitionService()
const assessment = meta.assess(cognitiveState)

assessment.confidence        // 0.72
assessment.cognitiveLoad     // 'moderate'
assessment.contradictions    // [{ belief1: '...', belief2: '...', severity: 0.8 }]
assessment.flags             // ['low_confidence', 'possible_confusion']
assessment.suggestedStrategy // 'clarify_with_user'
```

### Standalone Functions

```typescript
import {
  analyzeCoherence,
  analyzeCognitiveLoad,
  detectContradictions,
} from '@cognitive-engine/metacognition'

// Check if beliefs are internally consistent
const coherence = analyzeCoherence(beliefs)
// 0.85 — mostly consistent

// Assess how much the agent is "thinking about"
const load = analyzeCognitiveLoad(workingMemory)
// { level: 'high', items: 9, capacity: 7, overloaded: true }

// Find contradicting beliefs
const contradictions = detectContradictions(beliefs)
// [{ belief1: 'User prefers brevity', belief2: 'User asked for detailed explanation' }]
```

### StrategyTracker

Tracks which response strategies work best in different contexts.

```typescript
import { StrategyTracker } from '@cognitive-engine/metacognition'

const tracker = new StrategyTracker()
tracker.record({ strategy: 'empathetic', context: 'frustration', outcome: 'positive' })
tracker.record({ strategy: 'direct', context: 'frustration', outcome: 'negative' })

tracker.recommend('frustration')  // 'empathetic'
```

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
