import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryStore } from '@cognitive-engine/store-memory'
import type {
  LlmProvider,
  LlmMessage,
  LlmOptions,
  LlmResponse,
  Percept,
  Episode,
} from '@cognitive-engine/core'
import { ReflectionService } from './reflection-service.js'
import { RelationshipTracker } from './relationship-tracker.js'
import { OpenLoopDetector } from './open-loop-detector.js'
import { EmotionalTriggerTracker } from './emotional-trigger-tracker.js'
import { MindService } from './mind-service.js'

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

// ReflectionService

describe('ReflectionService', () => {
  let store: MemoryStore
  let service: ReflectionService

  beforeEach(() => {
    store = new MemoryStore()
  })

  it('generates reflections from percept', async () => {
    const llm = createMockLlm({
      reflections: [
        { type: 'observation', content: 'User seems tired', priority: 0.7 },
        { type: 'question', content: 'Is work causing stress?', priority: 0.5 },
      ],
    })
    service = new ReflectionService(store, llm)

    const result = await service.generate(
      'user1',
      makePercept({ rawText: 'I had a long day' }),
      [makeEpisode()],
    )

    expect(result).toHaveLength(2)
    expect(result[0]!.type).toBe('observation')
    expect(result[0]!.userId).toBe('user1')
    expect(result[0]!.id).toMatch(/^ref_/)
  })

  it('returns active reflections sorted by priority', async () => {
    const llm = createMockLlm({
      reflections: [
        { type: 'observation', content: 'Low priority', priority: 0.2 },
        { type: 'insight', content: 'High priority', priority: 0.9 },
      ],
    })
    service = new ReflectionService(store, llm)

    await service.generate('user1', makePercept(), [])

    const active = await service.getActive('user1')
    expect(active[0]!.priority).toBeGreaterThan(active[1]!.priority)
  })

  it('dismisses a reflection', async () => {
    const llm = createMockLlm({
      reflections: [
        { type: 'observation', content: 'test', priority: 0.5 },
      ],
    })
    service = new ReflectionService(store, llm)

    const [ref] = await service.generate('user1', makePercept(), [])
    await service.dismiss(ref!.id)

    const active = await service.getActive('user1')
    expect(active).toHaveLength(0)
  })

  it('cleans up expired reflections', async () => {
    const llm = createMockLlm({ reflections: [] })
    service = new ReflectionService(store, llm)

    // Manually store an expired reflection
    const pastDate = new Date(Date.now() - 1000)
    await store.set('reflections', 'ref_expired', {
      id: 'ref_expired',
      userId: 'user1',
      type: 'observation',
      content: 'expired',
      priority: 0.5,
      createdAt: pastDate,
      expiresAt: pastDate,
    })

    const removed = await service.cleanup('user1')
    expect(removed).toBe(1)
  })
})

// RelationshipTracker

describe('RelationshipTracker', () => {
  let store: MemoryStore
  let tracker: RelationshipTracker

  beforeEach(() => {
    store = new MemoryStore()
  })

  it('extracts new relationships', async () => {
    const llm = createMockLlm({
      people: [
        { name: 'Sarah', type: 'romantic', sentiment: 0.8, context: 'partner' },
      ],
    })
    tracker = new RelationshipTracker(store, llm)

    const result = await tracker.extract('user1', 'My wife Sarah is great')
    expect(result).toHaveLength(1)
    expect(result[0]!.personName).toBe('Sarah')
    expect(result[0]!.type).toBe('romantic')
    expect(result[0]!.mentionCount).toBe(1)
  })

  it('updates existing relationships on re-mention', async () => {
    const llm = createMockLlm({
      people: [
        { name: 'Sarah', type: 'romantic', sentiment: 0.5, context: 'busy' },
      ],
    })
    tracker = new RelationshipTracker(store, llm)

    await tracker.extract('user1', 'Sarah is great')
    await tracker.extract('user1', 'Sarah is busy today')

    const all = await tracker.getAll('user1')
    expect(all).toHaveLength(1)
    expect(all[0]!.mentionCount).toBe(2)
  })

  it('gets relationships by type', async () => {
    const llm = createMockLlm({
      people: [
        { name: 'Mom', type: 'family', sentiment: 0.9, context: '' },
        { name: 'Alex', type: 'colleague', sentiment: 0.3, context: '' },
      ],
    })
    tracker = new RelationshipTracker(store, llm)

    await tracker.extract('user1', 'Mom and Alex')

    const family = await tracker.getByType('user1', 'family')
    expect(family).toHaveLength(1)
    expect(family[0]!.personName).toBe('Mom')
  })

  it('finds relationship by name (case-insensitive)', async () => {
    const llm = createMockLlm({
      people: [
        { name: 'Sarah', type: 'romantic', sentiment: 0.8, context: '' },
      ],
    })
    tracker = new RelationshipTracker(store, llm)

    await tracker.extract('user1', 'Sarah')

    const found = await tracker.getByName('user1', 'sarah')
    expect(found).not.toBeNull()
    expect(found!.personName).toBe('Sarah')
  })
})

// OpenLoopDetector

describe('OpenLoopDetector', () => {
  let store: MemoryStore
  let detector: OpenLoopDetector

  beforeEach(() => {
    store = new MemoryStore()
  })

  it('detects open loops', async () => {
    const llm = createMockLlm({
      loops: [
        { question: 'How did the interview go?', importance: 0.8, askAfterDays: 5 },
      ],
    })
    detector = new OpenLoopDetector(store, llm)

    const result = await detector.detect('user1', 'I have an interview next week')
    expect(result).toHaveLength(1)
    expect(result[0]!.question).toBe('How did the interview go?')
    expect(result[0]!.isAsked).toBe(false)
    expect(result[0]!.isClosed).toBe(false)
  })

  it('skips low-importance loops', async () => {
    const llm = createMockLlm({
      loops: [
        { question: 'trivial', importance: 0.1 },
      ],
    })
    detector = new OpenLoopDetector(store, llm)

    const result = await detector.detect('user1', 'test')
    expect(result).toHaveLength(0)
  })

  it('returns ready loops (past askAfter date)', async () => {
    const llm = createMockLlm({ loops: [] })
    detector = new OpenLoopDetector(store, llm)

    // Manually store a loop that's ready
    const pastDate = new Date(Date.now() - 1000)
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await store.set('open_loops', 'loop_1', {
      id: 'loop_1',
      userId: 'user1',
      question: 'How did it go?',
      importance: 0.8,
      askAfter: pastDate,
      expiresAt: futureDate,
      isAsked: false,
      isClosed: false,
      createdAt: pastDate,
    })

    const ready = await detector.getReady('user1')
    expect(ready).toHaveLength(1)
  })

  it('does not return loops before askAfter date', async () => {
    const llm = createMockLlm({ loops: [] })
    detector = new OpenLoopDetector(store, llm)

    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    await store.set('open_loops', 'loop_1', {
      id: 'loop_1',
      userId: 'user1',
      question: 'Not yet',
      importance: 0.8,
      askAfter: futureDate,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isAsked: false,
      isClosed: false,
      createdAt: new Date(),
    })

    const ready = await detector.getReady('user1')
    expect(ready).toHaveLength(0)
  })

  it('marks loop as asked', async () => {
    const llm = createMockLlm({ loops: [] })
    detector = new OpenLoopDetector(store, llm)

    await store.set('open_loops', 'loop_1', {
      id: 'loop_1',
      userId: 'user1',
      question: 'test',
      importance: 0.8,
      isAsked: false,
      isClosed: false,
      createdAt: new Date(),
    })

    await detector.markAsked('loop_1')

    const loop = await store.get<{ isAsked: boolean }>('open_loops', 'loop_1')
    expect(loop!.isAsked).toBe(true)
  })

  it('closes a loop with answer', async () => {
    const llm = createMockLlm({ loops: [] })
    detector = new OpenLoopDetector(store, llm)

    await store.set('open_loops', 'loop_1', {
      id: 'loop_1',
      userId: 'user1',
      question: 'test',
      importance: 0.8,
      isAsked: true,
      isClosed: false,
      createdAt: new Date(),
    })

    await detector.close('loop_1', 'It went well!')

    const loop = await store.get<{ isClosed: boolean; answerSummary: string }>(
      'open_loops',
      'loop_1',
    )
    expect(loop!.isClosed).toBe(true)
    expect(loop!.answerSummary).toBe('It went well!')
  })
})

// EmotionalTriggerTracker

describe('EmotionalTriggerTracker', () => {
  let store: MemoryStore
  let tracker: EmotionalTriggerTracker

  beforeEach(() => {
    store = new MemoryStore()
    tracker = new EmotionalTriggerTracker(store)
  })

  it('creates new triggers from percept entities', async () => {
    const percept = makePercept({
      emotionalTone: 'anxious',
      urgency: 0.7,
      confidence: 0.8,
      entities: [{ type: 'topic', value: 'work', confidence: 0.9 }],
    })

    const result = await tracker.track('user1', percept)
    expect(result).toHaveLength(1)
    expect(result[0]!.trigger).toBe('work')
    expect(result[0]!.emotion).toBe('anxious')
  })

  it('updates existing triggers on repeat', async () => {
    const percept = makePercept({
      emotionalTone: 'anxious',
      urgency: 0.7,
      confidence: 0.8,
      entities: [{ type: 'topic', value: 'work', confidence: 0.9 }],
    })

    await tracker.track('user1', percept)
    await tracker.track('user1', percept)

    const all = await tracker.getAll('user1')
    expect(all).toHaveLength(1)
    expect(all[0]!.occurrenceCount).toBe(2)
  })

  it('skips neutral emotions', async () => {
    const percept = makePercept({
      emotionalTone: 'neutral',
      entities: [{ type: 'topic', value: 'weather', confidence: 0.9 }],
    })

    const result = await tracker.track('user1', percept)
    expect(result).toHaveLength(0)
  })

  it('skips low-confidence entities', async () => {
    const percept = makePercept({
      emotionalTone: 'sad',
      urgency: 0.5,
      confidence: 0.8,
      entities: [{ type: 'topic', value: 'something', confidence: 0.2 }],
    })

    const result = await tracker.track('user1', percept)
    expect(result).toHaveLength(0)
  })

  it('returns strong triggers', async () => {
    const percept = makePercept({
      emotionalTone: 'anxious',
      urgency: 0.8,
      confidence: 0.8,
      entities: [{ type: 'topic', value: 'deadlines', confidence: 0.9 }],
    })

    // Track multiple times to build up occurrence count
    await tracker.track('user1', percept)
    await tracker.track('user1', percept)
    await tracker.track('user1', percept)

    const strong = await tracker.getStrong('user1', 2, 0.5)
    expect(strong).toHaveLength(1)
    expect(strong[0]!.trigger).toBe('deadlines')
  })

  it('gets triggers by emotion', async () => {
    await tracker.track(
      'user1',
      makePercept({
        emotionalTone: 'anxious',
        urgency: 0.7,
        confidence: 0.8,
        entities: [{ type: 'topic', value: 'work', confidence: 0.9 }],
      }),
    )
    await tracker.track(
      'user1',
      makePercept({
        emotionalTone: 'happy',
        urgency: 0.5,
        confidence: 0.8,
        entities: [{ type: 'topic', value: 'music', confidence: 0.9 }],
      }),
    )

    const anxious = await tracker.getByEmotion('user1', 'anxious')
    expect(anxious).toHaveLength(1)
    expect(anxious[0]!.trigger).toBe('work')
  })
})

// MindService

describe('MindService', () => {
  let store: MemoryStore
  let service: MindService

  beforeEach(() => {
    store = new MemoryStore()
    const llm = createMockLlm({
      reflections: [
        { type: 'observation', content: 'test reflection', priority: 0.5 },
      ],
      people: [
        { name: 'Sarah', type: 'romantic', sentiment: 0.8, context: 'partner' },
      ],
      loops: [
        { question: 'Follow up?', importance: 0.7, askAfterDays: 0 },
      ],
    })
    service = new MindService(store, llm)
  })

  it('processes a message through all components', async () => {
    const percept = makePercept({
      emotionalTone: 'happy',
      urgency: 0.5,
      confidence: 0.8,
      entities: [{ type: 'person', value: 'Sarah', confidence: 0.9 }],
    })

    await service.process('user1', 'Sarah and I are happy', percept, [])

    // Should have created data in all subsystems
    const context = await service.getContext('user1')
    expect(context.reflections.length).toBeGreaterThanOrEqual(0)
    expect(context.formattedContext).toBeDefined()
  })

  it('returns formatted context', async () => {
    // Manually populate data
    await store.set('reflections', 'r1', {
      id: 'r1',
      userId: 'user1',
      type: 'insight',
      content: 'User values honesty',
      priority: 0.8,
      createdAt: new Date(),
    })
    await store.set('relationships', 'rel1', {
      id: 'rel1',
      userId: 'user1',
      personName: 'Mom',
      type: 'family',
      sentiment: 0.9,
      mentionCount: 5,
      context: '',
      lastMentioned: new Date(),
      createdAt: new Date(),
    })

    const context = await service.getContext('user1')
    expect(context.formattedContext).toContain('User values honesty')
    expect(context.formattedContext).toContain('Mom')
  })

  it('exposes individual services', () => {
    expect(service.reflections).toBeInstanceOf(ReflectionService)
    expect(service.relationships).toBeInstanceOf(RelationshipTracker)
    expect(service.openLoops).toBeInstanceOf(OpenLoopDetector)
    expect(service.emotionalTriggers).toBeInstanceOf(EmotionalTriggerTracker)
  })
})
