# Cognitive Engine

> Not just memory. A mind.

Pure TypeScript framework for building AI agents with cognitive capabilities — perception, episodic memory, BDI reasoning, Thompson Sampling, and adaptive personalization.

**Provider-agnostic**: works with any LLM (OpenAI, Anthropic, local models) and any storage backend.

## Status

**Private alpha** — under active development.

## Packages

| Package | Description |
|---------|-------------|
| [`@cognitive-engine/core`](packages/core) | Types, interfaces (LlmProvider, Store, EmbeddingProvider), Pipeline, EventEmitter |
| [`@cognitive-engine/math`](packages/math) | Vector ops, matrix, Thompson Sampling (MVN, diagonal MVN), temporal decay |
| [`@cognitive-engine/perception`](packages/perception) | Dual-mode message analysis: fast regex + deep LLM, entity & belief extraction |
| [`@cognitive-engine/reasoning`](packages/reasoning) | BDI reasoning: WorldModel (Bayesian beliefs), WorkingMemory, intention generation |
| [`@cognitive-engine/memory`](packages/memory) | Episodic memory with semantic search, exponential decay, consolidation |
| [`@cognitive-engine/bandit`](packages/bandit) | Contextual Thompson Sampling with diagonal covariance — O(n) per update |
| [`@cognitive-engine/store-memory`](packages/store-memory) | In-memory Store for testing and prototyping |
| [`@cognitive-engine/provider-openai`](packages/provider-openai) | OpenAI LLM + Embedding adapters |

## Quick Start

```typescript
import { PerceptionService } from '@cognitive-engine/perception'
import { Reasoner } from '@cognitive-engine/reasoning'
import { EpisodicMemory } from '@cognitive-engine/memory'
import { ThompsonBandit, MemoryBanditStorage } from '@cognitive-engine/bandit'
import { OpenAiLlmProvider, OpenAiEmbeddingProvider } from '@cognitive-engine/provider-openai'
import { MemoryStore } from '@cognitive-engine/store-memory'

// 1. Set up providers
const llm = new OpenAiLlmProvider({ model: 'gpt-4o-mini' })
const embedding = new OpenAiEmbeddingProvider()
const store = new MemoryStore()

// 2. Create cognitive modules
const perception = new PerceptionService(llm)
const reasoner = new Reasoner()
const memory = new EpisodicMemory(store, embedding)
const bandit = new ThompsonBandit(new MemoryBanditStorage())

// 3. Process a message
const { percept, beliefCandidates } = await perception.perceive(
  "I've been stressed about the project deadline"
)
// percept.emotionalTone → 'anxious'
// percept.urgency → 6
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
const choice = await bandit.select(contextVector, ['empathetic', 'actionable'])
```

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

## Development

```bash
# Install
npm install

# Build all packages
npm run build

# Run all tests (168 tests)
npm test

# Run tests with verbose output
npm run test:ci
```

## Design Principles

- **Pure TypeScript** — no framework lock-in (NestJS, Express, etc.)
- **Provider-agnostic** — swap LLM/embedding/storage via interfaces
- **Modular** — use only what you need, each package is independent
- **Math-first** — real algorithms (Thompson Sampling, Bayesian updates, cosine similarity), not wrappers
- **Test-driven** — 168 tests, strict TypeScript (`noUncheckedIndexedAccess`, `strict: true`)

## License

[Apache-2.0](LICENSE) — Copyright 2026 Dmitry Zorin
