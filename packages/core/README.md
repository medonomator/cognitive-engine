# @cognitive-engine/core

[![npm](https://img.shields.io/npm/v/@cognitive-engine/core)](https://www.npmjs.com/package/@cognitive-engine/core)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Core types, interfaces, and event system for [cognitive-engine](https://github.com/medonomator/cognitive-engine).

This package defines the foundational contracts that all other packages implement — LLM providers, stores, cognitive state, and the event emitter.

## Install

```bash
npm install @cognitive-engine/core
```

## Key Exports

### Interfaces

| Interface | Purpose |
|-----------|---------|
| `LlmProvider` | Abstract LLM — `complete()` and `completeJson()` |
| `EmbeddingProvider` | Abstract embeddings — `embed()` and `embedBatch()` |
| `Store` | Abstract storage — CRUD + optional `vectorSearch()` |
| `BanditStorage` | Persistence for Thompson Sampling state |

### Types

| Type | Description |
|------|-------------|
| `Percept` | Structured perception result (emotions, urgency, intent) |
| `CognitiveState` | Full snapshot of an agent's cognitive state |
| `BeliefSource` | Where a belief came from (perception, inference, memory) |
| `Entity` | Named entity extracted from text |
| `Intention` | BDI intention with type, priority, and reason |
| `Episode` | Episodic memory record |
| `Fact` | Semantic memory fact with confidence |
| `Plan` | Goal decomposition with steps |
| `EmotionalState` | VAD (Valence-Arousal-Dominance) vector |
| `SocialContext` | Rapport, boundaries, preferences |
| `MetacognitiveFlag` | Self-assessment signal |

### Events

```typescript
import { CognitiveEventEmitter } from '@cognitive-engine/core'

const events = new CognitiveEventEmitter()
events.on('perception:complete', (percept) => { /* ... */ })
events.on('episode:created', (episode) => { /* ... */ })
events.on('reasoning:complete', (result) => { /* ... */ })
```

### Utilities

```typescript
import { uid } from '@cognitive-engine/core'

const id = uid() // Short unique ID
```

## Custom Provider Example

```typescript
import type { LlmProvider, LlmResponse } from '@cognitive-engine/core'

class AnthropicProvider implements LlmProvider {
  async complete(messages, options?): Promise<LlmResponse> {
    // Call Anthropic API
    return { content: '...', usage: { promptTokens: 0, completionTokens: 0 }, finishReason: 'stop' }
  }

  async completeJson(messages, options?) {
    const response = await this.complete(messages, options)
    return { ...response, parsed: JSON.parse(response.content) }
  }
}
```

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
