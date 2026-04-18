# @cognitive-engine/metacognition

Self-monitoring: confidence assessment, confusion detection, strategy selection.

## Install

```bash
npm install @cognitive-engine/metacognition
```

## Exports

### MetacognitionService

Main self-monitoring service that assesses the agent's cognitive state.

```typescript
import { MetacognitionService } from '@cognitive-engine/metacognition'

const meta = new MetacognitionService(engine)
const assessment = await meta.assess(cognitiveState)
```

### analyzeCoherence

Checks if the agent's beliefs form a consistent, non-contradictory picture.

```typescript
import { analyzeCoherence } from '@cognitive-engine/metacognition'
```

### analyzeCognitiveLoad

Detects when too many contexts are active and the agent may be overwhelmed.

```typescript
import { analyzeCognitiveLoad } from '@cognitive-engine/metacognition'
```

### detectContradictions

Finds beliefs that contradict each other.

```typescript
import { detectContradictions } from '@cognitive-engine/metacognition'
```

### StrategyTracker

Tracks which strategies have been tried and their outcomes to avoid loops.

```typescript
import { StrategyTracker } from '@cognitive-engine/metacognition'
```
