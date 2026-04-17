# Getting Started

## Installation

```bash
npm install cognitive-engine
```

Or install individual packages:

```bash
npm install @cognitive-engine/core @cognitive-engine/perception @cognitive-engine/memory
```

## Quick Example

```typescript
import { CognitiveOrchestrator, OpenAiLlmProvider, MemoryStore } from 'cognitive-engine'

const engine = {
  llm: new OpenAiLlmProvider({ model: 'gpt-4o-mini' }),
  embedding: new OpenAiEmbeddingProvider(),
  store: new MemoryStore()
}

const agent = new CognitiveOrchestrator({
  engine,
  modules: {
    perception: true,
    episodicMemory: true,
    semanticMemory: true,
    reasoning: true,
    metacognition: true
  }
})

const response = await agent.process('Review this code for security issues')
```

## What Happens Under the Hood

When you call `agent.process()`, the cognitive pipeline runs:

1. **Perception** analyzes the input - extracts entities, intent, emotional tone
2. **Working Memory** pulls relevant context from episodic and semantic memory
3. **Reasoning** forms beliefs, generates intentions, picks a strategy
4. **Metacognition** checks if the strategy makes sense, flags contradictions
5. **Response** is generated using the LLM with full cognitive context

## Requirements

- Node.js >= 20
- TypeScript >= 5.0 (recommended)
- An LLM provider (OpenAI included, or bring your own)
