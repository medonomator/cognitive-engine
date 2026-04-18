import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SemanticMemory } from './semantic-memory.js'
import { MemoryStore } from '@cognitive-engine/store-memory'
import type { Fact, EmbeddingProvider } from '@cognitive-engine/core'

function createMockEmbedding(): EmbeddingProvider {
  return {
    dimensions: 3,
    embed: vi.fn().mockResolvedValue([1, 0, 0]),
    embedBatch: vi.fn().mockResolvedValue([[1, 0, 0]]),
  }
}

function makeFact(overrides: Partial<Fact> = {}): Fact {
  const now = new Date()
  return {
    id: `fact_${Math.random().toString(36).slice(2)}`,
    userId: 'user1',
    subject: 'user',
    predicate: 'works_at',
    object: 'Google',
    confidence: 0.8,
    source: 'explicit',
    evidence: ['I work at Google'],
    embedding: [1, 0, 0],
    createdAt: now,
    updatedAt: now,
    accessCount: 0,
    ...overrides,
  }
}

describe('SemanticMemory', () => {
  let store: MemoryStore
  let embedding: EmbeddingProvider
  let memory: SemanticMemory

  beforeEach(() => {
    store = new MemoryStore()
    embedding = createMockEmbedding()
    memory = new SemanticMemory(store, embedding)
  })

  describe('store and get', () => {
    it('stores and retrieves a fact', async () => {
      const fact = makeFact({ id: 'fact_1' })
      await memory.storeFact(fact)

      const retrieved = await memory.get('fact_1')
      expect(retrieved).not.toBeNull()
      expect(retrieved!.subject).toBe('user')
      expect(retrieved!.predicate).toBe('works_at')
      expect(retrieved!.object).toBe('Google')
    })

    it('returns null for missing fact', async () => {
      expect(await memory.get('missing')).toBeNull()
    })
  })

  describe('reinforcement', () => {
    it('reinforces confidence when storing duplicate fact', async () => {
      const fact1 = makeFact({ id: 'fact_1', confidence: 0.7 })
      await memory.storeFact(fact1)

      const duplicate = makeFact({
        id: 'fact_2',
        confidence: 0.8,
        evidence: ['I mentioned I work at Google again'],
      })
      await memory.storeFact(duplicate)

      // Original fact should have boosted confidence
      const retrieved = await memory.get('fact_1')
      expect(retrieved).not.toBeNull()
      expect(retrieved!.confidence).toBeGreaterThan(0.7)

      // Duplicate should NOT be stored separately
      const dup = await memory.get('fact_2')
      expect(dup).toBeNull()
    })

    it('caps confidence at maxConfidence', async () => {
      const fact = makeFact({ id: 'fact_1', confidence: 0.95 })
      await memory.storeFact(fact)

      // Reinforce multiple times
      for (let i = 0; i < 5; i++) {
        await memory.storeFact(
          makeFact({ evidence: [`mention ${i}`] }),
        )
      }

      const retrieved = await memory.get('fact_1')
      expect(retrieved!.confidence).toBeLessThanOrEqual(0.99)
    })

    it('merges evidence without duplicates', async () => {
      const fact = makeFact({
        id: 'fact_1',
        evidence: ['I work at Google'],
      })
      await memory.storeFact(fact)

      await memory.storeFact(
        makeFact({
          evidence: ['I work at Google', 'Mentioned Google again'],
        }),
      )

      const retrieved = await memory.get('fact_1')
      expect(retrieved!.evidence).toContain('I work at Google')
      expect(retrieved!.evidence).toContain('Mentioned Google again')
      // No duplicates
      const googleCount = retrieved!.evidence.filter(
        (e) => e === 'I work at Google',
      ).length
      expect(googleCount).toBe(1)
    })
  })

  describe('conflict resolution', () => {
    it('reduces confidence of conflicting facts', async () => {
      const old = makeFact({
        id: 'fact_old',
        subject: 'user',
        predicate: 'works_at',
        object: 'Google',
        confidence: 0.8,
      })
      await memory.storeFact(old)

      const updated = makeFact({
        id: 'fact_new',
        subject: 'user',
        predicate: 'works_at',
        object: 'Meta',
        confidence: 0.9,
      })
      await memory.storeFact(updated)

      // Old fact should have reduced confidence
      const oldFact = await memory.get('fact_old')
      expect(oldFact!.confidence).toBeLessThan(0.8)

      // New fact should exist
      const newFact = await memory.get('fact_new')
      expect(newFact).not.toBeNull()
      expect(newFact!.object).toBe('Meta')
    })

    it('deletes conflicting fact if confidence drops below minimum', async () => {
      const old = makeFact({
        id: 'fact_old',
        subject: 'user',
        predicate: 'works_at',
        object: 'Google',
        confidence: 0.4, // Low enough that 0.4 * 0.5 = 0.2 < 0.3 default min
      })
      await memory.storeFact(old)

      await memory.storeFact(
        makeFact({
          id: 'fact_new',
          subject: 'user',
          predicate: 'works_at',
          object: 'Meta',
        }),
      )

      const oldFact = await memory.get('fact_old')
      expect(oldFact).toBeNull()
    })
  })

  describe('search', () => {
    it('returns facts sorted by combined score', async () => {
      const high = makeFact({
        id: 'high',
        confidence: 0.9,
        embedding: [0.95, 0.05, 0],
      })
      const low = makeFact({
        id: 'low',
        predicate: 'lives_in',
        object: 'NYC',
        confidence: 0.4,
        embedding: [0.5, 0.5, 0],
      })

      await memory.storeFact(high)
      await memory.storeFact(low)

      const results = await memory.search({
        userId: 'user1',
        query: 'work',
      })

      expect(results.length).toBeGreaterThanOrEqual(1)
      if (results.length >= 2) {
        expect(results[0]!.combinedScore).toBeGreaterThanOrEqual(
          results[1]!.combinedScore,
        )
      }
    })

    it('filters by subject', async () => {
      await memory.storeFact(
        makeFact({ id: 'f1', subject: 'user' }),
      )
      await memory.storeFact(
        makeFact({ id: 'f2', subject: 'wife', predicate: 'name', object: 'Anna' }),
      )

      const results = await memory.search({
        userId: 'user1',
        subject: 'wife',
      })

      expect(results.every((r) => r.fact.subject === 'wife')).toBe(true)
    })

    it('filters by predicate', async () => {
      await memory.storeFact(
        makeFact({ id: 'f1', predicate: 'works_at' }),
      )
      await memory.storeFact(
        makeFact({ id: 'f2', predicate: 'likes', object: 'coffee' }),
      )

      const results = await memory.search({
        userId: 'user1',
        predicate: 'likes',
      })

      expect(results.every((r) => r.fact.predicate === 'likes')).toBe(true)
    })

    it('filters by minConfidence', async () => {
      await memory.storeFact(
        makeFact({ id: 'f1', confidence: 0.9, predicate: 'likes', object: 'tea' }),
      )
      await memory.storeFact(
        makeFact({ id: 'f2', confidence: 0.35, predicate: 'likes', object: 'jazz' }),
      )

      const results = await memory.search({
        userId: 'user1',
        minConfidence: 0.5,
      })

      expect(results.every((r) => r.fact.confidence >= 0.5)).toBe(true)
    })
  })

  describe('getFactsAbout', () => {
    it('returns all facts for a subject', async () => {
      await memory.storeFact(makeFact({ id: 'f1', subject: 'user' }))
      await memory.storeFact(
        makeFact({ id: 'f2', subject: 'user', predicate: 'likes', object: 'coffee' }),
      )
      await memory.storeFact(
        makeFact({ id: 'f3', subject: 'boss', predicate: 'name', object: 'Tom' }),
      )

      const facts = await memory.getFactsAbout('user1', 'user')
      expect(facts).toHaveLength(2)
      expect(facts.every((f) => f.subject === 'user')).toBe(true)
    })

    it('is case-insensitive', async () => {
      await memory.storeFact(makeFact({ id: 'f1', subject: 'User' }))

      const facts = await memory.getFactsAbout('user1', 'user')
      expect(facts).toHaveLength(1)
    })
  })

  describe('getFactsByPredicate', () => {
    it('returns all facts with a specific predicate', async () => {
      await memory.storeFact(makeFact({ id: 'f1', predicate: 'likes', object: 'coffee' }))
      await memory.storeFact(makeFact({ id: 'f2', predicate: 'likes', object: 'tea' }))
      await memory.storeFact(makeFact({ id: 'f3', predicate: 'works_at' }))

      const facts = await memory.getFactsByPredicate('user1', 'likes')
      expect(facts).toHaveLength(2)
    })
  })

  describe('getContext', () => {
    it('returns formatted context with facts grouped by subject', async () => {
      await memory.storeFact(makeFact({ id: 'f1', subject: 'user', predicate: 'works_at', object: 'Google' }))
      await memory.storeFact(makeFact({ id: 'f2', subject: 'user', predicate: 'likes', object: 'coffee' }))

      const context = await memory.getContext('user1')
      expect(context.relevantFacts).toHaveLength(2)
      expect(context.subjectFacts.get('user')).toHaveLength(2)
      expect(context.formattedContext).toContain('user:')
      expect(context.formattedContext).toContain('works_at: Google')
      expect(context.formattedContext).toContain('likes: coffee')
    })

    it('returns empty context when no facts exist', async () => {
      const context = await memory.getContext('user1')
      expect(context.relevantFacts).toHaveLength(0)
      expect(context.formattedContext).toBe('')
    })
  })

  describe('updateFact', () => {
    it('updates fact object and embedding', async () => {
      await memory.storeFact(makeFact({ id: 'f1' }))

      await memory.updateFact('f1', 'Meta', 'User switched jobs')

      const updated = await memory.get('f1')
      expect(updated!.object).toBe('Meta')
      expect(updated!.evidence).toContain('User switched jobs')
    })

    it('does nothing for missing fact', async () => {
      await expect(
        memory.updateFact('missing', 'value'),
      ).resolves.toBeUndefined()
    })
  })

  describe('deleteFact', () => {
    it('removes a fact', async () => {
      await memory.storeFact(makeFact({ id: 'f1' }))
      await memory.deleteFact('f1')

      expect(await memory.get('f1')).toBeNull()
    })
  })

  describe('recordAccess', () => {
    it('increments access count', async () => {
      await memory.storeFact(makeFact({ id: 'f1', accessCount: 0 }))

      await memory.recordAccess('f1')

      const fact = await memory.get('f1')
      expect(fact!.accessCount).toBe(1)
      expect(fact!.lastAccessed).toBeDefined()
    })

    it('does nothing for missing fact', async () => {
      await expect(memory.recordAccess('missing')).resolves.toBeUndefined()
    })
  })
})
