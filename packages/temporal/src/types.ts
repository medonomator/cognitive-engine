import type { BehaviorPattern, FuturePrediction } from '@cognitive-engine/core'

/** LLM extraction result for causal chain building. */
export interface CausalExtractionResult {
  chains: Array<{
    events: string[]
    rootCause: string
    finalEffect: string
    chainType: string
    confidence: number
    description: string
  }>
}

/** LLM extraction result for pattern detection. */
export interface PatternExtractionResult {
  patterns: Array<{
    patternType: string
    description: string
    frequency: BehaviorPattern['frequency']
    confidence: number
  }>
}

/** LLM extraction result for prediction generation. */
export interface PredictionExtractionResult {
  predictions: Array<{
    predictedState: string
    timeframe: string
    predictionType: string
    severity: FuturePrediction['severity']
    isWarning: boolean
    recommendation?: string
    confidence: number
  }>
}

/** Resolved configuration for TemporalEngine. */
export interface ResolvedTemporalConfig {
  lookbackDays: number
  minPatternConfidence: number
}
