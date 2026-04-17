import type {
  Percept,
  ReasoningResult,
  EpisodicContext,
  SemanticContext,
  EmotionalContext,
  SocialContext,
} from '@cognitive-engine/core'

/** All signals available for metacognitive assessment. */
export interface AssessmentInput {
  percept: Percept
  reasoning: ReasoningResult
  episodicContext?: EpisodicContext
  semanticContext?: SemanticContext
  emotionalContext?: EmotionalContext
  socialContext?: SocialContext
}

// Shared thresholds (used by multiple modules)

export const ENTITY_CONFIDENCE_THRESHOLD = 0.6
export const HIGH_BOUNDARY_SENSITIVITY = 0.7

/** Resolved (non-optional) config for MetacognitionService. */
export interface ResolvedMetacognitionConfig {
  lowConfidenceThreshold: number
  checkBoundaryRisk: boolean
  cognitiveLoadThreshold: number
  strategyHistorySize: number
}
