import type { Reflection, Relationship } from '@cognitive-engine/core'

/** Resolved configuration for MindService. */
export interface ResolvedMindConfig {
  maxReflections: number
  maxRelationships: number
  maxOpenLoops: number
}

/** LLM extraction result for open loop detection. */
export interface OpenLoopExtractionResult {
  loops: Array<{
    question: string
    importance: number
    askAfterDays?: number
  }>
}

/** LLM extraction result for reflection generation. */
export interface ReflectionExtractionResult {
  reflections: Array<{
    type: Reflection['type']
    content: string
    priority: number
  }>
}

/** LLM extraction result for relationship extraction. */
export interface RelationshipExtractionResult {
  people: Array<{
    name: string
    type: Relationship['type']
    sentiment: number
    context: string
  }>
}
