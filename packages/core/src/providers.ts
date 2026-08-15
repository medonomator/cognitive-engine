export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Vendor-neutral observability context for a single LLM call.
 * Providers that talk to a tracing backend (Langfuse, LangSmith, OpenTelemetry)
 * map these fields onto their own trace/span attributes. Providers without
 * tracing ignore them.
 */
export interface LlmTraceContext {
  /** Pre-generated trace id, so the caller can attach scores after the call */
  traceId?: string
  /** Name of the trace this call belongs to, e.g. 'assistant-chat' */
  traceName?: string
  /** Name of the generation inside the trace, e.g. 'reflection-pass' */
  generationName?: string
  /** Identity of the end user the call is made on behalf of */
  userId?: string
  /** Groups several calls of one conversation together */
  sessionId?: string
  /** Free-form labels for filtering, e.g. ['ai-assistant', 'digest'] */
  tags?: string[]
  /** Arbitrary structured context attached to the trace */
  metadata?: Record<string, unknown>
}

export interface LlmOptions {
  /** Temperature (0-2). Default: 0 */
  temperature?: number
  /** Max tokens to generate. Default: 500 */
  maxTokens?: number
  /** Override default model */
  model?: string
  /** Observability context forwarded to the provider's tracing backend */
  trace?: LlmTraceContext
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
