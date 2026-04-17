import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryStore } from '@cognitive-engine/store-memory'
import type {
  LlmProvider,
  Episode,
  BehaviorPattern,
  CausalChain,
} from '@cognitive-engine/core'
import { PatternDetector } from './pattern-detector.js'
import { CausalChainBuilder } from './causal-chain-builder.js'
import { Predictor } from './predictor.js'
import { TemporalEngine } from './temporal-engine.js'

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

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  const now = new Date()
  return {
    id: `ep_${Math.random().toString(36).slice(2)}`,
    userId: 'user1',
    summary: 'test episode',
    details: 'details',
    occurredAt: now,
    reportedAt: now,
    emotionalValence: 0,
    emotionalIntensity: 0.5,
    emotions: ['neutral'],
    category: 'personal',
    tags: [],
    importance: 0.5,
    accessCount: 0,
    decayFactor: 0.03,
    createdAt: now,
    ...overrides,
  }
}

// PatternDetector

describe('PatternDetector', () => {
  let store: MemoryStore
  let detector: PatternDetector

  beforeEach(() => {
    store = new MemoryStore()
  })

  it('detects patterns from episodes', async () => {
    const llm = createMockLlm({
      patterns: [
        {
          patternType: 'emotional',
          description: 'Gets stressed on Mondays',
          frequency: 'weekly',
          confidence: 0.8,
        },
      ],
    })
    detector = new PatternDetector(store, llm)

    const episodes = [
      makeEpisode({ summary: 'Stressful Monday' }),
      makeEpisode({ summary: 'Another stressful Monday' }),
    ]

    const result = await detector.detect('user1', episodes)
    expect(result).toHaveLength(1)
    expect(result[0]!.description).toBe('Gets stressed on Mondays')
    expect(result[0]!.frequency).toBe('weekly')
    expect(result[0]!.id).toMatch(/^pat_/)
  })

  it('skips detection with fewer than 2 episodes', async () => {
    const llm = createMockLlm({ patterns: [] })
    detector = new PatternDetector(store, llm)

    const result = await detector.detect('user1', [makeEpisode()])
    expect(result).toHaveLength(0)
  })

  it('skips low-confidence patterns', async () => {
    const llm = createMockLlm({
      patterns: [
        {
          patternType: 'behavioral',
          description: 'weak pattern',
          frequency: 'irregular',
          confidence: 0.2,
        },
      ],
    })
    detector = new PatternDetector(store, llm)

    const result = await detector.detect('user1', [
      makeEpisode(),
      makeEpisode(),
    ])
    expect(result).toHaveLength(0)
  })

  it('reinforces existing similar patterns', async () => {
    const llm = createMockLlm({
      patterns: [
        {
          patternType: 'emotional',
          description: 'Gets stressed on Mondays',
          frequency: 'weekly',
          confidence: 0.7,
        },
      ],
    })
    detector = new PatternDetector(store, llm)

    await detector.detect('user1', [makeEpisode(), makeEpisode()])
    await detector.detect('user1', [makeEpisode(), makeEpisode()])

    const active = await detector.getActive('user1')
    expect(active).toHaveLength(1)
    expect(active[0]!.occurrences).toBe(2)
  })

  it('gets patterns by type', async () => {
    const llm = createMockLlm({
      patterns: [
        {
          patternType: 'emotional',
          description: 'emotional pattern',
          frequency: 'weekly',
          confidence: 0.8,
        },
      ],
    })
    detector = new PatternDetector(store, llm)

    await detector.detect('user1', [makeEpisode(), makeEpisode()])

    const emotional = await detector.getByType('user1', 'emotional')
    expect(emotional).toHaveLength(1)

    const social = await detector.getByType('user1', 'social')
    expect(social).toHaveLength(0)
  })

  it('decays pattern confidence', async () => {
    const llm = createMockLlm({
      patterns: [
        {
          patternType: 'emotional',
          description: 'test',
          frequency: 'weekly',
          confidence: 0.8,
        },
      ],
    })
    detector = new PatternDetector(store, llm)

    const [pattern] = await detector.detect('user1', [
      makeEpisode(),
      makeEpisode(),
    ])

    await detector.decay(pattern!.id, 0.9)

    const active = await detector.getActive('user1')
    expect(active).toHaveLength(1)
    expect(active[0]!.confidence).toBeLessThan(0.8)
  })

  it('filters out old episodes beyond lookback window', async () => {
    const llm = createMockLlm({ patterns: [] })
    detector = new PatternDetector(store, llm, 7) // 7 days lookback

    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const result = await detector.detect('user1', [
      makeEpisode({ occurredAt: oldDate }),
      makeEpisode({ occurredAt: oldDate }),
    ])

    expect(result).toHaveLength(0)
    // LLM should not have been called since episodes were filtered
    expect(llm.completeJson).not.toHaveBeenCalled()
  })
})

// CausalChainBuilder

describe('CausalChainBuilder', () => {
  let store: MemoryStore
  let builder: CausalChainBuilder

  beforeEach(() => {
    store = new MemoryStore()
  })

  it('builds causal chains from episodes', async () => {
    const llm = createMockLlm({
      chains: [
        {
          events: ['work stress', 'poor sleep', 'irritability'],
          rootCause: 'work stress',
          finalEffect: 'irritability',
          chainType: 'stress_cascade',
          confidence: 0.7,
          description: 'Work stress leads to poor sleep and irritability',
        },
      ],
    })
    builder = new CausalChainBuilder(store, llm)

    const result = await builder.build('user1', [
      makeEpisode({ summary: 'Stressful day' }),
      makeEpisode({ summary: 'Couldn\'t sleep' }),
      makeEpisode({ summary: 'Snapped at someone' }),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]!.events).toHaveLength(3)
    expect(result[0]!.chainType).toBe('stress_cascade')
    expect(result[0]!.id).toMatch(/^chain_/)
  })

  it('skips with fewer than 2 episodes', async () => {
    const llm = createMockLlm({ chains: [] })
    builder = new CausalChainBuilder(store, llm)

    const result = await builder.build('user1', [makeEpisode()])
    expect(result).toHaveLength(0)
  })

  it('deduplicates chains', async () => {
    const llm = createMockLlm({
      chains: [
        {
          events: ['stress', 'insomnia'],
          rootCause: 'stress',
          finalEffect: 'insomnia',
          chainType: 'stress_cascade',
          confidence: 0.7,
          description: 'test',
        },
      ],
    })
    builder = new CausalChainBuilder(store, llm)

    await builder.build('user1', [makeEpisode(), makeEpisode()])
    await builder.build('user1', [makeEpisode(), makeEpisode()])

    const all = await builder.getAll('user1')
    expect(all).toHaveLength(1)
  })

  it('gets chains by type', async () => {
    const llm = createMockLlm({
      chains: [
        {
          events: ['exercise', 'better mood'],
          rootCause: 'exercise',
          finalEffect: 'better mood',
          chainType: 'positive_spiral',
          confidence: 0.8,
          description: 'test',
        },
      ],
    })
    builder = new CausalChainBuilder(store, llm)

    await builder.build('user1', [makeEpisode(), makeEpisode()])

    const positive = await builder.getByType('user1', 'positive_spiral')
    expect(positive).toHaveLength(1)

    const stress = await builder.getByType('user1', 'stress_cascade')
    expect(stress).toHaveLength(0)
  })

  it('gets chains by root cause', async () => {
    const llm = createMockLlm({
      chains: [
        {
          events: ['work stress', 'insomnia'],
          rootCause: 'work stress',
          finalEffect: 'insomnia',
          chainType: 'stress_cascade',
          confidence: 0.7,
          description: 'test',
        },
      ],
    })
    builder = new CausalChainBuilder(store, llm)

    await builder.build('user1', [makeEpisode(), makeEpisode()])

    const found = await builder.getByRootCause('user1', 'work')
    expect(found).toHaveLength(1)
  })
})

// Predictor

describe('Predictor', () => {
  let store: MemoryStore
  let predictor: Predictor

  beforeEach(() => {
    store = new MemoryStore()
  })

  it('generates predictions', async () => {
    const llm = createMockLlm({
      predictions: [
        {
          predictedState: 'Burnout risk increasing',
          timeframe: 'next 2 weeks',
          predictionType: 'risk',
          severity: 'high',
          isWarning: true,
          recommendation: 'Suggest taking a break',
          confidence: 0.7,
        },
      ],
    })
    predictor = new Predictor(store, llm)

    const patterns: BehaviorPattern[] = [
      {
        id: 'pat_1',
        userId: 'user1',
        patternType: 'emotional',
        description: 'Stress increasing',
        frequency: 'daily',
        occurrences: 5,
        confidence: 0.8,
        createdAt: new Date(),
      },
    ]

    const result = await predictor.predict('user1', patterns, [], [])
    expect(result).toHaveLength(1)
    expect(result[0]!.isWarning).toBe(true)
    expect(result[0]!.severity).toBe('high')
    expect(result[0]!.id).toMatch(/^pred_/)
  })

  it('returns empty for no input', async () => {
    const llm = createMockLlm({ predictions: [] })
    predictor = new Predictor(store, llm)

    const result = await predictor.predict('user1', [], [], [])
    expect(result).toHaveLength(0)
    expect(llm.completeJson).not.toHaveBeenCalled()
  })

  it('separates warnings from predictions', async () => {
    const llm = createMockLlm({ predictions: [] })
    predictor = new Predictor(store, llm)

    const now = new Date()
    await store.set('predictions', 'p1', {
      id: 'p1',
      userId: 'user1',
      predictedState: 'Warning',
      timeframe: 'soon',
      predictionType: 'risk',
      severity: 'high',
      isWarning: true,
      confidence: 0.8,
      isResolved: false,
      createdAt: now,
    })
    await store.set('predictions', 'p2', {
      id: 'p2',
      userId: 'user1',
      predictedState: 'Opportunity',
      timeframe: 'soon',
      predictionType: 'opportunity',
      severity: 'low',
      isWarning: false,
      confidence: 0.6,
      isResolved: false,
      createdAt: now,
    })

    const warnings = await predictor.getWarnings('user1')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]!.predictedState).toBe('Warning')

    const active = await predictor.getActive('user1')
    expect(active).toHaveLength(2)
  })

  it('resolves predictions and tracks accuracy', async () => {
    const llm = createMockLlm({ predictions: [] })
    predictor = new Predictor(store, llm)

    const now = new Date()
    await store.set('predictions', 'p1', {
      id: 'p1',
      userId: 'user1',
      predictedState: 'correct',
      timeframe: 'soon',
      predictionType: 'emotional',
      severity: 'low',
      isWarning: false,
      confidence: 0.7,
      isResolved: false,
      createdAt: now,
    })
    await store.set('predictions', 'p2', {
      id: 'p2',
      userId: 'user1',
      predictedState: 'wrong',
      timeframe: 'soon',
      predictionType: 'emotional',
      severity: 'low',
      isWarning: false,
      confidence: 0.5,
      isResolved: false,
      createdAt: now,
    })

    await predictor.resolve('p1', true)
    await predictor.resolve('p2', false)

    const accuracy = await predictor.getAccuracy('user1')
    expect(accuracy.total).toBe(2)
    expect(accuracy.resolved).toBe(2)
    expect(accuracy.correct).toBe(1)
    expect(accuracy.accuracy).toBe(0.5)
  })
})

// TemporalEngine

describe('TemporalEngine', () => {
  let store: MemoryStore
  let engine: TemporalEngine

  beforeEach(() => {
    store = new MemoryStore()
    const llm = createMockLlm({
      patterns: [
        {
          patternType: 'emotional',
          description: 'Weekly stress',
          frequency: 'weekly',
          confidence: 0.7,
        },
      ],
      chains: [],
      predictions: [],
    })
    engine = new TemporalEngine(store, llm)
  })

  it('runs full analysis', async () => {
    const episodes = [
      makeEpisode({ summary: 'ep1' }),
      makeEpisode({ summary: 'ep2' }),
    ]

    await engine.analyze('user1', episodes)

    const patterns = await engine.patterns.getActive('user1')
    expect(patterns.length).toBeGreaterThanOrEqual(1)
  })

  it('builds temporal context', async () => {
    // Pre-populate data
    await store.set('behavior_patterns', 'pat_1', {
      id: 'pat_1',
      userId: 'user1',
      patternType: 'emotional',
      description: 'Stress on Mondays',
      frequency: 'weekly',
      occurrences: 3,
      confidence: 0.8,
      createdAt: new Date(),
    })
    await store.set('predictions', 'pred_1', {
      id: 'pred_1',
      userId: 'user1',
      predictedState: 'Burnout',
      timeframe: 'next week',
      predictionType: 'risk',
      severity: 'high',
      isWarning: true,
      confidence: 0.7,
      isResolved: false,
      createdAt: new Date(),
    })

    const context = await engine.getContext('user1', [])
    expect(context.activePatterns).toHaveLength(1)
    expect(context.warnings).toHaveLength(1)
    expect(context.predictions).toHaveLength(0) // warnings are separate
  })

  it('exposes individual services', () => {
    expect(engine.patterns).toBeInstanceOf(PatternDetector)
    expect(engine.causalChains).toBeInstanceOf(CausalChainBuilder)
    expect(engine.predictor).toBeInstanceOf(Predictor)
  })
})
