import { describe, it, expect } from 'vitest'
import { mergeTrace } from './trace.js'

describe('mergeTrace', () => {
  it('returns the component context when nothing is inherited', () => {
    expect(mergeTrace(undefined, { userId: '91', tags: ['memory'] })).toEqual({
      userId: '91',
      tags: ['memory'],
    })
  })

  it('keeps inherited trace identity and adds component naming', () => {
    const merged = mergeTrace(
      { traceId: 'trace-1', sessionId: 'chat-5', tags: ['ai-assistant'] },
      { userId: '91', generationName: 'memory.extract-facts', tags: ['memory'] },
    )

    expect(merged).toEqual({
      traceId: 'trace-1',
      sessionId: 'chat-5',
      userId: '91',
      generationName: 'memory.extract-facts',
      tags: ['ai-assistant', 'memory'],
    })
  })

  it('lets the component win on conflicting fields', () => {
    const merged = mergeTrace(
      { generationName: 'outer' },
      { generationName: 'inner' },
    )

    expect(merged.generationName).toBe('inner')
  })

  it('deduplicates tags coming from both sides', () => {
    const merged = mergeTrace({ tags: ['mind'] }, { tags: ['mind', 'social'] })

    expect(merged.tags).toEqual(['mind', 'social'])
  })

  it('leaves tags undefined when neither side has any', () => {
    expect(mergeTrace(undefined, { userId: '91' }).tags).toBeUndefined()
  })
})
