# Cognitive Engine

> Not just memory. A mind.

Pure TypeScript framework for building AI agents with real cognitive capabilities — perception, episodic memory, BDI reasoning, Thompson Sampling, and adaptive personalization.

**Provider-agnostic**: works with any LLM (OpenAI, Anthropic, local models) and any storage backend.

## Install

```bash
npm install cognitive-engine
```

## What It Does

Most AI frameworks just wrap API calls. Cognitive Engine gives your agent actual cognitive abilities:

| Module | What it does |
|--------|-------------|
| **Perception** | Understands user messages: emotions, urgency, implicit needs, conversation phase |
| **Episodic Memory** | Remembers past interactions with semantic search and natural forgetting |
| **BDI Reasoning** | Beliefs-Desires-Intentions architecture for deciding *what* to do and *why* |
| **Adaptive Learning** | Thompson Sampling bandit that learns which strategies work best per user |
| **World Model** | Bayesian belief tracking with confidence updates and decay |
| **Math** | Vector ops, cosine similarity, Thompson Sampling, exponential decay |

## Quick Start

```typescript
import {
  OpenAiLlmProvider,
  OpenAiEmbeddingProvider,
  PerceptionService,
  Reasoner,
  EpisodicMemory,
  ThompsonBandit,
  MemoryBanditStorage,
  MemoryStore,
} from 'cognitive-engine'

// 1. Set up providers
const llm = new OpenAiLlmProvider({ model: 'gpt-4o-mini' })
const embedding = new OpenAiEmbeddingProvider()
const store = new MemoryStore()

// 2. Create cognitive modules
const perception = new PerceptionService(llm)
const reasoner = new Reasoner()
const memory = new EpisodicMemory(store, embedding)
const bandit = new ThompsonBandit(new MemoryBanditStorage())

// 3. Perceive a message
const { percept, beliefCandidates } = await perception.perceive(
  "I've been stressed about the project deadline"
)
// percept.emotionalTone → 'anxious'
// percept.urgency → 7
// percept.responseMode → 'listening'

// 4. Reason about it
for (const candidate of beliefCandidates) {
  reasoner.worldModel.addBelief(candidate, 'observed')
}
const result = reasoner.reason(percept)
// result.intentions → [{ type: 'empathize', priority: 10, ... }]

// 5. Select best response strategy via bandit
await bandit.initAction('empathetic', 3)
await bandit.initAction('actionable', 3)
const choice = await bandit.select([0.8, 0.6, 0.3], ['empathetic', 'actionable'])
// choice.action → 'empathetic'
```

See the [full documentation](https://www.npmjs.com/package/cognitive-engine) for detailed usage examples of each module.

## Architecture

```
User Message
     │
     ▼
┌─────────────┐
│  Perception  │  Dual-mode: regex (fast) + LLM (deep)
│  → Percept   │  Emotion, intent, entities, implicit needs
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│  Reasoning   │◄────│  World Model  │  Bayesian belief updates
│  → Intentions│     │  (Beliefs)    │  Confidence decay
└──────┬──────┘     └──────────────┘
       │
       ├──────────────────────────┐
       ▼                          ▼
┌─────────────┐          ┌──────────────┐
│   Memory     │          │    Bandit     │
│  (Episodes)  │          │  (Thompson)  │
│  Semantic    │          │  Adaptive    │
│  search +    │          │  O(n) diag   │
│  decay       │          │  covariance  │
└─────────────┘          └──────────────┘
```

## Custom Providers

Implement the interfaces to use any LLM or storage:

```typescript
import type { LlmProvider, Store, EmbeddingProvider } from 'cognitive-engine'

class AnthropicProvider implements LlmProvider { /* ... */ }
class PostgresStore implements Store { /* ... */ }
```

## Development

```bash
npm install
npm run build    # Build all packages
npm test         # Run all 168 tests
npm run docs     # Generate API docs
```

## Design Principles

- **Pure TypeScript** — no framework lock-in
- **Provider-agnostic** — swap LLM/embedding/storage via interfaces
- **Math-first** — real algorithms, not API wrappers
- **Strict types** — `strict: true`, `noUncheckedIndexedAccess`, zero `any` casts
- **168 tests** — every module tested

## Packages

For granular imports, individual packages are also available:

| Package | Description |
|---------|-------------|
| `@cognitive-engine/core` | Types, interfaces, Pipeline, EventEmitter |
| `@cognitive-engine/math` | Vector ops, matrix, Thompson Sampling, temporal decay |
| `@cognitive-engine/perception` | Dual-mode message analysis with entity & belief extraction |
| `@cognitive-engine/reasoning` | BDI reasoning: WorldModel, WorkingMemory, intentions |
| `@cognitive-engine/memory` | Episodic memory with semantic search and consolidation |
| `@cognitive-engine/bandit` | Contextual Thompson Sampling with diagonal covariance |
| `@cognitive-engine/store-memory` | In-memory Store for testing and prototyping |
| `@cognitive-engine/provider-openai` | OpenAI LLM + Embedding adapters |

## License

[Apache-2.0](LICENSE) — Copyright 2026 Dmitry Zorin
