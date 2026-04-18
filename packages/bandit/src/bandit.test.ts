import { describe, it, expect, beforeEach } from 'vitest'
import { ThompsonBandit } from './bandit.js'
import { MemoryBanditStorage } from './memory-storage.js'

describe('ThompsonBandit', () => {
  let storage: MemoryBanditStorage
  let bandit: ThompsonBandit

  beforeEach(() => {
    storage = new MemoryBanditStorage()
    bandit = new ThompsonBandit(storage, {
      explorationRate: 0, // disable random exploration for deterministic tests
      noiseVariance: 1.0,
      initialVariance: 1000,
    })
  })

  describe('select', () => {
    it('throws when no actions available', async () => {
      await expect(bandit.select([1, 0])).rejects.toThrow('No actions available')
    })

    it('selects from initialized actions', async () => {
      await bandit.initAction('a', 2)
      await bandit.initAction('b', 2)

      const choice = await bandit.select([1, 0], ['a', 'b'])

      expect(['a', 'b']).toContain(choice.actionId)
      expect(choice.wasExploration).toBe(false)
      expect(typeof choice.expectedReward).toBe('number')
    })

    it('uses explicit action list if provided', async () => {
      await bandit.initAction('a', 2)
      await bandit.initAction('b', 2)
      await bandit.initAction('c', 2)

      const choice = await bandit.select([1, 0], ['a', 'b'])

      expect(['a', 'b']).toContain(choice.actionId)
    })

    it('prefers trained action over untrained', async () => {
      await bandit.initAction('good', 2)
      await bandit.initAction('bad', 2)

      // Train 'good' with positive rewards many times
      for (let i = 0; i < 50; i++) {
        await bandit.update('good', [1, 0], 1.0)
        await bandit.update('bad', [1, 0], -1.0)
      }

      // Select multiple times, 'good' should win consistently
      let goodCount = 0
      for (let i = 0; i < 20; i++) {
        const choice = await bandit.select([1, 0], ['good', 'bad'])
        if (choice.actionId === 'good') goodCount++
      }

      // With 50 training rounds, 'good' should dominate
      expect(goodCount).toBeGreaterThan(15)
    })
  })

  describe('exploration', () => {
    it('explores randomly with explorationRate=1', async () => {
      const exploreBandit = new ThompsonBandit(storage, {
        explorationRate: 1.0, // always explore
      })

      await bandit.initAction('a', 2)
      await bandit.initAction('b', 2)

      const choice = await exploreBandit.select([1, 0], ['a', 'b'])
      expect(choice.wasExploration).toBe(true)
    })
  })

  describe('update', () => {
    it('updates posterior params', async () => {
      await bandit.initAction('a', 3)

      const before = await storage.getParams('a')
      expect(before).not.toBeNull()
      const muBefore = before!.mu.slice()

      await bandit.update('a', [1, 0, 0], 5.0)

      const after = await storage.getParams('a')
      expect(after).not.toBeNull()

      // mu should shift toward the reward direction
      expect(after!.mu[0]).not.toBe(muBefore[0])
      // sigma should decrease (more certain)
      expect(after!.sigma[0]!).toBeLessThan(before!.sigma[0]!)
    })

    it('creates params if action not yet initialized', async () => {
      await bandit.update('new_action', [1, 0], 1.0)

      const params = await storage.getParams('new_action')
      expect(params).not.toBeNull()
      expect(params!.mu).toHaveLength(2)
    })

    it('converges mu in 1D case', async () => {
      // True model: reward = 5 * x
      await bandit.initAction('test', 1)

      for (let i = 0; i < 500; i++) {
        const x = [1]
        await bandit.update('test', x, 5.0)
      }

      const params = await storage.getParams('test')
      expect(params).not.toBeNull()

      // mu[0] should converge toward 5
      expect(Math.abs(params!.mu[0]! - 5)).toBeLessThan(0.5)
    })
  })

  describe('initAction', () => {
    it('creates flat prior', async () => {
      await bandit.initAction('x', 4)

      const params = await storage.getParams('x')
      expect(params).not.toBeNull()
      expect(params!.mu).toEqual([0, 0, 0, 0])
      expect(params!.sigma).toEqual([1000, 1000, 1000, 1000])
    })
  })
})
