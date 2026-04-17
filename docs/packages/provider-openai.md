# @cognitive-engine/provider-openai

OpenAI LLM and embedding provider adapters.

## Install

```bash
npm install @cognitive-engine/provider-openai
```

## Exports

### OpenAiLlmProvider

Implements `LlmProvider` using the OpenAI API.

```typescript
import { OpenAiLlmProvider } from '@cognitive-engine/provider-openai'

const llm = new OpenAiLlmProvider({
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY,
})
```

### OpenAiEmbeddingProvider

Implements `EmbeddingProvider` using the OpenAI Embeddings API.

```typescript
import { OpenAiEmbeddingProvider } from '@cognitive-engine/provider-openai'

const embedding = new OpenAiEmbeddingProvider({
  model: 'text-embedding-3-small',
  apiKey: process.env.OPENAI_API_KEY,
})
```

### Configuration

```typescript
import type { OpenAiLlmConfig, OpenAiEmbeddingConfig } from '@cognitive-engine/provider-openai'
```
