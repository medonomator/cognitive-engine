import type { LlmTraceContext } from './providers.js'

/**
 * Merge a caller-supplied trace context with the one a component knows about itself.
 * Component values win on conflict; tags from both sides are kept.
 */
export function mergeTrace(
  inherited: LlmTraceContext | undefined,
  own: LlmTraceContext,
): LlmTraceContext {
  const tags = [...(inherited?.tags ?? []), ...(own.tags ?? [])]

  return {
    ...inherited,
    ...own,
    tags: tags.length > 0 ? [...new Set(tags)] : undefined,
  }
}
