# @cognitive-engine/orchestrator

[![npm](https://img.shields.io/npm/v/@cognitive-engine/orchestrator)](https://www.npmjs.com/package/@cognitive-engine/orchestrator)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Master cognitive pipeline for [cognitive-engine](https://github.com/medonomator/cognitive-engine). Orchestrates all modules into a single `process()` call.

## Install

```bash
npm install @cognitive-engine/orchestrator
```

## Usage

### Full Pipeline

```typescript
import { CognitiveOrchestrator } from '@cognitive-engine/orchestrator'
import { OpenAiLlmProvider, OpenAiEmbeddingProvider } from '@cognitive-engine/provider-openai'
import { MemoryStore } from '@cognitive-engine/store-memory'

const engine = new CognitiveOrchestrator({
  llm: new OpenAiLlmProvider({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' }),
  embedding: new OpenAiEmbeddingProvider({ apiKey: process.env.OPENAI_API_KEY }),
  store: new MemoryStore(),
})

const result = await engine.process('user-123', 'I feel stuck on this project')

result.percept.emotionalTone       // 'frustrated'
result.reasoning.intentions        // [{ type: 'empathize', priority: 10 }]
result.emotional.valence           // -0.3
result.social.rapport              // 0.65
result.metacognition.confidence    // 0.72
result.suggestedResponse           // AI-generated empathetic response
```

### Selective Modules

Enable only what you need — disabled modules have zero overhead:

```typescript
const engine = new CognitiveOrchestrator({
  llm, embedding, store,
  modules: {
    perception: true,
    memory: true,
    emotional: true,
    // reasoning, social, planning, etc. — all off
  },
})
```

### With Events

```typescript
import { CognitiveEventEmitter } from '@cognitive-engine/core'

const events = new CognitiveEventEmitter()
events.on('perception:complete', (percept) => analytics.track(percept))
events.on('episode:created', (episode) => console.log('Remembered:', episode.summary))

const engine = new CognitiveOrchestrator({ llm, embedding, store, events })
```

## Pipeline

```
Message → Perception → [Memory + Reasoning] → [Emotional + Social + Mind + Plan + Temporal + Bandit] → Metacognition → Response
```

Modules in brackets run in parallel. The orchestrator manages data flow between stages.

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
