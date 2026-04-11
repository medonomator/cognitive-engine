import { describe, it, expect } from 'vitest'
import { Pipeline } from './pipeline.js'

interface TestCtx {
  steps: string[]
  value: number
}

describe('Pipeline', () => {
  it('executes middleware in order', async () => {
    const pipeline = new Pipeline<TestCtx>()
      .use(async (ctx, next) => {
        ctx.steps.push('first')
        await next()
      })
      .use(async (ctx, next) => {
        ctx.steps.push('second')
        await next()
      })
      .use(async (ctx, next) => {
        ctx.steps.push('third')
        await next()
      })

    const ctx = await pipeline.execute({ steps: [], value: 0 })
    expect(ctx.steps).toEqual(['first', 'second', 'third'])
  })

  it('allows middleware to modify context', async () => {
    const pipeline = new Pipeline<TestCtx>()
      .use(async (ctx, next) => {
        ctx.value += 10
        await next()
      })
      .use(async (ctx, next) => {
        ctx.value *= 2
        await next()
      })

    const ctx = await pipeline.execute({ steps: [], value: 5 })
    expect(ctx.value).toBe(30) // (5 + 10) * 2
  })

  it('stops if middleware does not call next', async () => {
    const pipeline = new Pipeline<TestCtx>()
      .use(async (ctx, _next) => {
        ctx.steps.push('first')
        // intentionally NOT calling next()
      })
      .use(async (ctx, next) => {
        ctx.steps.push('second')
        await next()
      })

    const ctx = await pipeline.execute({ steps: [], value: 0 })
    expect(ctx.steps).toEqual(['first'])
  })

  it('handles empty pipeline', async () => {
    const pipeline = new Pipeline<TestCtx>()
    const ctx = await pipeline.execute({ steps: [], value: 42 })
    expect(ctx.value).toBe(42)
  })

  it('supports post-processing (code after next())', async () => {
    const pipeline = new Pipeline<TestCtx>()
      .use(async (ctx, next) => {
        ctx.steps.push('before-1')
        await next()
        ctx.steps.push('after-1')
      })
      .use(async (ctx, next) => {
        ctx.steps.push('before-2')
        await next()
        ctx.steps.push('after-2')
      })

    const ctx = await pipeline.execute({ steps: [], value: 0 })
    expect(ctx.steps).toEqual(['before-1', 'before-2', 'after-2', 'after-1'])
  })
})
