import { describe, it, expect, vi } from 'vitest'
import { CognitiveEventEmitter } from './events.js'
import type { Belief, Percept } from './types.js'

function makePercept(overrides: Partial<Percept> = {}): Percept {
  return {
    rawText: '',
    emotionalTone: 'neutral',
    urgency: 0,
    requestType: 'general',
    responseMode: 'listening',
    entities: [],
    implicitNeeds: [],
    conversationPhase: 'opening',
    confidence: 1,
    analysisMethod: 'quick',
    ...overrides,
  }
}

const testBelief: Belief = {
  id: '1',
  subject: 'test',
  predicate: 'is',
  object: 'valid',
  confidence: 1,
  source: 'explicit',
  evidence: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('CognitiveEventEmitter', () => {
  it('calls registered handler on emit', () => {
    const emitter = new CognitiveEventEmitter()
    const handler = vi.fn()

    emitter.on('perception:complete', handler)
    const percept = makePercept({ rawText: 'hello', emotionalTone: 'neutral' })
    emitter.emit('perception:complete', percept)

    expect(handler).toHaveBeenCalledWith(percept)
  })

  it('supports multiple handlers for same event', () => {
    const emitter = new CognitiveEventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()

    emitter.on('perception:complete', h1)
    emitter.on('perception:complete', h2)
    emitter.emit('perception:complete', makePercept({ rawText: 'test' }))

    expect(h1).toHaveBeenCalledTimes(1)
    expect(h2).toHaveBeenCalledTimes(1)
  })

  it('removes handler with off()', () => {
    const emitter = new CognitiveEventEmitter()
    const handler = vi.fn()

    emitter.on('perception:complete', handler)
    emitter.off('perception:complete', handler)
    emitter.emit('perception:complete', makePercept({ rawText: 'test' }))

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not crash if handler throws', () => {
    const emitter = new CognitiveEventEmitter()
    const badHandler = () => {
      throw new Error('oops')
    }
    const goodHandler = vi.fn()

    emitter.on('perception:complete', badHandler)
    emitter.on('perception:complete', goodHandler)

    // Should not throw
    emitter.emit('perception:complete', makePercept({ rawText: 'test' }))
    expect(goodHandler).toHaveBeenCalledTimes(1)
  })

  it('removeAllListeners clears specific event', () => {
    const emitter = new CognitiveEventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()

    emitter.on('perception:complete', h1)
    emitter.on('belief:added', h2)

    emitter.removeAllListeners('perception:complete')
    emitter.emit('perception:complete', makePercept({ rawText: 'test' }))
    emitter.emit('belief:added', testBelief)

    expect(h1).not.toHaveBeenCalled()
    expect(h2).toHaveBeenCalledTimes(1)
  })

  it('removeAllListeners() clears everything', () => {
    const emitter = new CognitiveEventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()

    emitter.on('perception:complete', h1)
    emitter.on('belief:added', h2)

    emitter.removeAllListeners()
    emitter.emit('perception:complete', makePercept({ rawText: 'test' }))
    emitter.emit('belief:added', testBelief)

    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })
})
