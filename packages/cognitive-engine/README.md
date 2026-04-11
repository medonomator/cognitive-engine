# cognitive-engine

> Not just memory. A mind.

Pure TypeScript framework for building AI agents with real cognitive capabilities — perception, episodic memory, BDI reasoning, Thompson Sampling, and adaptive personalization.

**Provider-agnostic**: works with any LLM (OpenAI, Anthropic, local models) and any storage backend.

## Install

```bash
npm install cognitive-engine
```

## What It Does

Most AI frameworks just wrap API calls. Cognitive Engine gives your agent actual cognitive abilities:

- **Perception** — Understands user messages beyond keywords: emotions, urgency, implicit needs, conversation phase
- **Episodic Memory** — Remembers past interactions with semantic search, importance scoring, and natural forgetting
- **BDI Reasoning** — Beliefs-Desires-Intentions architecture for deciding *what* to do and *why*
- **Adaptive Learning** — Thompson Sampling bandit that learns which response strategies work best per user

## Quick Start

```typescript
import {
  OpenAiLlmProvider,
  OpenAiEmbeddingProvider,
  PerceptionService,
  Reasoner,
  EpisodicMemory,
  EpisodeExtractor,
  ThompsonBandit,
  MemoryBanditStorage,
  MemoryStore,
} from 'cognitive-engine'

// 1. Set up providers
const llm = new OpenAiLlmProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
})
const embedding = new OpenAiEmbeddingProvider({
  apiKey: process.env.OPENAI_API_KEY,
})
const store = new MemoryStore()

// 2. Create cognitive modules
const perception = new PerceptionService(llm)
const reasoner = new Reasoner()
const memory = new EpisodicMemory(store, embedding)
const extractor = new EpisodeExtractor(llm, embedding)
const bandit = new ThompsonBandit(new MemoryBanditStorage())
```

## Usage Examples

### Perception — Understand User Messages

Dual-mode analysis: fast regex for simple messages, deep LLM analysis for complex ones.

```typescript
const { percept, beliefCandidates } = await perception.perceive(
  "I've been stressed about the project deadline, my manager keeps adding tasks"
)

console.log(percept.emotionalTone)   // 'anxious'
console.log(percept.urgency)          // 7
console.log(percept.responseMode)     // 'listening'
console.log(percept.implicitNeeds)    // ['emotional_support', 'validation']
console.log(percept.entities)         // [{ type: 'person', value: 'manager' }]
console.log(percept.conversationPhase) // 'sharing'
```

Quick analysis (no LLM call, instant):

```typescript
import { quickAnalyze } from 'cognitive-engine'

const quick = quickAnalyze("Can you help me fix this bug?")
console.log(quick.requestTypes) // ['question', 'help']
console.log(quick.urgency)     // 4
```

### Reasoning — Decide What To Do

BDI (Beliefs-Desires-Intentions) reasoning with Bayesian belief updates.

```typescript
// Feed perception results into the world model
for (const candidate of beliefCandidates) {
  reasoner.worldModel.addBelief(candidate, 'observed')
}

// Reason about the situation
const result = reasoner.reason(percept)

console.log(result.intentions)
// [
//   { type: 'empathize', priority: 10, reason: 'User is stressed, listening mode' },
//   { type: 'explore', priority: 5, reason: 'Understand workload situation' }
// ]

console.log(result.state.beliefs)
// [
//   { subject: 'user', predicate: 'feels', object: 'stressed', confidence: 0.85 },
//   { subject: 'user', predicate: 'deals_with', object: 'work_pressure', confidence: 0.7 }
// ]
```

World model maintains beliefs with confidence that updates over time:

```typescript
const { worldModel } = reasoner

// Explicit statement → high confidence
worldModel.addBelief(
  { subject: 'user', predicate: 'works_as', object: 'engineer', confidence: 0.9 },
  'explicit'
)

// Repeated evidence strengthens beliefs
worldModel.confirmBelief(beliefId) // confidence: 0.85 → 0.95

// Contradicting evidence weakens them
worldModel.weakenBelief(beliefId) // confidence: 0.6 → 0.45

// Inferred beliefs decay faster than explicit ones
worldModel.applyDecay()
```

### Episodic Memory — Remember and Recall

Store personal episodes with semantic search and natural forgetting.

```typescript
// Extract episodes from user messages automatically
const episode = await extractor.extract(
  'user-123',
  'Yesterday I had a great meeting with the team, we finally agreed on the architecture'
)

if (episode) {
  console.log(episode.summary)     // 'Productive team meeting about architecture'
  console.log(episode.emotions)    // ['satisfaction', 'relief']
  console.log(episode.importance)  // 0.7
  console.log(episode.category)   // 'work'

  await memory.storeEpisode(episode)
}

// Semantic search — find relevant memories
const results = await memory.search({
  userId: 'user-123',
  query: 'team collaboration',
  limit: 5,
})

for (const result of results) {
  console.log(result.episode.summary)
  console.log(result.relevanceScore)  // semantic similarity
  console.log(result.recencyScore)    // time decay
  console.log(result.combinedScore)   // weighted combination
}

// Build context for response generation
const context = await memory.getContext('user-123', 'How is the project going?')
console.log(context.recentEpisodes)    // last 5 episodes
console.log(context.relevantEpisodes)  // semantically related
console.log(context.emotionalPattern)  // 'positive (satisfaction)'

// Consolidation — forget old unimportant memories
const consolidated = await memory.consolidate('user-123')
console.log(consolidated.decayedCount)    // importance reduced
console.log(consolidated.deletedCount)    // forgotten
console.log(consolidated.remainingCount)  // still remembered
```

### Adaptive Learning — Thompson Sampling Bandit

Learn which response strategies work best for each user context.

```typescript
// Initialize response strategies with context dimensions
const contextDim = 3 // e.g., [urgency, emotionIntensity, messageLength]
await bandit.initAction('empathetic', contextDim)
await bandit.initAction('actionable', contextDim)
await bandit.initAction('curious', contextDim)

// Select best strategy based on current context
const context = [0.8, 0.6, 0.3] // high urgency, medium emotion, short message
const choice = await bandit.select(context, ['empathetic', 'actionable', 'curious'])
console.log(choice.action)         // 'empathetic'
console.log(choice.expectedReward) // 0.73

// After getting user feedback, update the model
await bandit.update(choice.action, context, 1.0) // positive feedback

// Over time, the bandit learns per-context preferences
// High urgency + high emotion → empathetic works best
// Low urgency + question → actionable works best
```

### Custom Providers — Bring Your Own LLM/Storage

Implement the interfaces to use any LLM or storage backend:

```typescript
import type { LlmProvider, Store, EmbeddingProvider } from 'cognitive-engine'

// Custom LLM (e.g., Anthropic, Ollama, etc.)
class MyLlmProvider implements LlmProvider {
  async complete(messages, options?) {
    // Call your LLM API
    return { content: '...', usage: { ... }, finishReason: 'stop' }
  }

  async completeJson(messages, options?) {
    // Call your LLM API with JSON mode
    const response = await this.complete(messages, options)
    return { ...response, parsed: JSON.parse(response.content) }
  }
}

// Custom Store (e.g., PostgreSQL, Redis, MongoDB)
class PostgresStore implements Store {
  async get(collection, id) { /* SELECT ... */ }
  async set(collection, id, data) { /* INSERT/UPDATE ... */ }
  async delete(collection, id) { /* DELETE ... */ }
  async find(collection, filter) { /* SELECT ... WHERE ... */ }
  async upsert(collection, id, data) { /* INSERT ... ON CONFLICT ... */ }
  async vectorSearch(collection, vector, options) { /* pgvector search */ }
}

// Custom Embedding Provider
class MyEmbeddingProvider implements EmbeddingProvider {
  async embed(text) { return [0.1, 0.2, ...] }
  async embedBatch(texts) { return texts.map(t => [0.1, ...]) }
}
```

### Pipeline — Composable Processing

Chain processing steps with type-safe pipelines:

```typescript
import { Pipeline } from 'cognitive-engine'

const pipeline = new Pipeline<string, string>()
  .pipe(async (input) => input.toLowerCase())
  .pipe(async (input) => input.trim())
  .pipe(async (input) => `processed: ${input}`)

const result = await pipeline.execute('  Hello World  ')
// 'processed: hello world'
```

### Math Utilities

Battle-tested math functions used internally, available for your own use:

```typescript
import {
  cosineSimilarity,
  exponentialDecay,
  sampleDiagonalMVN,
  l2Normalize,
} from 'cognitive-engine'

// Vector similarity
const sim = cosineSimilarity([1, 2, 3], [2, 4, 6]) // 1.0

// Time-based decay (for memory, belief confidence)
const weight = exponentialDecay(daysSinceEvent, decayRate) // 0.0–1.0

// Thompson Sampling (diagonal MVN — O(n) per sample)
const sample = sampleDiagonalMVN(mean, variance) // [0.3, 0.7, ...]

// Normalize vectors for cosine similarity
const normalized = l2Normalize([3, 4]) // [0.6, 0.8]
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

## Key Design Decisions

- **Pure TypeScript** — no framework lock-in (NestJS, Express, etc.). Use anywhere.
- **Provider-agnostic** — swap LLM, embedding, or storage via simple interfaces.
- **Math-first** — real algorithms (Thompson Sampling, Bayesian updates, cosine similarity), not just API wrappers.
- **Strict types** — `strict: true`, `noUncheckedIndexedAccess`, zero `any` casts.
- **168 tests** — every module tested, including convergence tests for bandit algorithms.

## Requirements

- Node.js ≥ 20
- TypeScript ≥ 5.0 (for consumers using TypeScript)

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE) — Copyright 2026 Dmitry Zorin
