# cognitive-engine

> Not just memory. A mind.

Pure TypeScript library for building AI agents with real cognitive capabilities — perception, memory, reasoning, emotions, social awareness, and adaptive learning.

**Provider-agnostic**: works with any LLM and any storage backend via simple interfaces.

## Install

```bash
npm install cognitive-engine
```

Or use individual packages:

```bash
npm install @cognitive-engine/perception @cognitive-engine/bandit
```

## What It Does

Most AI libraries just wrap API calls. Cognitive Engine gives your agent actual cognitive abilities:

| Module | What it does |
|--------|-------------|
| **Perception** | Dual-mode message analysis — emotions, urgency, intent, entities |
| **Reasoning** | BDI (Beliefs-Desires-Intentions) with Bayesian belief updates |
| **Episodic Memory** | Store & recall interactions with semantic search and natural forgetting |
| **Semantic Memory** | Knowledge graph of facts with confidence tracking |
| **Emotional Model** | VAD (Valence-Arousal-Dominance) tracking, volatility detection |
| **Social Model** | Rapport, boundaries, communication preferences |
| **Mind** | Self-reflection, relationship tracking, open loops |
| **Temporal** | Behavior patterns, causal chains, predictions |
| **Planning** | Goal decomposition and plan tracking |
| **Metacognition** | Self-assessment, contradiction detection, strategy selection |
| **Bandit** | Thompson Sampling — learns what works per user |
| **Orchestrator** | Composes all modules into a single `process()` call |

## Quick Start

### Full orchestrator (all modules)

```typescript
import {
  CognitiveOrchestrator,
  OpenAiLlmProvider,
  OpenAiEmbeddingProvider,
  MemoryStore,
} from 'cognitive-engine'

const engine = new CognitiveOrchestrator({
  llm: new OpenAiLlmProvider({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' }),
  embedding: new OpenAiEmbeddingProvider({ apiKey: process.env.OPENAI_API_KEY }),
  store: new MemoryStore(),
})

const result = await engine.process('user-123', 'I feel stuck on this project')

console.log(result.percept.emotionalTone)          // 'frustrated'
console.log(result.reasoning.intentions[0].type)    // 'empathize'
console.log(result.suggestedResponse)               // AI-generated empathetic response
```

### Selective modules

```typescript
const engine = new CognitiveOrchestrator({
  llm, embedding, store,
  modules: {
    memory: true,
    emotional: true,
    // everything else disabled — zero overhead
  },
})
```

### Individual modules (no orchestrator)

```typescript
import { PerceptionService } from 'cognitive-engine'

const perception = new PerceptionService(llm)
const { percept } = await perception.perceive('Can you help me fix this bug?')
console.log(percept.requestType)  // 'question'
console.log(percept.urgency)      // 4
```

## Module Examples

### Perception — Understand Messages

```typescript
const { percept, beliefCandidates } = await perception.perceive(
  "I've been stressed about the deadline, my manager keeps adding tasks"
)

percept.emotionalTone    // 'anxious'
percept.urgency          // 7
percept.responseMode     // 'listening'
percept.implicitNeeds    // ['emotional_support', 'validation']
percept.entities         // [{ type: 'person', value: 'manager' }]
```

### Reasoning — Decide What To Do

```typescript
const result = reasoner.reason(percept)

result.intentions
// [
//   { type: 'empathize', priority: 10, reason: 'User is stressed' },
//   { type: 'explore', priority: 5, reason: 'Understand workload' }
// ]
```

### Memory — Remember and Recall

```typescript
// Store episodes
const episode = await extractor.extract('user-123', message)
await memory.storeEpisode(episode)

// Semantic search
const results = await memory.search({ userId: 'user-123', query: 'team collaboration' })

// Build context for response
const context = await memory.getContext('user-123', 'How is the project going?')
```

### Bandit — Learn What Works

```typescript
const bandit = new ThompsonBandit(new MemoryBanditStorage())

// Select best strategy for this context
const choice = await bandit.select(contextVector, ['empathetic', 'actionable', 'curious'])
// choice.action = 'empathetic', choice.expectedReward = 0.73

// After user feedback, update
await bandit.update(choice.action, contextVector, 1.0)
// Over time: learns per-context preferences
```

### Events — React to Cognitive Activity

```typescript
import { CognitiveEventEmitter, CognitiveOrchestrator } from 'cognitive-engine'

const events = new CognitiveEventEmitter()
events.on('perception:complete', (percept) => {
  analytics.track('perception', { tone: percept.emotionalTone })
})
events.on('episode:created', (episode) => {
  console.log('Remembered:', episode.summary)
})

const engine = new CognitiveOrchestrator({ llm, embedding, store, events })
```

## Custom Providers

Implement interfaces to use any LLM or storage:

```typescript
import type { LlmProvider, Store, EmbeddingProvider } from 'cognitive-engine'

// Your LLM (Anthropic, Ollama, Gemini, etc.)
class MyLlmProvider implements LlmProvider {
  async complete(messages, options?) {
    return { content: '...', usage: { promptTokens: 0, completionTokens: 0 }, finishReason: 'stop' }
  }
  async completeJson(messages, options?) {
    const response = await this.complete(messages, options)
    return { ...response, parsed: JSON.parse(response.content) }
  }
}

// Your Store (PostgreSQL, Redis, MongoDB, etc.)
class PostgresStore implements Store {
  async get(collection, id) { /* SELECT ... */ }
  async set(collection, id, data) { /* INSERT/UPDATE ... */ }
  async delete(collection, id) { /* DELETE ... */ }
  async find(collection, filter) { /* SELECT ... WHERE ... */ }
  async upsert(collection, id, data) { /* INSERT ... ON CONFLICT ... */ }
  // Optional: vector search with pgvector
  async vectorSearch(collection, vector, options) { /* ORDER BY embedding <-> $1 */ }
}
```

## Architecture

```
User Message
     │
     ▼
┌──────────────┐
│  Perception   │  Dual-mode: regex (fast) + LLM (deep)
└──────┬───────┘
       │
  ┌────┴────┐
  ▼         ▼
┌────┐   ┌────────┐
│ Memory   │ Reason │  Parallel execution
│ (episodic│ (BDI)  │
│ +semantic│        │
└────┬─────┘────┬───┘
     │          │
     ▼          ▼
┌─────────────────────────────────────┐
│  Mind / Emotional / Social / Plan   │  Parallel
│  Temporal / Bandit                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────┐
│  Metacognition       │  Self-assessment
│  → Strategy selection│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Response Generation  │  System prompt + LLM
└──────────────────────┘
```

## Packages

All packages work standalone. Use only what you need.

| Package | Description |
|---------|-------------|
| `cognitive-engine` | Umbrella — re-exports everything |
| `@cognitive-engine/core` | Types, interfaces, event system |
| `@cognitive-engine/math` | Vector ops, statistics, sampling |
| `@cognitive-engine/perception` | Message analysis |
| `@cognitive-engine/reasoning` | BDI inference engine |
| `@cognitive-engine/memory` | Episodic + semantic memory |
| `@cognitive-engine/emotional` | VAD emotional model |
| `@cognitive-engine/social` | Rapport, boundaries, preferences |
| `@cognitive-engine/mind` | Reflection, relationships, open loops |
| `@cognitive-engine/temporal` | Patterns, causal chains, predictions |
| `@cognitive-engine/planning` | Goal decomposition |
| `@cognitive-engine/metacognition` | Self-assessment |
| `@cognitive-engine/bandit` | Thompson Sampling |
| `@cognitive-engine/orchestrator` | Full cognitive pipeline |
| `@cognitive-engine/store-memory` | In-memory store (dev/test) |
| `@cognitive-engine/provider-openai` | OpenAI LLM + embeddings |

## Design Principles

- **Library, not framework** — you call it, it doesn't call you. Compose freely.
- **Provider-agnostic** — swap LLM, embeddings, or storage via interfaces.
- **Each module works standalone** — no hidden coupling between packages.
- **Math-first** — real algorithms (Thompson Sampling, Bayesian updates, VAD model), not API wrappers.
- **Strict TypeScript** — `strict: true`, zero `any` casts, all interfaces extracted.
- **315+ tests** — every module tested, including convergence tests for bandit.

## Requirements

- Node.js >= 20
- TypeScript >= 5.0

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE) — Copyright 2026 Dmitry Zorin
