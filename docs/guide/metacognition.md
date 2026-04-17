# Metacognition

Metacognition is thinking about thinking. The metacognition module monitors the agent's own cognitive processes.

## What It Does

- **Contradiction detection** - spots when new beliefs conflict with existing ones
- **Strategy tracking** - notices when the agent is stuck in a loop
- **Cognitive load monitoring** - detects when too many contexts are active
- **Coherence analysis** - checks if the agent's beliefs form a consistent picture

## Usage

```typescript
import { MetacognitionService } from '@cognitive-engine/metacognition'

const meta = new MetacognitionService(engine)
const assessment = await meta.assess(cognitiveState)

if (assessment.flags.length > 0) {
  // The agent detected issues with its own reasoning
  for (const flag of assessment.flags) {
    console.log(flag.type, flag.description)
    // e.g., 'contradiction', 'Belief X conflicts with Belief Y'
    // e.g., 'strategy-loop', 'Same strategy used 3 times without progress'
  }
}
```

## Why It Matters

Without metacognition, agents blindly follow their initial strategy even when it's not working. Metacognition provides the self-awareness to adjust course.
