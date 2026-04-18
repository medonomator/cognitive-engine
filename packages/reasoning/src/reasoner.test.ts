import { describe, it, expect, beforeEach } from 'vitest'
import { Reasoner } from './reasoner.js'
import type { Percept } from '@cognitive-engine/core'

function makePercept(overrides: Partial<Percept> = {}): Percept {
  return {
    rawText: 'test message',
    emotionalTone: 'neutral',
    urgency: 0,
    requestType: 'question',
    responseMode: 'informing',
    entities: [],
    implicitNeeds: [],
    conversationPhase: 'opening',
    confidence: 0.8,
    analysisMethod: 'quick',
    ...overrides,
  }
}

describe('Reasoner', () => {
  const userId = 'user-1'
  let reasoner: Reasoner

  beforeEach(() => {
    reasoner = new Reasoner()
  })

  describe('reason', () => {
    it('returns a valid reasoning result', () => {
      const result = reasoner.reason(userId, makePercept())

      expect(result.intentions).toBeDefined()
      expect(result.intentions.length).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('generates inform intention for questions', () => {
      const result = reasoner.reason(
        userId,
        makePercept({ requestType: 'question' }),
      )

      expect(result.intentions[0]!.type).toBe('inform')
    })

    it('generates empathize-only in listening mode', () => {
      const result = reasoner.reason(
        userId,
        makePercept({
          responseMode: 'listening',
          requestType: 'venting',
          emotionalTone: 'frustrated',
        }),
      )

      expect(result.intentions).toHaveLength(1)
      expect(result.intentions[0]!.type).toBe('empathize')
    })

    it('adds empathize for negative emotions', () => {
      const result = reasoner.reason(
        userId,
        makePercept({
          responseMode: 'advising',
          emotionalTone: 'frustrated',
          requestType: 'advice',
        }),
      )

      const types = result.intentions.map((i) => i.type)
      expect(types).toContain('empathize')
      expect(types).toContain('suggest')
    })

    it('infers beliefs from urgency', () => {
      const result = reasoner.reason(
        userId,
        makePercept({ urgency: 9 }),
      )

      expect(result.newBeliefs).toContainEqual(
        expect.objectContaining({
          predicate: 'values',
          object: 'speed',
        }),
      )
    })

    it('suggests clarification when few beliefs', () => {
      const result = reasoner.reason(userId, makePercept())

      expect(result.questionsToAsk.length).toBeGreaterThan(0)
    })

    it('updates working memory', () => {
      reasoner.reason(userId, makePercept({ rawText: 'first message' }))
      reasoner.reason(
        userId,
        makePercept({
          rawText: 'second message',
          entities: [{ type: 'person', value: 'Alice', confidence: 0.9 }],
        }),
      )

      const wm = reasoner.getWorkingMemory(userId).getItems()
      expect(wm.length).toBeGreaterThan(0)
      expect(wm.some((item) => item.content.includes('Alice'))).toBe(true)
    })

    it('generates hypotheses from implicit needs', () => {
      const result = reasoner.reason(
        userId,
        makePercept({ implicitNeeds: ['motivation', 'clarity'] }),
      )

      expect(result.hypotheses).toHaveLength(2)
      expect(result.hypotheses[0]).toContain('motivation')
    })
  })

  describe('user isolation', () => {
    it('maintains separate beliefs per user', () => {
      reasoner.reason('user-a', makePercept({ urgency: 9 }))
      reasoner.reason('user-b', makePercept({ urgency: 0 }))

      const beliefsA = reasoner.getWorldModel('user-a').getBeliefs()
      const beliefsB = reasoner.getWorldModel('user-b').getBeliefs()

      expect(beliefsA.some((b) => b.predicate === 'values' && b.object === 'speed')).toBe(true)
      expect(beliefsB.some((b) => b.predicate === 'values' && b.object === 'speed')).toBe(false)
    })

    it('maintains separate working memory per user', () => {
      reasoner.reason('user-a', makePercept({ rawText: 'alpha message' }))
      reasoner.reason('user-b', makePercept({ rawText: 'beta message' }))

      const wmA = reasoner.getWorkingMemory('user-a').getItems()
      const wmB = reasoner.getWorkingMemory('user-b').getItems()

      expect(wmA.some((item) => item.content === 'alpha message')).toBe(true)
      expect(wmA.some((item) => item.content === 'beta message')).toBe(false)
      expect(wmB.some((item) => item.content === 'beta message')).toBe(true)
      expect(wmB.some((item) => item.content === 'alpha message')).toBe(false)
    })

    it('clearUser removes only that user state', () => {
      reasoner.reason('user-a', makePercept({ urgency: 9 }))
      reasoner.reason('user-b', makePercept({ urgency: 9 }))

      reasoner.clearUser('user-a')

      expect(reasoner.getWorldModel('user-a').size).toBe(0)
      expect(reasoner.getWorldModel('user-b').size).toBeGreaterThan(0)
    })
  })

  describe('getState', () => {
    it('returns current cognitive state', () => {
      reasoner.reason(userId, makePercept())

      const state = reasoner.getState(userId)
      expect(state.beliefs).toBeDefined()
      expect(state.workingMemory).toBeDefined()
      expect(state.lastUpdated).toBeInstanceOf(Date)
    })
  })

  describe('custom inference rules', () => {
    it('supports custom rules', () => {
      const customReasoner = new Reasoner({
        customRules: [
          {
            name: 'test_rule',
            condition: (percept) => percept.rawText.includes('test'),
            action: () => ({
              subject: 'user',
              predicate: 'is_testing',
              object: 'true',
              confidence: 0.9,
            }),
          },
        ],
      })

      const result = customReasoner.reason(userId, makePercept({ rawText: 'this is a test' }))

      expect(result.newBeliefs).toContainEqual(
        expect.objectContaining({ predicate: 'is_testing' }),
      )
    })
  })
})
