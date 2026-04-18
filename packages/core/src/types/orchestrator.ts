import type { Percept } from './perception.js'
import type { ReasoningResult } from './reasoning.js'
import type { EpisodicContext, SemanticContext } from './memory.js'
import type { TemporalContext } from './temporal.js'
import type { MindContext } from './mind.js'
import type { EmotionalContext } from './emotional.js'
import type { SocialContext } from './social.js'
import type { PlanningContext } from './planning.js'
import type { MetacognitiveAssessment } from './metacognition.js'

export interface CognitiveResponse {
  percept: Percept
  reasoning: ReasoningResult
  episodicContext?: EpisodicContext
  semanticContext?: SemanticContext
  mindContext?: MindContext
  emotionalContext?: EmotionalContext
  socialContext?: SocialContext
  temporalContext?: TemporalContext
  planningContext?: PlanningContext
  metacognition?: MetacognitiveAssessment
  suggestedResponse: string
  systemPrompt: string
}
