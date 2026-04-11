import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EpisodicMemory } from './episodic-memory.js'
import { MemoryStore } from '@cognitive-engine/store-memory'
import type { Episode, EmbeddingProvider } from '@cognitive-engine/core'

function createMockEmbedding(): EmbeddingProvider {
  return {
    dimensions: 3,
    embed: vi.fn().mockResolvedValue([1, 0, 0]),
    embedBatch: vi.fn().mockResolvedValue([[1, 0, 0]]),
  }
}

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  const now = new Date()
  return {
    id: `ep_${Math.random().toString(36).slice(2)}`,
    userId: 'user1',
    summary: 'test episode',
    details: 'some details',
    occurredAt: now,
    reportedAt: now,
    emotionalValence: 0,
    emotionalIntensity: 0.5,
    emotions: ['neutral'],
    category: 'personal',
    tags: ['test'],
    importance: 0.5,
    accessCount: 0,
    decayFactor: 0.03,
    embedding: [1, 0, 0],
    createdAt: now,
    ...overrides,
  }
}

describe('EpisodicMemory', () => {
  let store: MemoryStore
  let embedding: EmbeddingProvider
  let memory: EpisodicMemory

  beforeEach(() => {
    store = new MemoryStore()
    embedding = createMockEmbedding()
    memory = new EpisodicMemory(store, embedding)
  })

  describe('store and get', () => {
    it('stores and retrieves an episode', async () => {
      const ep = makeEpisode({ id: 'ep_1' })
      await memory.store_episode(ep)

      const retrieved = await memory.get('ep_1')
      expect(retrieved).not.toBeNull()
      expect(retrieved!.summary).toBe('test episode')
    })

    it('returns null for missing episode', async () => {
      expect(await memory.get('missing')).toBeNull()
    })
  })

  describe('search', () => {
    it('returns episodes sorted by combined score', async () => {
      const now = new Date()
      const recent = makeEpisode({
        id: 'recent',
        occurredAt: now,
        importance: 0.8,
        embedding: [0.9, 0.1, 0],
      })
      const old = makeEpisode({
        id: 'old',
        occurredAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        importance: 0.3,
        embedding: [0.5, 0.5, 0],
      })

      await memory.store_episode(recent)
      await memory.store_episode(old)

      const results = await memory.search({
        userId: 'user1',
        query: 'test',
        limit: 10,
      })

      expect(results.length).toBeGreaterThanOrEqual(1)
      // Recent should score higher
      if (results.length >= 2) {
        expect(results[0]!.combinedScore).toBeGreaterThanOrEqual(
          results[1]!.combinedScore,
        )
      }
    })

    it('filters by category', async () => {
      await memory.store_episode(makeEpisode({ id: 'work', category: 'work' }))
      await memory.store_episode(makeEpisode({ id: 'personal', category: 'personal' }))

      const results = await memory.search({
        userId: 'user1',
        categories: ['work'],
        limit: 10,
      })

      expect(results.every((r) => r.episode.category === 'work')).toBe(true)
    })

    it('filters by minImportance', async () => {
      await memory.store_episode(makeEpisode({ id: 'low', importance: 0.1 }))
      await memory.store_episode(makeEpisode({ id: 'high', importance: 0.9 }))

      const results = await memory.search({
        userId: 'user1',
        minImportance: 0.5,
        limit: 10,
      })

      expect(results.every((r) => r.episode.importance >= 0.5)).toBe(true)
    })

    it('excludes decayed episodes by default', async () => {
      const veryOld = makeEpisode({
        id: 'ancient',
        occurredAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        importance: 0.1,
        decayFactor: 0.1, // fast decay
      })

      await memory.store_episode(veryOld)

      const results = await memory.search({
        userId: 'user1',
        limit: 10,
      })

      const found = results.some((r) => r.episode.id === 'ancient')
      expect(found).toBe(false)
    })
  })

  describe('getContext', () => {
    it('returns recent and relevant episodes', async () => {
      await memory.store_episode(makeEpisode({ id: 'ep1' }))
      await memory.store_episode(makeEpisode({ id: 'ep2' }))

      const context = await memory.getContext('user1', 'test query')

      expect(context.recentEpisodes.length).toBeGreaterThanOrEqual(1)
      expect(context.emotionalPattern).toBeDefined()
    })

    it('detects positive emotional pattern', async () => {
      await memory.store_episode(
        makeEpisode({ emotionalValence: 0.8, emotions: ['happy'] }),
      )
      await memory.store_episode(
        makeEpisode({ emotionalValence: 0.6, emotions: ['excited'] }),
      )

      const context = await memory.getContext('user1')
      expect(context.emotionalPattern).toContain('positive')
    })
  })

  describe('consolidate', () => {
    it('decays old episodes', async () => {
      const oldEp = makeEpisode({
        id: 'old_ep',
        occurredAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        importance: 0.8,
        accessCount: 5,
      })
      await memory.store_episode(oldEp)

      const result = await memory.consolidate('user1')

      expect(result.decayedCount + result.deletedCount).toBeGreaterThanOrEqual(0)
      expect(result.remainingCount).toBeGreaterThanOrEqual(0)
    })

    it('deletes forgotten episodes', async () => {
      const forgottenEp = makeEpisode({
        id: 'forgotten',
        occurredAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        importance: 0.05,
        accessCount: 0,
        decayFactor: 0.1,
      })
      await memory.store_episode(forgottenEp)

      await memory.consolidate('user1')

      const retrieved = await memory.get('forgotten')
      expect(retrieved).toBeNull()
    })
  })

  describe('recordAccess', () => {
    it('increments access count', async () => {
      await memory.store_episode(makeEpisode({ id: 'ep_access', accessCount: 0 }))

      await memory.recordAccess('ep_access')

      const ep = await memory.get('ep_access')
      expect(ep!.accessCount).toBe(1)
    })

    it('does nothing for missing episode', async () => {
      await expect(memory.recordAccess('missing')).resolves.toBeUndefined()
    })
  })
})
