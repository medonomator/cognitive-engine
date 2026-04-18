# Memory

cognitive-engine provides three types of memory, modeled after human cognitive architecture.

## Episodic Memory

Stores experiences - what happened, when, what was the outcome.

```typescript
import { EpisodicMemory, EpisodeExtractor } from '@cognitive-engine/memory'

const episodic = new EpisodicMemory(engine)
const extractor = new EpisodeExtractor(engine)

// Extract an episode from a conversation
const episode = await extractor.extract(messages, context)

// Store it
await episodic.store(episode)

// Recall relevant episodes later
const memories = await episodic.recall({ topic: 'code review', limit: 5 })
```

Episodic memory supports consolidation - periodically merging and summarizing old episodes to save space while preserving key lessons.

## Semantic Memory

Stores facts and domain knowledge.

```typescript
import { SemanticMemory, FactExtractor } from '@cognitive-engine/memory'

const semantic = new SemanticMemory(engine)

// Store a fact
await semantic.storeFact({
  content: 'SQL injection occurs when user input is concatenated into queries',
  source: { type: 'learned', context: 'code review session' },
  confidence: 0.95
})

// Query by topic
const facts = await semantic.query('security vulnerabilities')
```

## Working Memory

Temporary buffer that holds currently relevant information. Combines items from episodic and semantic memory, ranked by relevance.

```typescript
import { WorkingMemory } from '@cognitive-engine/reasoning'

const working = new WorkingMemory({ maxItems: 20 })
working.load(episodicResults, semanticResults)
```
