export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmOptions {
  /** Temperature (0-2). Default: 0 */
  temperature?: number
  /** Max tokens to generate. Default: 500 */
  maxTokens?: number
  /** Override default model */
  model?: string
}

export interface LlmUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface LlmResponse {
  content: string
  usage: LlmUsage
  finishReason: 'stop' | 'length' | 'content_filter'
}

export interface LlmProvider {
  /**
   * Generate text completion.
   */
  complete(messages: LlmMessage[], options?: LlmOptions): Promise<LlmResponse>

  /**
   * Generate completion and parse as JSON.
   * Provider should request JSON mode from the model.
   * Throws if response is not valid JSON.
   */
  completeJson<T>(
    messages: LlmMessage[],
    options?: LlmOptions,
  ): Promise<LlmResponse & { parsed: T }>
}

export interface EmbeddingProvider {
  /** Embed a single text. Returns normalized vector. */
  embed(text: string): Promise<number[]>

  /** Batch embed multiple texts. */
  embedBatch(texts: string[]): Promise<number[][]>

  /** Embedding dimensions (e.g. 1536 for OpenAI text-embedding-3-small) */
  readonly dimensions: number
}
