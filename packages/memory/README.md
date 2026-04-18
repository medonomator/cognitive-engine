# @cognitive-engine/memory

[![npm](https://img.shields.io/npm/v/@cognitive-engine/memory)](https://www.npmjs.com/package/@cognitive-engine/memory)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Episodic and semantic memory with decay, search, and consolidation for [cognitive-engine](https://github.com/medonomator/cognitive-engine).

## Install

```bash
npm install @cognitive-engine/memory
```

## Two Memory Systems

### Episodic Memory

Stores interaction episodes — what happened, when, with whom. Supports natural forgetting via exponential decay.

```typescript
import { EpisodicMemory, EpisodeExtractor } from '@cognitive-engine/memory'

const memory = new EpisodicMemory(store, embeddingProvider)
const extractor = new EpisodeExtractor(llmProvider)

// Extract episode from interaction
const episode = await extractor.extract('user-123', message, response)

// Store with embedding for semantic search
await memory.storeEpisode(episode)

// Search by semantic similarity
const results = await memory.search({
  userId: 'user-123',
  query: 'team collaboration issues',
  limit: 5,
})

// Build context for response generation
const context = await memory.getContext('user-123', 'How is the project going?')
```

### Semantic Memory

Knowledge graph of facts with confidence tracking and source attribution.

```typescript
import { SemanticMemory, FactExtractor } from '@cognitive-engine/memory'

const semantic = new SemanticMemory(store, embeddingProvider)
const factExtractor = new FactExtractor(llmProvider)

// Extract facts from conversation
const facts = await factExtractor.extract(message, response)
// [{ content: 'User works on backend team', confidence: 0.9, source: 'stated' }]

// Store facts
for (const fact of facts) {
  await semantic.storeFact('user-123', fact)
}

// Recall relevant facts
const relevant = await semantic.recall('user-123', 'team structure')
```

## Memory Decay

Episodes decay over time using exponential forgetting. Recent memories are vivid; old ones fade unless reinforced by recall.

```typescript
// Decay is automatic during search
// Recalled memories get a salience boost (reinforcement)
// Memories below threshold are effectively forgotten
```

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
