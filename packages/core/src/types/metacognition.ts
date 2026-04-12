export interface MetacognitiveAssessment {
  overallConfidence: number
  understanding: number
  responseQuality: number
  cognitiveLoad: number
  knowledgeGaps: string[]
  contradictions: MetacognitiveContradiction[]
  suggestedStrategy: MetacognitiveStrategy
  flags: MetacognitiveFlag[]
}

export interface MetacognitiveContradiction {
  description: string
  source: 'belief_vs_percept' | 'fact_conflict' | 'intention_conflict' | 'emotion_vs_tone'
  severity: 'low' | 'medium' | 'high'
}

export type MetacognitiveStrategy =
  | 'proceed_normally'
  | 'ask_clarifying_question'
  | 'acknowledge_uncertainty'
  | 'offer_alternatives'
  | 'defer_to_user'
  | 'seek_more_context'
  | 'address_contradiction'

export type MetacognitiveFlagType =
  | 'low_confidence'
  | 'confusion'
  | 'topic_shift'
  | 'emotional_mismatch'
  | 'boundary_risk'
  | 'coherence_conflict'
  | 'cognitive_overload'
  | 'repetitive_strategy'

export interface MetacognitiveFlag {
  type: MetacognitiveFlagType
  description: string
  severity: 'low' | 'medium' | 'high'
}
