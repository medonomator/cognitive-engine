export interface OpenAiLlmConfig {
  /** OpenAI API key. Falls back to OPENAI_API_KEY env variable. */
  apiKey?: string
  /** Default model for completions. Default: 'gpt-4o-mini' */
  model?: string
  /** Custom base URL (for Azure, local proxies, etc.) */
  baseURL?: string
  /** Default temperature. Default: 0 */
  defaultTemperature?: number
  /** Default max tokens. Default: 500 */
  defaultMaxTokens?: number
}

export interface OpenAiEmbeddingConfig {
  /** OpenAI API key. Falls back to OPENAI_API_KEY env variable. */
  apiKey?: string
  /** Embedding model. Default: 'text-embedding-3-small' */
  model?: string
  /** Custom base URL */
  baseURL?: string
  /** Vector dimensions. Default: 1536 */
  dimensions?: number
}
