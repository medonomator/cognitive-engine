# @cognitive-engine/store-qdrant

[![npm](https://img.shields.io/npm/v/@cognitive-engine/store-qdrant)](https://www.npmjs.com/package/@cognitive-engine/store-qdrant)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Qdrant vector database store adapter for [cognitive-engine](https://github.com/medonomator/cognitive-engine).

> **Status:** Stub package — implementation in progress. For now, use `@cognitive-engine/store-memory` for development or implement the `Store` interface from `@cognitive-engine/core` for your own Qdrant integration.

## Install

```bash
npm install @cognitive-engine/store-qdrant
```

## Planned Usage

```typescript
import { QdrantStore } from '@cognitive-engine/store-qdrant'

const store = new QdrantStore({
  url: 'http://localhost:6333',
  collection: 'cognitive-engine',
})

// Use with any cognitive-engine module
const engine = new CognitiveOrchestrator({
  llm, embedding,
  store, // persistent vector storage
})
```

## Custom Store in the Meantime

```typescript
import type { Store } from '@cognitive-engine/core'
import { QdrantClient } from '@qdrant/js-client-rest'

class MyQdrantStore implements Store {
  private client = new QdrantClient({ url: 'http://localhost:6333' })

  async get(collection, id) { /* ... */ }
  async set(collection, id, data) { /* ... */ }
  async delete(collection, id) { /* ... */ }
  async find(collection, filter) { /* ... */ }
  async upsert(collection, id, data) { /* ... */ }
  async vectorSearch(collection, vector, options) {
    return this.client.search(collection, { vector, limit: options?.limit ?? 10 })
  }
}
```

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
