import { describe, it, expect, vi } from 'vitest'
import { MemoryStore } from '@cognitive-engine/store-memory'
import type {
  LlmProvider,
  EmbeddingProvider,
  EngineConfig,
  Percept,
  Episode,
} from '@cognitive-engine/core'
import { CognitiveEventEmitter } from '@cognitive-engine/core'
import { CognitiveOrchestrator } from './cognitive-orchestrator.js'

/** LLM mock that returns sensible defaults for every prompt. */
function createMockLlm(): LlmProvider {
  const makeResponse = (content: unknown) => ({
    content: JSON.stringify(content),
    parsed: content,
    usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
    finishReason: 'stop' as const,
  })

  // The orchestrator uses LLM in many places — return reasonable defaults
  const defaultJson = {
    // Perception quick analysis
    emotionalTone: 'neutral',
    urgency: 0.3,
    requestType: 'statement',
    responseMode: 'listening',
    entities: [],
    implicitNeeds: [],
    conversationPhase: 'exploration',
    // Mind reflection
    reflections: [],
    // Mind relationship
    people: [],
    // Mind open loops
    openTopics: [],
    // Social boundary
    sensitivities: [],
    // Social preferences
    preferences: [],
    // Planning
    hasPlan: false,
    goal: '',
    steps: [],
    priority: 0,
    // Temporal patterns
    patterns: [],
    // Temporal causal chains
    chains: [],
    // Temporal predictions
    predictions: [],
    // Fact extraction
    facts: [],
    // Episode extraction
    summary: 'test',
    details: 'test details',
    emotions: ['neutral'],
    topics: ['test'],
    importance: 0.5,
  }

  return {
    complete: vi.fn().mockResolvedValue({
      content: 'This is a suggested response.',
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      finishReason: 'stop' as const,
    }),
    completeJson: vi.fn().mockResolvedValue(makeResponse(defaultJson)),
  }
}

function createMockEmbedding(): EmbeddingProvider {
  const dim = 8
  const randomVec = () => Array.from({ length: dim }, () => Math.random())

  return {
    dimensions: dim,
    embed: vi.fn().mockImplementation(async () => randomVec()),
    embedBatch: vi.fn().mockImplementation(async (texts: string[]) =>
      texts.map(() => randomVec()),
    ),
  }
}

function createConfig(): EngineConfig {
  return {
    llm: createMockLlm(),
    embedding: createMockEmbedding(),
    store: new MemoryStore(),
  }
}

describe('CognitiveOrchestrator', () => {
  it('constructs without errors', () => {
    const config = createConfig()
    const orchestrator = new CognitiveOrchestrator(config)

    expect(orchestrator.perception).toBeDefined()
    expect(orchestrator.reasoning).toBeDefined()
    expect(orchestrator.episodicMemory).toBeDefined()
    expect(orchestrator.semanticMemory).toBeDefined()
    expect(orchestrator.mind).toBeDefined()
    expect(orchestrator.emotional).toBeDefined()
    expect(orchestrator.social).toBeDefined()
    expect(orchestrator.temporal).toBeDefined()
    expect(orchestrator.bandit).toBeDefined()
    expect(orchestrator.planner).toBeDefined()
    expect(orchestrator.metacognition).toBeDefined()
  })

  it('process() returns a complete CognitiveResponse', async () => {
    const config = createConfig()
    const orchestrator = new CognitiveOrchestrator(config)

    const response = await orchestrator.process('user1', 'Hello, I need help')

    // Verify all context layers are present
    expect(response.percept).toBeDefined()
    expect(response.percept.rawText).toBe('Hello, I need help')
    expect(response.reasoning).toBeDefined()
    expect(response.reasoning.intentions).toBeDefined()
    expect(response.episodicContext).toBeDefined()
    expect(response.semanticContext).toBeDefined()
    expect(response.mindContext).toBeDefined()
    expect(response.emotionalContext).toBeDefined()
    expect(response.socialContext).toBeDefined()
    expect(response.temporalContext).toBeDefined()
    expect(response.planningContext).toBeDefined()
    expect(response.metacognition).toBeDefined()
    expect(response.suggestedResponse).toBeDefined()
    expect(typeof response.suggestedResponse).toBe('string')
    expect(response.systemPrompt).toBeDefined()
    expect(typeof response.systemPrompt).toBe('string')
  })

  it('process() calls LLM for final response generation', async () => {
    const config = createConfig()
    const orchestrator = new CognitiveOrchestrator(config)

    const response = await orchestrator.process('user1', 'Tell me about AI')

    expect(response.suggestedResponse).toBe('This is a suggested response.')
    expect(config.llm.complete).toHaveBeenCalled()
  })

  it('process() metacognition returns valid assessment', async () => {
    const config = createConfig()
    const orchestrator = new CognitiveOrchestrator(config)

    const response = await orchestrator.process('user1', 'Test message')

    const meta = response.metacognition
    expect(meta).toBeDefined()
    if (!meta) throw new Error('metacognition should be defined')
    expect(meta.overallConfidence).toBeGreaterThanOrEqual(0)
    expect(meta.overallConfidence).toBeLessThanOrEqual(1)
    expect(meta.understanding).toBeGreaterThanOrEqual(0)
    expect(meta.understanding).toBeLessThanOrEqual(1)
    expect(meta.suggestedStrategy).toBeDefined()
    expect(meta.flags).toBeDefined()
  })

  it('recordFeedback delegates to bandit', async () => {
    const config = createConfig()
    const orchestrator = new CognitiveOrchestrator(config)

    // Should not throw
    await orchestrator.recordFeedback('action1', [0.1, 0.2, 0.3], 1.0)
  })

  it('analyzeTemporalPatterns runs without errors', async () => {
    const config = createConfig()
    const orchestrator = new CognitiveOrchestrator(config)

    // Should not throw even with empty data
    await orchestrator.analyzeTemporalPatterns('user1')
  })

  it('builds system prompt from context layers', async () => {
    const config = createConfig()
    const orchestrator = new CognitiveOrchestrator(config)

    const response = await orchestrator.process('user1', 'Test')

    // System prompt is a string — may be empty if no context
    expect(typeof response.systemPrompt).toBe('string')
  })

  it('handles multiple sequential process() calls for same user', async () => {
    const config = createConfig()
    const orchestrator = new CognitiveOrchestrator(config)

    const r1 = await orchestrator.process('user1', 'First message')
    const r2 = await orchestrator.process('user1', 'Second message')

    expect(r1.percept.rawText).toBe('First message')
    expect(r2.percept.rawText).toBe('Second message')
  })

  it('handles different users independently', async () => {
    const config = createConfig()
    const orchestrator = new CognitiveOrchestrator(config)

    const r1 = await orchestrator.process('user1', 'Hello from user 1')
    const r2 = await orchestrator.process('user2', 'Hello from user 2')

    expect(r1.percept.rawText).toBe('Hello from user 1')
    expect(r2.percept.rawText).toBe('Hello from user 2')
    // Both should complete successfully
    expect(r1.suggestedResponse).toBeDefined()
    expect(r2.suggestedResponse).toBeDefined()
  })

  it('emits perception:complete event during process()', async () => {
    const events = new CognitiveEventEmitter()
    const config = createConfig()
    config.events = events
    const orchestrator = new CognitiveOrchestrator(config)

    const receivedPercepts: Percept[] = []
    orchestrator.on('perception:complete', (percept) => {
      receivedPercepts.push(percept)
    })

    await orchestrator.process('user1', 'Hello events')

    expect(receivedPercepts).toHaveLength(1)
    expect(receivedPercepts[0]!.rawText).toBe('Hello events')
  })

  it('emits episode:created event after learning', async () => {
    const events = new CognitiveEventEmitter()
    const config = createConfig()
    config.events = events

    // Override completeJson to include hasEpisode: true so EpisodeExtractor creates an episode
    const episodeJson = {
      hasEpisode: true,
      summary: 'test episode',
      details: 'test details',
      participants: [],
      location: null,
      emotions: ['neutral'],
      emotionalValence: 0,
      emotionalIntensity: 0.3,
      category: 'other',
      tags: ['test'],
      importance: 0.5,
      // Also include fields for other LLM calls (planning, mind, social, etc.)
      reflections: [],
      people: [],
      openTopics: [],
      sensitivities: [],
      preferences: [],
      hasPlan: false,
      goal: '',
      steps: [],
      priority: 0,
      patterns: [],
      chains: [],
      predictions: [],
      facts: [],
      emotionalTone: 'neutral',
      urgency: 0.3,
      requestType: 'statement',
      responseMode: 'listening',
      entities: [],
      implicitNeeds: [],
      conversationPhase: 'exploration',
    }
    const mockResponse = {
      content: JSON.stringify(episodeJson),
      parsed: episodeJson,
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      finishReason: 'stop' as const,
    }
    vi.mocked(config.llm.completeJson).mockResolvedValue(mockResponse)

    const orchestrator = new CognitiveOrchestrator(config)

    const receivedEpisodes: Episode[] = []
    orchestrator.on('episode:created', (episode) => {
      receivedEpisodes.push(episode)
    })

    await orchestrator.process('user1', 'Remember this moment')

    // learn() runs in the background via void — wait briefly for it to complete
    await vi.waitFor(() => {
      expect(receivedEpisodes.length).toBeGreaterThanOrEqual(1)
    })

    expect(receivedEpisodes[0]!.userId).toBe('user1')
    expect(receivedEpisodes[0]!.summary).toBe('test episode')
  })

  it('does not emit events when events config is not provided', async () => {
    const config = createConfig()
    const orchestrator = new CognitiveOrchestrator(config)

    expect(orchestrator.events).toBeNull()
    // process() should work fine without events
    const response = await orchestrator.process('user1', 'No events')
    expect(response.percept.rawText).toBe('No events')
  })

  it('on() and off() are no-ops when events are not enabled', () => {
    const config = createConfig()
    const orchestrator = new CognitiveOrchestrator(config)

    const handler = vi.fn()
    // Should not throw
    orchestrator.on('perception:complete', handler)
    orchestrator.off('perception:complete', handler)
  })

  it('continues processing when non-critical modules fail', async () => {
    const errorHandler = vi.fn()
    const config = createConfig()
    config.onError = errorHandler

    const orchestrator = new CognitiveOrchestrator(config)

    // Break the store — simulates DB/embedding failure
    const brokenStore = orchestrator.episodicMemory!
    vi.spyOn(brokenStore, 'getContext').mockRejectedValue(new Error('store unavailable'))

    const response = await orchestrator.process('user1', 'Hello despite failures')

    // Pipeline completed — we got a response
    expect(response.suggestedResponse).toBe('This is a suggested response.')
    expect(response.percept.rawText).toBe('Hello despite failures')
    expect(response.reasoning).toBeDefined()

    // Failed context is undefined, not an exception
    expect(response.episodicContext).toBeUndefined()

    // Error was reported, not swallowed
    expect(errorHandler).toHaveBeenCalledWith(
      expect.any(Error),
      'episodicMemory.getContext',
    )
  })

  it('reports all failures from parallel non-critical modules', async () => {
    const errorHandler = vi.fn()
    const config = createConfig()
    config.onError = errorHandler

    const orchestrator = new CognitiveOrchestrator(config)

    // Break multiple non-critical modules
    vi.spyOn(orchestrator.mind!, 'process').mockRejectedValue(new Error('mind failed'))
    vi.spyOn(orchestrator.emotional!, 'update').mockRejectedValue(new Error('emotional failed'))

    const response = await orchestrator.process('user1', 'Still works')

    // Pipeline completed
    expect(response.suggestedResponse).toBeDefined()

    // Both errors reported
    const errorContexts = errorHandler.mock.calls.map((call) => call[1])
    expect(errorContexts).toContain('mind.process')
    expect(errorContexts).toContain('emotional.update')
  })
})
