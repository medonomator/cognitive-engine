# @cognitive-engine/orchestrator

Master cognitive pipeline: orchestrates all modules into a unified cognitive cycle.

## Install

```bash
npm install @cognitive-engine/orchestrator
```

## Exports

### CognitiveOrchestrator

The main entry point that wires all cognitive modules together and runs the full pipeline.

```typescript
import { CognitiveOrchestrator } from '@cognitive-engine/orchestrator'

const agent = new CognitiveOrchestrator({
  engine: { llm, embedding, store },
  modules: {
    perception: true,
    episodicMemory: true,
    semanticMemory: true,
    reasoning: true,
    metacognition: true,
    mind: true,
    emotional: true,
    social: true,
    temporal: true,
    planning: true,
  }
})

const response = await agent.process(input)
```

Enable only the modules you need. Each disabled module is simply skipped in the pipeline - no overhead.
