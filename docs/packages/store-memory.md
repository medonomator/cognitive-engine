# @cognitive-engine/store-memory

In-memory implementation of the `Store` interface. Supports full CRUD, filtering, ordering, and vector search. Use for testing and prototyping, then swap in a persistent store for production.

## Install

```bash
npm install @cognitive-engine/store-memory
```

## Quick Start

```typescript
import { MemoryStore } from '@cognitive-engine/store-memory'

const store = new MemoryStore()
```

## CRUD Operations

```typescript
// Set and get
await store.set('users', 'u1', { name: 'Alice', role: 'admin' })
const user = await store.get<{ name: string }>('users', 'u1')

// Upsert — create or update
await store.upsert('users', 'u1', { name: 'Alice', role: 'superadmin' })

// Delete
await store.delete('users', 'u1')
```

## Querying

Filter, order, and paginate records within a collection.

```typescript
// Find with filters
const episodes = await store.find('episodes', {
  where: { userId: 'user-123', type: 'conversation' },
  orderBy: { createdAt: 'desc' },
  limit: 10,
  offset: 0,
})
```

## Vector Search

Brute-force cosine similarity search. Fine for testing; use a vector DB (Qdrant, pgvector) in production.

```typescript
const results = await store.vectorSearch('facts', queryEmbedding, {
  topK: 5,
  threshold: 0.7,  // Minimum similarity score
})

for (const result of results) {
  result.id         // Record ID
  result.score      // Cosine similarity (0-1)
  result.data       // The stored record
}
```

## Utility Methods

```typescript
// Total records across all collections
console.log(store.size) // 42

// Clear everything
store.clear()

// Clear one collection
store.clearCollection('episodes')
```

## Implementing a Custom Store

The `Store` interface from `@cognitive-engine/core` defines the contract:

```typescript
import type { Store, StoreFilter, VectorSearchOptions } from '@cognitive-engine/core'

class PostgresStore implements Store {
  async get<T>(collection: string, id: string): Promise<T | null> { ... }
  async set<T>(collection: string, id: string, data: T): Promise<void> { ... }
  async delete(collection: string, id: string): Promise<void> { ... }
  async find<T>(collection: string, filter: StoreFilter): Promise<T[]> { ... }
  async upsert<T>(collection: string, id: string, data: T): Promise<void> { ... }
  async vectorSearch(collection: string, vector: number[], options: VectorSearchOptions): Promise<VectorSearchResult[]> { ... }
}
```

All cognitive-engine modules accept any `Store` implementation — swap stores without changing module code.
