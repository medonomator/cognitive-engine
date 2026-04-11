// ═══════════════════════════════════════════
// Pipeline — composable processing steps
// ═══════════════════════════════════════════

/**
 * Middleware function.
 * Each step can read/modify the context and must call next() to continue.
 */
export type Middleware<TCtx> = (
  ctx: TCtx,
  next: () => Promise<void>,
) => Promise<void>

/**
 * Composable pipeline of middleware functions.
 *
 * @example
 * ```ts
 * const pipeline = new Pipeline<MessageContext>()
 *   .use(perceiveMiddleware)
 *   .use(reasonMiddleware)
 *   .use(adaptMiddleware)
 *
 * const ctx = { userId: '123', message: 'hello' }
 * await pipeline.execute(ctx)
 * // ctx is now enriched by all middleware
 * ```
 */
export class Pipeline<TCtx> {
  private middlewares: Middleware<TCtx>[] = []

  /** Add a middleware step to the pipeline. */
  use(middleware: Middleware<TCtx>): this {
    this.middlewares.push(middleware)
    return this
  }

  /** Execute all middleware in order. Returns the enriched context. */
  async execute(ctx: TCtx): Promise<TCtx> {
    let index = 0
    const middlewares = this.middlewares

    const next = async (): Promise<void> => {
      if (index < middlewares.length) {
        const mw = middlewares[index]!
        index++
        await mw(ctx, next)
      }
    }

    await next()
    return ctx
  }
}
