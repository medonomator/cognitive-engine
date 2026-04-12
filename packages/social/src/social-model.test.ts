import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryStore } from '@cognitive-engine/store-memory'
import type { LlmProvider, Percept } from '@cognitive-engine/core'
import { RapportTracker } from './rapport-tracker.js'
import { BoundaryDetector } from './boundary-detector.js'
import { PreferenceLearner } from './preference-learner.js'
import { SocialModel } from './social-model.js'

function createMockLlm(response: unknown): LlmProvider {
  return {
    complete: vi.fn().mockResolvedValue({
      content: JSON.stringify(response),
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      finishReason: 'stop' as const,
    }),
    completeJson: vi.fn().mockResolvedValue({
      content: JSON.stringify(response),
      parsed: response,
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      finishReason: 'stop' as const,
    }),
  }
}

function makePercept(overrides: Partial<Percept> = {}): Percept {
  return {
    rawText: 'test message',
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

// ── RapportTracker ──

describe('RapportTracker', () => {
  let store: MemoryStore
  let tracker: RapportTracker

  beforeEach(() => {
    store = new MemoryStore()
    tracker = new RapportTracker(store)
  })

  it('creates initial rapport for new user', async () => {
    const state = await tracker.update(
      'user1',
      makePercept(),
      50,
    )

    expect(state.trust).toBe(0.3) // default initial
    expect(state.conversationCount).toBe(1)
    expect(state.overallRapport).toBeGreaterThan(0)
  })

  it('grows trust with positive interactions', async () => {
    await tracker.update('user1', makePercept(), 50)

    const state = await tracker.update(
      'user1',
      makePercept({
        emotionalTone: 'happy',
        conversationPhase: 'deep_dive',
      }),
      150,
    )

    expect(state.trust).toBeGreaterThan(0.3)
    expect(state.conversationCount).toBe(2)
  })

  it('familiarity grows with each interaction', async () => {
    await tracker.update('user1', makePercept(), 50)
    await tracker.update('user1', makePercept(), 50)
    const state = await tracker.update('user1', makePercept(), 50)

    expect(state.familiarity).toBeGreaterThan(0.1)
  })

  it('engagement increases with longer messages', async () => {
    const short = await tracker.update('user1', makePercept(), 10)

    // Reset
    store = new MemoryStore()
    tracker = new RapportTracker(store)

    const long = await tracker.update('user1', makePercept(), 200)

    expect(long.engagement).toBeGreaterThan(short.engagement)
  })

  it('returns null for unknown user', async () => {
    const state = await tracker.getState('unknown')
    expect(state).toBeNull()
  })
})

// ── BoundaryDetector ──

describe('BoundaryDetector', () => {
  let store: MemoryStore

  it('detects boundaries from message', async () => {
    store = new MemoryStore()
    const llm = createMockLlm({
      boundaries: [
        { topic: 'family conflict', sensitivity: 0.9, isExplicit: true },
      ],
    })
    const detector = new BoundaryDetector(store, llm)

    const result = await detector.detect(
      'user1',
      "I don't want to talk about my family",
    )
    expect(result).toHaveLength(1)
    expect(result[0]!.topic).toBe('family conflict')
    expect(result[0]!.isExplicit).toBe(true)
  })

  it('checks if topic is sensitive', async () => {
    store = new MemoryStore()
    const llm = createMockLlm({
      boundaries: [
        { topic: 'finances', sensitivity: 0.8, isExplicit: false },
      ],
    })
    const detector = new BoundaryDetector(store, llm)

    await detector.detect('user1', 'test')

    const isSensitive = await detector.isSensitive('user1', 'finances')
    expect(isSensitive).toBe(true)

    const isNotSensitive = await detector.isSensitive('user1', 'hobbies')
    expect(isNotSensitive).toBe(false)
  })

  it('increases sensitivity on re-detection', async () => {
    store = new MemoryStore()
    const llm = createMockLlm({
      boundaries: [
        { topic: 'health', sensitivity: 0.6, isExplicit: false },
      ],
    })
    const detector = new BoundaryDetector(store, llm)

    await detector.detect('user1', 'test')

    // Now with higher sensitivity
    vi.mocked(llm.completeJson).mockResolvedValue({
      content: '',
      parsed: {
        boundaries: [
          { topic: 'health', sensitivity: 0.9, isExplicit: true },
        ],
      },
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      finishReason: 'stop' as const,
    })

    await detector.detect('user1', 'test again')

    const all = await detector.getAll('user1')
    expect(all).toHaveLength(1)
    // Sensitivity should not have decreased
    expect(all[0]!.sensitivity).toBeGreaterThanOrEqual(0.6)
  })

  it('removes boundary', async () => {
    store = new MemoryStore()
    const llm = createMockLlm({
      boundaries: [
        { topic: 'test', sensitivity: 0.7, isExplicit: false },
      ],
    })
    const detector = new BoundaryDetector(store, llm)

    const [boundary] = await detector.detect('user1', 'test')
    await detector.remove(boundary!.id)

    const all = await detector.getAll('user1')
    expect(all).toHaveLength(0)
  })
})

// ── PreferenceLearner ──

describe('PreferenceLearner', () => {
  let store: MemoryStore

  it('learns preferences from message', async () => {
    store = new MemoryStore()
    const llm = createMockLlm({
      preferences: [
        {
          dimension: 'formality',
          preferredStyle: 'casual',
          confidence: 0.7,
        },
      ],
    })
    const learner = new PreferenceLearner(store, llm)

    const result = await learner.learn('user1', 'hey what up')
    expect(result).toHaveLength(1)
    expect(result[0]!.dimension).toBe('formality')
    expect(result[0]!.preferredStyle).toBe('casual')
  })

  it('updates existing preferences', async () => {
    store = new MemoryStore()
    const llm = createMockLlm({
      preferences: [
        {
          dimension: 'formality',
          preferredStyle: 'casual',
          confidence: 0.6,
        },
      ],
    })
    const learner = new PreferenceLearner(store, llm)

    await learner.learn('user1', 'first message')
    await learner.learn('user1', 'second message')

    const all = await learner.getAll('user1')
    expect(all).toHaveLength(1)
    expect(all[0]!.evidence.length).toBe(2)
  })

  it('skips low-confidence preferences', async () => {
    store = new MemoryStore()
    const llm = createMockLlm({
      preferences: [
        {
          dimension: 'humor',
          preferredStyle: 'appreciates_humor',
          confidence: 0.2,
        },
      ],
    })
    const learner = new PreferenceLearner(store, llm)

    const result = await learner.learn('user1', 'test')
    expect(result).toHaveLength(0)
  })

  it('gets specific preference', async () => {
    store = new MemoryStore()
    const llm = createMockLlm({
      preferences: [
        {
          dimension: 'directness',
          preferredStyle: 'direct',
          confidence: 0.8,
        },
      ],
    })
    const learner = new PreferenceLearner(store, llm)

    await learner.learn('user1', 'test')

    const pref = await learner.getPreference('user1', 'directness')
    expect(pref).not.toBeNull()
    expect(pref!.preferredStyle).toBe('direct')

    const missing = await learner.getPreference('user1', 'humor')
    expect(missing).toBeNull()
  })
})

// ── SocialModel ──

describe('SocialModel', () => {
  let store: MemoryStore
  let model: SocialModel

  beforeEach(() => {
    store = new MemoryStore()
    const llm = createMockLlm({
      boundaries: [],
      preferences: [
        {
          dimension: 'formality',
          preferredStyle: 'casual',
          confidence: 0.7,
        },
      ],
    })
    model = new SocialModel(store, llm)
  })

  it('processes message through all components', async () => {
    await model.process(
      'user1',
      'Hey, how are you?',
      makePercept({ emotionalTone: 'happy' }),
    )

    const ctx = await model.getContext('user1')
    expect(ctx.rapport).not.toBeNull()
    expect(ctx.rapport!.conversationCount).toBe(1)
  })

  it('returns formatted context', async () => {
    await model.process(
      'user1',
      'test message',
      makePercept(),
    )

    const ctx = await model.getContext('user1')
    expect(ctx.formattedContext).toContain('Rapport')
    expect(ctx.formattedContext).toContain('trust=')
  })

  it('exposes individual services', () => {
    expect(model.rapport).toBeInstanceOf(RapportTracker)
    expect(model.boundaries).toBeInstanceOf(BoundaryDetector)
    expect(model.preferences).toBeInstanceOf(PreferenceLearner)
  })
})
