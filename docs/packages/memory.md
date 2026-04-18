# @cognitive-engine/memory

Episodic memory with decay, semantic search, and consolidation.

## Install

```bash
npm install @cognitive-engine/memory
```

## Exports

### EpisodicMemory

Stores and retrieves experience-based memories with temporal decay.

```typescript
import { EpisodicMemory } from '@cognitive-engine/memory'

const episodic = new EpisodicMemory(engine)
await episodic.store(episode)
const results = await episodic.recall(query)
```

### EpisodeExtractor

Extracts structured episodes from conversation messages.

```typescript
import { EpisodeExtractor } from '@cognitive-engine/memory'

const extractor = new EpisodeExtractor(engine)
const episode = await extractor.extract(messages, context)
```

### SemanticMemory

Stores and queries factual knowledge with vector search.

```typescript
import { SemanticMemory } from '@cognitive-engine/memory'

const semantic = new SemanticMemory(engine)
await semantic.storeFact(fact)
const facts = await semantic.query(topic)
```

### FactExtractor

Extracts structured facts from text using LLM.

```typescript
import { FactExtractor } from '@cognitive-engine/memory'

const extractor = new FactExtractor(engine)
```
