import type { FactSource } from '@cognitive-engine/core'

/** LLM extraction result for episode detection. */
export interface EpisodeExtractionResult {
  hasEpisode: boolean
  summary: string
  details: string
  participants: string[]
  location?: string
  emotions: string[]
  emotionalValence: number
  emotionalIntensity: number
  category: string
  tags: string[]
  importance: number
}

/** LLM extraction result for fact extraction. */
export interface FactExtractionResult {
  facts: ExtractedFact[]
}

/** A single extracted fact from LLM output. */
export interface ExtractedFact {
  subject: string
  predicate: string
  object: string
  confidence: number
  source: FactSource
}

/** Resolved configuration for EpisodicMemory. */
export interface ResolvedMemoryConfig {
  decayLambda: number
  scoringWeights: { relevance: number; recency: number; importance: number }
  similarityThreshold: number
  categories: string[]
  maxRecentEpisodes: number
  maxRelevantEpisodes: number
}

/** Resolved configuration for SemanticMemory. */
export interface ResolvedSemanticConfig {
  similarityThreshold: number
  minConfidence: number
  reinforcementBoost: number
  maxConfidence: number
  maxResults: number
  scoringWeights: { relevance: number; confidence: number }
}
