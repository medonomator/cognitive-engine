# @cognitive-engine/provider-openai

OpenAI LLM and embedding provider adapters. Implements `LlmProvider` and `EmbeddingProvider` interfaces from `@cognitive-engine/core`.

## Install

```bash
npm install @cognitive-engine/provider-openai
```

## LLM Provider

```typescript
import { OpenAiLlmProvider } from '@cognitive-engine/provider-openai'

const llm = new OpenAiLlmProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',         // Default model (default: 'gpt-4o-mini')
  defaultTemperature: 0,         // Default temperature (default: 0)
  defaultMaxTokens: 500,         // Default max tokens (default: 500)
  baseURL: 'https://...',        // Optional: custom API base URL
})
```

### Text Completion

```typescript
const response = await llm.complete([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is TypeScript?' },
])

response.content      // 'TypeScript is...'
response.finishReason // 'stop' | 'length' | 'content_filter'
response.usage        // { promptTokens, completionTokens, totalTokens }
```

### JSON Completion

Returns parsed JSON with type safety. Automatically sets response format to JSON.

```typescript
interface Analysis {
  sentiment: string
  confidence: number
}

const response = await llm.completeJson<Analysis>([
  { role: 'user', content: 'Analyze: I love this!' },
])

response.parsed    // { sentiment: 'positive', confidence: 0.95 }
response.content   // Raw JSON string
```

### Per-Request Overrides

```typescript
const response = await llm.complete(messages, {
  model: 'gpt-4o',       // Override model for this call
  temperature: 0.7,       // Override temperature
  maxTokens: 1000,        // Override max tokens
})
```

### Reasoning Models

Reasoning models (o1, o3, o4 prefixes) are automatically detected. Token limits are scaled appropriately.

```typescript
const llm = new OpenAiLlmProvider({ model: 'o4-mini' })
// Automatically uses max_completion_tokens instead of max_tokens
```

## Embedding Provider

```typescript
import { OpenAiEmbeddingProvider } from '@cognitive-engine/provider-openai'

const embedding = new OpenAiEmbeddingProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small',  // Default: 'text-embedding-3-small'
  dimensions: 1536,                  // Default: 1536
})

// Single text
const vector = await embedding.embed('Hello world')
// number[1536]

// Batch — more efficient for multiple texts
const vectors = await embedding.embedBatch([
  'First document',
  'Second document',
])
// number[2][1536]

// Access dimensions for store configuration
console.log(embedding.dimensions) // 1536
```

## Custom Providers

Implement these interfaces to use any LLM or embedding backend:

```typescript
import type { LlmProvider, EmbeddingProvider } from '@cognitive-engine/core'

// Use Anthropic, Ollama, or any other provider
class AnthropicLlmProvider implements LlmProvider {
  async complete(messages: LlmMessage[], options?: LlmOptions): Promise<LlmResponse> { ... }
  async completeJson<T>(messages: LlmMessage[], options?: LlmOptions): Promise<LlmResponse & { parsed: T }> { ... }
}

class OllamaEmbeddingProvider implements EmbeddingProvider {
  dimensions = 768
  async embed(text: string): Promise<number[]> { ... }
  async embedBatch(texts: string[]): Promise<number[][]> { ... }
}
```

All cognitive-engine modules accept any provider implementation — swap providers without changing module code.
