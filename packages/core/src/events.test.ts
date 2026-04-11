import { describe, it, expect, vi } from 'vitest'
import { CognitiveEventEmitter } from './events.js'
import type { Percept } from './types.js'

describe('CognitiveEventEmitter', () => {
  it('calls registered handler on emit', () => {
    const emitter = new CognitiveEventEmitter()
    const handler = vi.fn()

    emitter.on('perception:complete', handler)
    const percept = { rawText: 'hello', emotionalTone: 'neutral' } as Percept
    emitter.emit('perception:complete', percept)

    expect(handler).toHaveBeenCalledWith(percept)
  })

  it('supports multiple handlers for same event', () => {
    const emitter = new CognitiveEventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()

    emitter.on('perception:complete', h1)
    emitter.on('perception:complete', h2)
    emitter.emit('perception:complete', { rawText: 'test' } as Percept)

    expect(h1).toHaveBeenCalledTimes(1)
    expect(h2).toHaveBeenCalledTimes(1)
  })

  it('removes handler with off()', () => {
    const emitter = new CognitiveEventEmitter()
    const handler = vi.fn()

    emitter.on('perception:complete', handler)
    emitter.off('perception:complete', handler)
    emitter.emit('perception:complete', { rawText: 'test' } as Percept)

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
    emitter.emit('perception:complete', { rawText: 'test' } as Percept)
    expect(goodHandler).toHaveBeenCalledTimes(1)
  })

  it('removeAllListeners clears specific event', () => {
    const emitter = new CognitiveEventEmitter()
    const h1 = vi.fn()
    const h2 = vi.fn()

    emitter.on('perception:complete', h1)
    emitter.on('belief:added', h2)

    emitter.removeAllListeners('perception:complete')
    emitter.emit('perception:complete', { rawText: 'test' } as Percept)
    emitter.emit('belief:added', { id: '1' } as any)

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
    emitter.emit('perception:complete', { rawText: 'test' } as Percept)
    emitter.emit('belief:added', { id: '1' } as any)

    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })
})
