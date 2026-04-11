import OpenAI from 'openai'
import type {
  LlmProvider,
  LlmMessage,
  LlmOptions,
  LlmResponse,
} from '@cognitive-engine/core'
import type { OpenAiLlmConfig } from './config.js'

type ChatMessage = OpenAI.ChatCompletionMessageParam

const REASONING_MODEL_PREFIXES = ['o1', 'o3', 'o4']

function isReasoningModel(model: string): boolean {
  return REASONING_MODEL_PREFIXES.some(
    (prefix) => model === prefix || model.startsWith(`${prefix}-`),
  )
}

function toFinishReason(
  reason: string | null,
): 'stop' | 'length' | 'content_filter' {
  if (reason === 'length') return 'length'
  if (reason === 'content_filter') return 'content_filter'
  return 'stop'
}

export class OpenAiLlmProvider implements LlmProvider {
  private readonly client: OpenAI
  private readonly model: string
  private readonly defaultTemperature: number
  private readonly defaultMaxTokens: number

  constructor(config: OpenAiLlmConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })
    this.model = config.model ?? 'gpt-4o-mini'
    this.defaultTemperature = config.defaultTemperature ?? 0
    this.defaultMaxTokens = config.defaultMaxTokens ?? 500
  }

  async complete(
    messages: LlmMessage[],
    options?: LlmOptions,
  ): Promise<LlmResponse> {
    const model = options?.model ?? this.model
    const reasoning = isReasoningModel(model)

    const params: OpenAI.ChatCompletionCreateParams = {
      model,
      messages: this.toOpenAiMessages(messages, reasoning),
    }

    if (reasoning) {
      params.max_completion_tokens = Math.max(
        (options?.maxTokens ?? this.defaultMaxTokens) * 10,
        2000,
      )
    } else {
      params.temperature = options?.temperature ?? this.defaultTemperature
      params.max_tokens = options?.maxTokens ?? this.defaultMaxTokens
    }

    const response = await this.client.chat.completions.create(params)
    return this.toResponse(response)
  }

  async completeJson<T>(
    messages: LlmMessage[],
    options?: LlmOptions,
  ): Promise<LlmResponse & { parsed: T }> {
    const model = options?.model ?? this.model
    const reasoning = isReasoningModel(model)

    const params: OpenAI.ChatCompletionCreateParams = {
      model,
      messages: this.toOpenAiMessages(messages, reasoning),
      response_format: { type: 'json_object' },
    }

    if (reasoning) {
      params.max_completion_tokens = Math.max(
        (options?.maxTokens ?? this.defaultMaxTokens) * 10,
        2000,
      )
    } else {
      params.temperature = options?.temperature ?? this.defaultTemperature
      params.max_tokens = options?.maxTokens ?? this.defaultMaxTokens
    }

    const response = await this.client.chat.completions.create(params)
    const base = this.toResponse(response)

    const parsed = JSON.parse(base.content) as T
    return { ...base, parsed }
  }

  private toOpenAiMessages(
    messages: LlmMessage[],
    reasoning: boolean,
  ): ChatMessage[] {
    return messages.map((m): ChatMessage => {
      if (m.role === 'system' && reasoning) {
        return { role: 'developer', content: m.content }
      }
      return { role: m.role, content: m.content }
    })
  }

  private toResponse(
    response: OpenAI.ChatCompletion,
  ): LlmResponse {
    const choice = response.choices[0]
    const content = choice?.message?.content ?? ''
    const usage = response.usage

    return {
      content,
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
      finishReason: toFinishReason(choice?.finish_reason ?? null),
    }
  }
}
