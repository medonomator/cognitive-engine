import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStore } from './index.js'

describe('MemoryStore', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = new MemoryStore()
  })

  describe('get/set', () => {
    it('stores and retrieves a record', async () => {
      await store.set('users', '1', { name: 'Alice', age: 30 })
      const result = await store.get<{ name: string; age: number }>('users', '1')
      expect(result).toEqual({ name: 'Alice', age: 30 })
    })

    it('returns null for missing record', async () => {
      expect(await store.get('users', 'missing')).toBeNull()
    })

    it('overwrites on set', async () => {
      await store.set('users', '1', { name: 'Alice' })
      await store.set('users', '1', { name: 'Bob' })
      const result = await store.get<{ name: string }>('users', '1')
      expect(result?.name).toBe('Bob')
    })
  })

  describe('delete', () => {
    it('removes a record', async () => {
      await store.set('users', '1', { name: 'Alice' })
      await store.delete('users', '1')
      expect(await store.get('users', '1')).toBeNull()
    })

    it('does not throw for missing record', async () => {
      await expect(store.delete('users', 'missing')).resolves.toBeUndefined()
    })
  })

  describe('find', () => {
    beforeEach(async () => {
      await store.set('items', '1', { type: 'a', value: 10, createdAt: 1 })
      await store.set('items', '2', { type: 'b', value: 20, createdAt: 2 })
      await store.set('items', '3', { type: 'a', value: 30, createdAt: 3 })
      await store.set('items', '4', { type: 'b', value: 40, createdAt: 4 })
    })

    it('finds all records without filter', async () => {
      const results = await store.find('items', {})
      expect(results).toHaveLength(4)
    })

    it('filters by where', async () => {
      const results = await store.find('items', { where: { type: 'a' } })
      expect(results).toHaveLength(2)
    })

    it('applies limit', async () => {
      const results = await store.find('items', { limit: 2 })
      expect(results).toHaveLength(2)
    })

    it('applies offset', async () => {
      const results = await store.find('items', { offset: 2, limit: 10 })
      expect(results).toHaveLength(2)
    })

    it('sorts by field ascending', async () => {
      const results = await store.find<{ value: number }>('items', {
        orderBy: { value: 'asc' },
      })
      expect(results.map((r) => r.value)).toEqual([10, 20, 30, 40])
    })

    it('sorts by field descending', async () => {
      const results = await store.find<{ value: number }>('items', {
        orderBy: { value: 'desc' },
      })
      expect(results.map((r) => r.value)).toEqual([40, 30, 20, 10])
    })

    it('combines where + orderBy + limit', async () => {
      const results = await store.find<{ type: string; value: number }>('items', {
        where: { type: 'b' },
        orderBy: { value: 'desc' },
        limit: 1,
      })
      expect(results).toHaveLength(1)
      expect(results[0]?.value).toBe(40)
    })
  })

  describe('upsert', () => {
    it('creates if not exists', async () => {
      await store.upsert('users', '1', { name: 'Alice' })
      expect(await store.get('users', '1')).toEqual({ name: 'Alice' })
    })

    it('updates if exists', async () => {
      await store.set('users', '1', { name: 'Alice' })
      await store.upsert('users', '1', { name: 'Bob' })
      const result = await store.get<{ name: string }>('users', '1')
      expect(result?.name).toBe('Bob')
    })
  })

  describe('vectorSearch', () => {
    it('finds similar vectors', async () => {
      await store.set('docs', '1', { text: 'hello', embedding: [1, 0, 0] })
      await store.set('docs', '2', { text: 'world', embedding: [0, 1, 0] })
      await store.set('docs', '3', { text: 'similar', embedding: [0.9, 0.1, 0] })

      const results = await store.vectorSearch('docs', [1, 0, 0], {
        topK: 2,
        threshold: 0.5,
      })

      expect(results).toHaveLength(2)
      expect(results[0]!.id).toBe('1')          // exact match
      expect(results[0]!.similarity).toBeCloseTo(1)
      expect(results[1]!.id).toBe('3')          // similar
    })

    it('respects threshold', async () => {
      await store.set('docs', '1', { text: 'a', embedding: [1, 0] })
      await store.set('docs', '2', { text: 'b', embedding: [0, 1] })

      const results = await store.vectorSearch('docs', [1, 0], {
        topK: 10,
        threshold: 0.9,
      })

      expect(results).toHaveLength(1) // only exact match passes 0.9
    })

    it('respects topK', async () => {
      for (let i = 0; i < 10; i++) {
        await store.set('docs', String(i), {
          embedding: [Math.cos(i * 0.1), Math.sin(i * 0.1)],
        })
      }

      const results = await store.vectorSearch('docs', [1, 0], {
        topK: 3,
        threshold: 0,
      })

      expect(results).toHaveLength(3)
    })

    it('applies additional filter', async () => {
      await store.set('docs', '1', { type: 'a', embedding: [1, 0] })
      await store.set('docs', '2', { type: 'b', embedding: [1, 0] })

      const results = await store.vectorSearch('docs', [1, 0], {
        topK: 10,
        threshold: 0,
        filter: { type: 'a' },
      })

      expect(results).toHaveLength(1)
      expect(results[0]!.id).toBe('1')
    })

    it('skips records without vectors', async () => {
      await store.set('docs', '1', { text: 'no vector' })
      await store.set('docs', '2', { text: 'has vector', embedding: [1, 0] })

      const results = await store.vectorSearch('docs', [1, 0], {
        topK: 10,
        threshold: 0,
      })

      expect(results).toHaveLength(1)
    })

    it('also extracts "vector" field (not just "embedding")', async () => {
      await store.set('docs', '1', { vector: [1, 0, 0] })

      const results = await store.vectorSearch('docs', [1, 0, 0], {
        topK: 1,
        threshold: 0.9,
      })

      expect(results).toHaveLength(1)
    })
  })

  describe('clear', () => {
    it('clears all data', async () => {
      await store.set('a', '1', { x: 1 })
      await store.set('b', '2', { x: 2 })
      expect(store.size).toBe(2)

      store.clear()
      expect(store.size).toBe(0)
    })

    it('clears specific collection', async () => {
      await store.set('a', '1', { x: 1 })
      await store.set('b', '2', { x: 2 })

      store.clearCollection('a')
      expect(await store.get('a', '1')).toBeNull()
      expect(await store.get('b', '2')).toEqual({ x: 2 })
    })
  })
})
