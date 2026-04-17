# @cognitive-engine/store-memory

In-memory store adapter for testing and prototyping.

## Install

```bash
npm install @cognitive-engine/store-memory
```

## Exports

### MemoryStore

In-memory implementation of the `Store` interface. Supports full CRUD, filtering, ordering, and vector search via brute-force cosine similarity.

```typescript
import { MemoryStore } from '@cognitive-engine/store-memory'

const store = new MemoryStore()

// Basic CRUD
await store.set('users', 'u1', { name: 'Alice' })
const user = await store.get('users', 'u1')
await store.delete('users', 'u1')

// Query with filters
const results = await store.find('episodes', {
  where: { type: 'conversation' },
  orderBy: { createdAt: 'desc' },
  limit: 10
})

// Vector search
const similar = await store.vectorSearch('facts', embedding, {
  topK: 5,
  threshold: 0.7
})
```

Data is lost when the process exits. Use this for tests and prototyping, then swap in a persistent store for production.
