import { describe, it, expect, vi } from 'vitest'
import { PerceptionService } from './perception.js'
import type { LlmProvider, LlmResponse } from '@cognitive-engine/core'

function createMockLlm(
  parsed: Record<string, unknown> = {},
): LlmProvider {
  return {
    complete: vi.fn(),
    completeJson: vi.fn().mockResolvedValue({
      content: JSON.stringify(parsed),
      parsed,
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      finishReason: 'stop',
    } satisfies LlmResponse & { parsed: unknown }),
  }
}

describe('PerceptionService', () => {
  it('uses quick analysis for short messages', async () => {
    const llm = createMockLlm()
    const service = new PerceptionService(llm)

    const { percept } = await service.perceive('hi')

    expect(percept.analysisMethod).toBe('quick')
    expect(percept.requestType).toBe('greeting')
    expect(llm.completeJson).not.toHaveBeenCalled()
  })

  it('uses quick analysis for greetings regardless of length', async () => {
    const llm = createMockLlm()
    const service = new PerceptionService(llm)

    const { percept } = await service.perceive(
      'Hello there, this is a very long greeting message that exceeds the threshold',
    )

    expect(percept.analysisMethod).toBe('quick')
    expect(llm.completeJson).not.toHaveBeenCalled()
  })

  it('uses deep analysis for complex messages', async () => {
    const llm = createMockLlm({
      emotionalTone: 'anxious',
      urgency: 7,
      requestType: 'advice',
      entities: [{ type: 'concept', value: 'career', confidence: 0.9 }],
      implicitNeeds: ['reassurance', 'guidance'],
      confidence: 0.85,
    })
    const service = new PerceptionService(llm)

    const { percept } = await service.perceive(
      "I've been thinking about whether I should change my career path, it keeps me up at night and I don't know what to do anymore",
    )

    expect(percept.analysisMethod).toBe('deep')
    expect(percept.emotionalTone).toBe('anxious')
    expect(percept.implicitNeeds).toContain('reassurance')
    expect(llm.completeJson).toHaveBeenCalled()
  })

  it('falls back to quick on LLM failure', async () => {
    const llm = createMockLlm()
    vi.mocked(llm.completeJson).mockRejectedValue(new Error('API error'))

    const service = new PerceptionService(llm)
    const { percept } = await service.perceive(
      'This is a long enough message to trigger deep analysis but the LLM will fail',
    )

    expect(percept.analysisMethod).toBe('quick')
    expect(percept.confidence).toBe(0.4)
  })

  it('merges entities from quick and deep analysis', async () => {
    const llm = createMockLlm({
      emotionalTone: 'neutral',
      urgency: 0,
      requestType: 'sharing',
      entities: [{ type: 'person', value: 'Alice', confidence: 0.9 }],
      implicitNeeds: [],
      confidence: 0.8,
    })
    const service = new PerceptionService(llm)

    const { percept } = await service.perceive(
      'Alice sent me an email at alice@example.com about the project deadline',
    )

    const types = percept.entities.map((e) => e.type)
    expect(types).toContain('email')   // from quick (regex)
    expect(types).toContain('person')  // from deep (LLM)
  })

  it('deduplicates entities', async () => {
    const llm = createMockLlm({
      emotionalTone: 'neutral',
      urgency: 0,
      requestType: 'sharing',
      entities: [{ type: 'email', value: 'test@example.com', confidence: 0.95 }],
      implicitNeeds: [],
      confidence: 0.8,
    })
    const service = new PerceptionService(llm)

    const { percept } = await service.perceive(
      'Send this to test@example.com please, the address is test@example.com',
    )

    const emails = percept.entities.filter((e) => e.type === 'email')
    expect(emails).toHaveLength(1)
  })

  it('extracts belief candidates', async () => {
    const llm = createMockLlm({
      emotionalTone: 'frustrated',
      urgency: 5,
      requestType: 'venting',
      entities: [],
      implicitNeeds: ['support'],
      confidence: 0.9,
    })
    const service = new PerceptionService(llm)

    const { beliefCandidates } = await service.perceive(
      "I can't believe this happened again, nothing ever works out the way I plan",
    )

    expect(beliefCandidates).toContainEqual(
      expect.objectContaining({
        subject: 'user',
        predicate: 'current_emotion',
        object: 'frustrated',
      }),
    )
    expect(beliefCandidates).toContainEqual(
      expect.objectContaining({
        subject: 'user',
        predicate: 'might_need',
        object: 'support',
      }),
    )
  })

  it('respects custom simpleMessageThreshold', async () => {
    const llm = createMockLlm({
      emotionalTone: 'neutral',
      urgency: 0,
      requestType: 'sharing',
      entities: [],
      implicitNeeds: [],
      confidence: 0.7,
    })
    const service = new PerceptionService(llm, {
      simpleMessageThreshold: 10,
    })

    const { percept } = await service.perceive('tell me more about this')

    expect(percept.analysisMethod).toBe('deep')
    expect(llm.completeJson).toHaveBeenCalled()
  })
})
