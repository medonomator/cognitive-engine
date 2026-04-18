import OpenAI from 'openai'
import type { EmbeddingProvider } from '@cognitive-engine/core'
import type { OpenAiEmbeddingConfig } from './config.js'

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  private readonly client: OpenAI
  private readonly model: string
  readonly dimensions: number

  constructor(config: OpenAiEmbeddingConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })
    this.model = config.model ?? 'text-embedding-3-small'
    this.dimensions = config.dimensions ?? 1536
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimensions,
    })

    const data = response.data[0]
    if (!data) {
      throw new Error('OpenAI embeddings returned empty response')
    }
    return data.embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimensions,
    })

    return response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding)
  }
}
