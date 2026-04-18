# @cognitive-engine/provider-openai

[![npm](https://img.shields.io/npm/v/@cognitive-engine/provider-openai)](https://www.npmjs.com/package/@cognitive-engine/provider-openai)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

OpenAI LLM and embedding provider adapters for [cognitive-engine](https://github.com/medonomator/cognitive-engine).

## Install

```bash
npm install @cognitive-engine/provider-openai
```

Requires `openai` v4+ as a peer dependency.

## Usage

### LLM Provider

```typescript
import { OpenAiLlmProvider } from '@cognitive-engine/provider-openai'

const llm = new OpenAiLlmProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
})

// Text completion
const response = await llm.complete([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' },
])
console.log(response.content)

// JSON completion (structured output)
const json = await llm.completeJson([
  { role: 'user', content: 'List 3 colors as JSON array' },
])
console.log(json.parsed) // ['red', 'green', 'blue']
```

### Embedding Provider

```typescript
import { OpenAiEmbeddingProvider } from '@cognitive-engine/provider-openai'

const embedding = new OpenAiEmbeddingProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small', // optional, default
})

// Single embedding
const vector = await embedding.embed('Hello world')
// number[] — 1536 dimensions

// Batch embedding
const vectors = await embedding.embedBatch(['Hello', 'World'])
```

### Configuration

```typescript
interface OpenAiLlmConfig {
  apiKey: string
  model?: string           // default: 'gpt-4o-mini'
  temperature?: number     // default: 0.7
  maxTokens?: number       // default: model-dependent
  baseURL?: string         // for proxies or Azure
}

interface OpenAiEmbeddingConfig {
  apiKey: string
  model?: string           // default: 'text-embedding-3-small'
  baseURL?: string
}
```

## Custom Providers

This is just one implementation. cognitive-engine works with any LLM — implement the `LlmProvider` interface from `@cognitive-engine/core` for Anthropic, Ollama, Gemini, or any other provider.

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
