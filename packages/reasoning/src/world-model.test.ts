import { describe, it, expect, beforeEach } from 'vitest'
import { WorldModel } from './world-model.js'

describe('WorldModel', () => {
  let model: WorldModel

  beforeEach(() => {
    model = new WorldModel()
  })

  describe('addBelief', () => {
    it('adds a new belief', () => {
      const belief = model.addBelief(
        { subject: 'user', predicate: 'likes', object: 'coffee', confidence: 0.8 },
        'explicit',
      )

      expect(belief.subject).toBe('user')
      expect(belief.predicate).toBe('likes')
      expect(belief.confidence).toBe(0.8)
      expect(model.size).toBe(1)
    })

    it('updates existing belief with Bayesian update', () => {
      model.addBelief(
        { subject: 'user', predicate: 'likes', object: 'coffee', confidence: 0.5 },
        'inferred',
      )

      const updated = model.addBelief(
        { subject: 'user', predicate: 'likes', object: 'coffee', confidence: 0.9 },
        'explicit',
      )

      // Explicit source has weight 0.9, so confidence should shift significantly
      expect(updated.confidence).toBeGreaterThan(0.7)
      expect(model.size).toBe(1) // same belief, not duplicated
    })
  })

  describe('findByPredicate', () => {
    it('returns matching beliefs', () => {
      model.addBelief(
        { subject: 'user', predicate: 'likes', object: 'coffee', confidence: 0.8 },
        'explicit',
      )
      model.addBelief(
        { subject: 'user', predicate: 'likes', object: 'tea', confidence: 0.6 },
        'explicit',
      )
      model.addBelief(
        { subject: 'user', predicate: 'works_as', object: 'dev', confidence: 0.9 },
        'explicit',
      )

      expect(model.findByPredicate('likes')).toHaveLength(2)
      expect(model.findByPredicate('works_as')).toHaveLength(1)
    })
  })

  describe('confirmBelief', () => {
    it('increases confidence', () => {
      const belief = model.addBelief(
        { subject: 'user', predicate: 'likes', object: 'x', confidence: 0.5 },
        'inferred',
      )

      model.confirmBelief(belief.id)

      const found = model.findByTriple('user', 'likes', 'x')
      expect(found!.confidence).toBe(0.6)
    })
  })

  describe('weakenBelief', () => {
    it('decreases confidence', () => {
      const belief = model.addBelief(
        { subject: 'user', predicate: 'likes', object: 'x', confidence: 0.8 },
        'explicit',
      )

      model.weakenBelief(belief.id, 0.1)

      const found = model.findByTriple('user', 'likes', 'x')
      expect(found!.confidence).toBeCloseTo(0.7)
    })

    it('auto-deletes below threshold', () => {
      const belief = model.addBelief(
        { subject: 'user', predicate: 'likes', object: 'x', confidence: 0.15 },
        'inferred',
      )

      model.weakenBelief(belief.id, 0.1)

      expect(model.size).toBe(0)
    })
  })

  describe('applyDecay', () => {
    it('decays inferred beliefs faster than explicit', () => {
      model.addBelief(
        { subject: 'user', predicate: 'inferred_thing', object: 'x', confidence: 0.5 },
        'inferred',
      )
      model.addBelief(
        { subject: 'user', predicate: 'explicit_thing', object: 'y', confidence: 0.5 },
        'explicit',
      )

      model.applyDecay()

      const inferred = model.findByPredicate('inferred_thing')
      const explicit = model.findByPredicate('explicit_thing')

      expect(inferred[0]!.confidence).toBeLessThan(explicit[0]!.confidence)
    })
  })
})
