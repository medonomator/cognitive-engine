import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAiLlmProvider } from './llm.js'
import type { LlmMessage } from '@cognitive-engine/core'
import type OpenAI from 'openai'

// Mock OpenAI
vi.mock('openai', () => {
  const createMock = vi.fn()
  return {
    default: class {
      chat = { completions: { create: createMock } }
    },
    __createMock: createMock,
  }
})

async function getCreateMock(): Promise<ReturnType<typeof vi.fn>> {
  const mod = await import('openai')
  // vitest module mock injection — no typed alternative
  return (mod as unknown as { __createMock: ReturnType<typeof vi.fn> })
    .__createMock
}

function mockResponse(
  content: string,
  finishReason = 'stop',
): object {
  return {
    choices: [
      {
        message: { content },
        finish_reason: finishReason,
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
  }
}

describe('OpenAiLlmProvider', () => {
  let provider: OpenAiLlmProvider
  let createMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    createMock = await getCreateMock()
    createMock.mockReset()
    provider = new OpenAiLlmProvider({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
    })
  })

  describe('complete', () => {
    it('returns LlmResponse with content and usage', async () => {
      createMock.mockResolvedValue(mockResponse('Hello world'))

      const messages: LlmMessage[] = [
        { role: 'user', content: 'Hi' },
      ]
      const result = await provider.complete(messages)

      expect(result.content).toBe('Hello world')
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      })
      expect(result.finishReason).toBe('stop')
    })

    it('passes temperature and max_tokens', async () => {
      createMock.mockResolvedValue(mockResponse('ok'))

      await provider.complete(
        [{ role: 'user', content: 'test' }],
        { temperature: 0.7, maxTokens: 100 },
      )

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 100,
          model: 'gpt-4o-mini',
        }),
      )
    })

    it('allows model override via options', async () => {
      createMock.mockResolvedValue(mockResponse('ok'))

      await provider.complete(
        [{ role: 'user', content: 'test' }],
        { model: 'gpt-4o' },
      )

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4o' }),
      )
    })

    it('uses max_completion_tokens for reasoning models', async () => {
      createMock.mockResolvedValue(mockResponse('ok'))

      await provider.complete(
        [{ role: 'system', content: 'sys' }, { role: 'user', content: 'test' }],
        { model: 'o1-mini' },
      )

      const call: OpenAI.ChatCompletionCreateParamsNonStreaming =
        createMock.mock.calls[0]![0]
      expect(call.max_completion_tokens).toBeDefined()
      expect(call.temperature).toBeUndefined()
      // system → developer for reasoning models
      expect(call.messages[0]!.role).toBe('developer')
    })

    it('maps finish_reason correctly', async () => {
      createMock.mockResolvedValue(mockResponse('ok', 'length'))
      const result = await provider.complete([{ role: 'user', content: 'test' }])
      expect(result.finishReason).toBe('length')
    })
  })

  describe('completeJson', () => {
    it('parses JSON response', async () => {
      createMock.mockResolvedValue(
        mockResponse('{"name":"Alice","age":30}'),
      )

      const result = await provider.completeJson<{ name: string; age: number }>(
        [{ role: 'user', content: 'give me json' }],
      )

      expect(result.parsed).toEqual({ name: 'Alice', age: 30 })
      expect(result.content).toBe('{"name":"Alice","age":30}')
    })

    it('requests json_object response format', async () => {
      createMock.mockResolvedValue(mockResponse('{}'))

      await provider.completeJson(
        [{ role: 'user', content: 'json please' }],
      )

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: 'json_object' },
        }),
      )
    })

    it('throws on invalid JSON', async () => {
      createMock.mockResolvedValue(mockResponse('not json'))

      await expect(
        provider.completeJson([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow()
    })
  })
})
