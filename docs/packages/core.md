# @cognitive-engine/core

Core types, interfaces, and engine configuration for cognitive-engine.

## Install

```bash
npm install @cognitive-engine/core
```

## Key Interfaces

### LlmProvider

```typescript
interface LlmProvider {
  complete(messages: LlmMessage[], options?: LlmOptions): Promise<LlmResponse>
  completeJson<T>(messages: LlmMessage[], options?: LlmOptions): Promise<LlmResponse & { parsed: T }>
}
```

### EmbeddingProvider

```typescript
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}
```

### Store

```typescript
interface Store {
  get<T>(collection: string, id: string): Promise<T | null>
  set<T>(collection: string, id: string, data: T): Promise<void>
  delete(collection: string, id: string): Promise<void>
  find<T>(collection: string, filter: StoreFilter): Promise<T[]>
}
```

### EngineConfig

```typescript
interface EngineConfig {
  llm: LlmProvider
  embedding: EmbeddingProvider
  store: Store
}
```

## Other Exports

- **Types** - `Percept`, `Belief`, `Intention`, `CognitiveState`, `Episode`, `Fact`, `Plan`, and 40+ more
- **Config types** - `PerceptionConfig`, `ReasoningConfig`, `MemoryConfig`, `EngineModules`
- **Events** - `CognitiveEventEmitter`, `CognitiveEventMap`
- **Utilities** - `uid()`, `supportsVectorSearch()`
