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
  let reasoner: Reasoner

  beforeEach(() => {
    reasoner = new Reasoner()
  })

  describe('reason', () => {
    it('returns a valid reasoning result', () => {
      const result = reasoner.reason(makePercept())

      expect(result.intentions).toBeDefined()
      expect(result.intentions.length).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('generates inform intention for questions', () => {
      const result = reasoner.reason(
        makePercept({ requestType: 'question' }),
      )

      expect(result.intentions[0]!.type).toBe('inform')
    })

    it('generates empathize-only in listening mode', () => {
      const result = reasoner.reason(
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
      const result = reasoner.reason(makePercept())

      expect(result.questionsToAsk.length).toBeGreaterThan(0)
    })

    it('updates working memory', () => {
      reasoner.reason(makePercept({ rawText: 'first message' }))
      reasoner.reason(
        makePercept({
          rawText: 'second message',
          entities: [{ type: 'person', value: 'Alice', confidence: 0.9 }],
        }),
      )

      const wm = reasoner.workingMemory.getItems()
      expect(wm.length).toBeGreaterThan(0)
      expect(wm.some((item) => item.content.includes('Alice'))).toBe(true)
    })

    it('generates hypotheses from implicit needs', () => {
      const result = reasoner.reason(
        makePercept({ implicitNeeds: ['motivation', 'clarity'] }),
      )

      expect(result.hypotheses).toHaveLength(2)
      expect(result.hypotheses[0]).toContain('motivation')
    })
  })

  describe('getState', () => {
    it('returns current cognitive state', () => {
      reasoner.reason(makePercept())

      const state = reasoner.getState()
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

      const result = customReasoner.reason(makePercept({ rawText: 'this is a test' }))

      expect(result.newBeliefs).toContainEqual(
        expect.objectContaining({ predicate: 'is_testing' }),
      )
    })
  })
})
