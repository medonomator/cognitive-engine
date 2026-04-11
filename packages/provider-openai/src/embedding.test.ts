import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAiEmbeddingProvider } from './embedding.js'

// Mock OpenAI
vi.mock('openai', () => {
  const embeddingsCreateMock = vi.fn()
  return {
    default: class {
      embeddings = { create: embeddingsCreateMock }
    },
    __embeddingsCreateMock: embeddingsCreateMock,
  }
})

async function getCreateMock(): Promise<ReturnType<typeof vi.fn>> {
  const mod = await import('openai')
  return (mod as unknown as { __embeddingsCreateMock: ReturnType<typeof vi.fn> })
    .__embeddingsCreateMock
}

describe('OpenAiEmbeddingProvider', () => {
  let provider: OpenAiEmbeddingProvider
  let createMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    createMock = await getCreateMock()
    createMock.mockReset()
    provider = new OpenAiEmbeddingProvider({
      apiKey: 'test-key',
      dimensions: 3,
    })
  })

  describe('embed', () => {
    it('returns embedding vector', async () => {
      createMock.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
      })

      const result = await provider.embed('hello')

      expect(result).toEqual([0.1, 0.2, 0.3])
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
          input: 'hello',
          dimensions: 3,
        }),
      )
    })

    it('throws on empty response', async () => {
      createMock.mockResolvedValue({ data: [] })

      await expect(provider.embed('test')).rejects.toThrow(
        'empty response',
      )
    })
  })

  describe('embedBatch', () => {
    it('returns embeddings sorted by index', async () => {
      createMock.mockResolvedValue({
        data: [
          { embedding: [0.4, 0.5, 0.6], index: 1 },
          { embedding: [0.1, 0.2, 0.3], index: 0 },
        ],
      })

      const result = await provider.embedBatch(['hello', 'world'])

      expect(result).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ])
    })

    it('returns empty array for empty input', async () => {
      const result = await provider.embedBatch([])
      expect(result).toEqual([])
      expect(createMock).not.toHaveBeenCalled()
    })
  })

  describe('dimensions', () => {
    it('exposes configured dimensions', () => {
      expect(provider.dimensions).toBe(3)
    })

    it('defaults to 1536', () => {
      const defaultProvider = new OpenAiEmbeddingProvider({ apiKey: 'key' })
      expect(defaultProvider.dimensions).toBe(1536)
    })
  })
})
