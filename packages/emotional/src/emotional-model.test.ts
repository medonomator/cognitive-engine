import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStore } from '@cognitive-engine/store-memory'
import type { Percept } from '@cognitive-engine/core'
import { EmotionalModel } from './emotional-model.js'

function makePercept(overrides: Partial<Percept> = {}): Percept {
  return {
    rawText: 'test',
    emotionalTone: 'neutral',
    urgency: 0.3,
    requestType: 'statement',
    responseMode: 'listening',
    entities: [],
    implicitNeeds: [],
    conversationPhase: 'exploration',
    confidence: 0.8,
    analysisMethod: 'quick',
    ...overrides,
  }
}

describe('EmotionalModel', () => {
  let store: MemoryStore
  let model: EmotionalModel

  beforeEach(() => {
    store = new MemoryStore()
    model = new EmotionalModel(store)
  })

  describe('update', () => {
    it('creates initial state from first percept', async () => {
      const state = await model.update(
        'user1',
        makePercept({ emotionalTone: 'happy', urgency: 0.5 }),
      )

      expect(state.currentEmotion).toBe('happy')
      expect(state.valence).toBeGreaterThan(0)
      expect(state.trend).toBe('stable')
      expect(state.history).toHaveLength(1)
    })

    it('smoothly transitions between emotions', async () => {
      await model.update(
        'user1',
        makePercept({ emotionalTone: 'happy', urgency: 0.5 }),
      )

      const state = await model.update(
        'user1',
        makePercept({ emotionalTone: 'sad', urgency: 0.6 }),
      )

      // Should be blended, not pure sad
      expect(state.valence).toBeGreaterThan(-0.7)
      expect(state.valence).toBeLessThan(0.8)
      expect(state.history).toHaveLength(2)
    })

    it('tracks emotion history', async () => {
      for (let i = 0; i < 5; i++) {
        await model.update(
          'user1',
          makePercept({ emotionalTone: i % 2 === 0 ? 'happy' : 'sad' }),
        )
      }

      const state = await model.getState('user1')
      expect(state!.history).toHaveLength(5)
    })

    it('caps history at maxHistory', async () => {
      model = new EmotionalModel(store, { maxHistory: 3 })

      for (let i = 0; i < 5; i++) {
        await model.update(
          'user1',
          makePercept({ emotionalTone: 'happy' }),
        )
      }

      const state = await model.getState('user1')
      expect(state!.history).toHaveLength(3)
    })
  })

  describe('trend detection', () => {
    it('detects improving trend', async () => {
      await model.update(
        'user1',
        makePercept({ emotionalTone: 'sad', urgency: 0.3 }),
      )
      await model.update(
        'user1',
        makePercept({ emotionalTone: 'neutral', urgency: 0.3 }),
      )
      const state = await model.update(
        'user1',
        makePercept({ emotionalTone: 'happy', urgency: 0.3 }),
      )

      expect(state.trend).toBe('improving')
    })

    it('detects declining trend', async () => {
      await model.update(
        'user1',
        makePercept({ emotionalTone: 'happy', urgency: 0.3 }),
      )
      await model.update(
        'user1',
        makePercept({ emotionalTone: 'neutral', urgency: 0.3 }),
      )
      const state = await model.update(
        'user1',
        makePercept({ emotionalTone: 'sad', urgency: 0.3 }),
      )

      expect(state.trend).toBe('declining')
    })

    it('detects stable trend', async () => {
      await model.update(
        'user1',
        makePercept({ emotionalTone: 'neutral', urgency: 0.3 }),
      )
      await model.update(
        'user1',
        makePercept({ emotionalTone: 'neutral', urgency: 0.3 }),
      )
      const state = await model.update(
        'user1',
        makePercept({ emotionalTone: 'neutral', urgency: 0.3 }),
      )

      expect(state.trend).toBe('stable')
    })
  })

  describe('getContext', () => {
    it('returns empty context for unknown user', async () => {
      const ctx = await model.getContext('unknown')
      expect(ctx.currentState).toBeNull()
      expect(ctx.dominantEmotion).toBe('neutral')
      expect(ctx.volatility).toBe(0)
      expect(ctx.formattedContext).toBe('')
    })

    it('returns formatted context with state', async () => {
      await model.update(
        'user1',
        makePercept({ emotionalTone: 'anxious', urgency: 0.7 }),
      )

      const ctx = await model.getContext('user1')
      expect(ctx.currentState).not.toBeNull()
      expect(ctx.dominantEmotion).toBe('anxious')
      expect(ctx.formattedContext).toContain('anxious')
      expect(ctx.formattedContext).toContain('Trend')
    })

    it('calculates volatility from rapid changes', async () => {
      const emotions = ['happy', 'sad', 'angry', 'happy', 'sad']
      for (const e of emotions) {
        await model.update('user1', makePercept({ emotionalTone: e }))
      }

      const ctx = await model.getContext('user1')
      expect(ctx.volatility).toBeGreaterThan(0)
    })
  })

  describe('emotionToVAD', () => {
    it('maps known emotions to VAD', () => {
      const happy = model.emotionToVAD('happy')
      expect(happy.valence).toBeGreaterThan(0)
      expect(happy.arousal).toBeGreaterThan(0)

      const sad = model.emotionToVAD('sad')
      expect(sad.valence).toBeLessThan(0)
    })

    it('returns default for unknown emotions', () => {
      const unknown = model.emotionToVAD('xyzzy')
      expect(unknown.valence).toBe(0)
    })
  })
})
