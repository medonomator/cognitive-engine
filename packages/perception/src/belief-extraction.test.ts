import { describe, it, expect } from 'vitest'
import { extractBeliefCandidates } from './belief-extraction.js'
import type { Percept } from '@cognitive-engine/core'

function makePrecept(overrides: Partial<Percept> = {}): Percept {
  return {
    rawText: 'test',
    emotionalTone: 'neutral',
    urgency: 0,
    requestType: 'sharing',
    responseMode: 'listening',
    entities: [],
    implicitNeeds: [],
    conversationPhase: 'opening',
    confidence: 0.8,
    analysisMethod: 'quick',
    ...overrides,
  }
}

describe('extractBeliefCandidates', () => {
  it('returns empty for neutral message with no entities', () => {
    const candidates = extractBeliefCandidates(makePrecept())
    expect(candidates).toHaveLength(0)
  })

  it('extracts emotional state as belief', () => {
    const candidates = extractBeliefCandidates(
      makePrecept({ emotionalTone: 'anxious', confidence: 0.9 }),
    )
    expect(candidates).toContainEqual({
      subject: 'user',
      predicate: 'current_emotion',
      object: 'anxious',
      confidence: 0.8,
    })
  })

  it('extracts email entity', () => {
    const candidates = extractBeliefCandidates(
      makePrecept({
        entities: [{ type: 'email', value: 'alice@example.com', confidence: 0.95 }],
      }),
    )
    expect(candidates).toContainEqual({
      subject: 'user',
      predicate: 'has_email',
      object: 'alice@example.com',
      confidence: 0.95,
    })
  })

  it('extracts implicit needs', () => {
    const candidates = extractBeliefCandidates(
      makePrecept({ implicitNeeds: ['motivation', 'clarity'] }),
    )
    expect(candidates).toHaveLength(2)
    expect(candidates[0]).toEqual({
      subject: 'user',
      predicate: 'might_need',
      object: 'motivation',
      confidence: 0.6,
    })
  })

  it('ignores unknown entity types', () => {
    const candidates = extractBeliefCandidates(
      makePrecept({
        entities: [{ type: 'unknown_type', value: 'x', confidence: 0.9 }],
      }),
    )
    expect(candidates).toHaveLength(0)
  })
})
