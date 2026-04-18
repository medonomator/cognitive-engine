# @cognitive-engine/store-memory

[![npm](https://img.shields.io/npm/v/@cognitive-engine/store-memory)](https://www.npmjs.com/package/@cognitive-engine/store-memory)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

In-memory store adapter for [cognitive-engine](https://github.com/medonomator/cognitive-engine). Ideal for testing, prototyping, and development.

## Install

```bash
npm install @cognitive-engine/store-memory
```

## Usage

```typescript
import { MemoryStore } from '@cognitive-engine/store-memory'

const store = new MemoryStore()

// CRUD operations
await store.set('users', 'user-1', { name: 'Alice', role: 'engineer' })
const user = await store.get('users', 'user-1')
await store.delete('users', 'user-1')

// Query
const results = await store.find('users', { role: 'engineer' })

// Upsert
await store.upsert('users', 'user-1', { name: 'Alice', role: 'senior engineer' })

// Vector search (brute-force cosine similarity)
await store.set('documents', 'doc-1', { text: 'Hello', embedding: [0.1, 0.2, 0.3] })
await store.set('documents', 'doc-2', { text: 'World', embedding: [0.4, 0.5, 0.6] })

const similar = await store.vectorSearch('documents', [0.1, 0.2, 0.3], { limit: 5 })
```

## When to Use

| Scenario | Store |
|----------|-------|
| Unit tests | **MemoryStore** |
| Local development | **MemoryStore** |
| Prototyping | **MemoryStore** |
| Production | `@cognitive-engine/store-qdrant` or custom |

Data lives only in process memory — it's lost on restart. For persistence, implement the `Store` interface from `@cognitive-engine/core` for your database of choice.

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
