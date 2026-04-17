import type { MetacognitiveFlag } from '@cognitive-engine/core'
import type { AssessmentInput, ResolvedMetacognitionConfig } from './types.js'

/**
 * Estimates cognitive load based on how many context layers are active.
 *
 * High cognitive load means the agent is juggling too many concerns
 * simultaneously - many active facts, episodes, emotions, boundaries,
 * and intentions. This can degrade response quality.
 */

/** Weight for each context dimension in load calculation. */
const LOAD_WEIGHTS = {
  intentions: 0.20,
  relevantEpisodes: 0.15,
  relevantFacts: 0.15,
  boundaries: 0.15,
  emotionalIntensity: 0.15,
  knowledgeGaps: 0.10,
  hypotheses: 0.10,
} as const

/** Saturation point per dimension - values above this don't increase load further. */
const SATURATION = {
  intentions: 5,
  relevantEpisodes: 8,
  relevantFacts: 10,
  boundaries: 3,
  knowledgeGaps: 5,
  hypotheses: 5,
} as const

export function analyzeCognitiveLoad(
  input: AssessmentInput,
  knowledgeGapCount: number,
  config: ResolvedMetacognitionConfig,
): { load: number; flags: MetacognitiveFlag[] } {
  const load = computeLoad(input, knowledgeGapCount)
  const flags: MetacognitiveFlag[] = []

  if (load > config.cognitiveLoadThreshold) {
    flags.push({
      type: 'cognitive_overload',
      description: `Cognitive load is high (${(load * 100).toFixed(0)}%) — too many active contexts`,
      severity: load > 0.9 ? 'high' : 'medium',
    })
  }

  return { load, flags }
}

function computeLoad(input: AssessmentInput, knowledgeGapCount: number): number {
  const intentionLoad = saturate(input.reasoning.intentions.length, SATURATION.intentions)
  const episodeLoad = saturate(input.episodicContext?.relevantEpisodes.length ?? 0, SATURATION.relevantEpisodes)
  const factLoad = saturate(input.semanticContext?.relevantFacts.length ?? 0, SATURATION.relevantFacts)
  const boundaryLoad = saturate(input.socialContext?.boundaries.length ?? 0, SATURATION.boundaries)
  const gapLoad = saturate(knowledgeGapCount, SATURATION.knowledgeGaps)
  const hypothesisLoad = saturate(input.reasoning.hypotheses.length, SATURATION.hypotheses)

  const emotionalLoad = input.emotionalContext?.currentState
    ? input.emotionalContext.currentState.intensity
    : 0

  return (
    intentionLoad * LOAD_WEIGHTS.intentions +
    episodeLoad * LOAD_WEIGHTS.relevantEpisodes +
    factLoad * LOAD_WEIGHTS.relevantFacts +
    boundaryLoad * LOAD_WEIGHTS.boundaries +
    emotionalLoad * LOAD_WEIGHTS.emotionalIntensity +
    gapLoad * LOAD_WEIGHTS.knowledgeGaps +
    hypothesisLoad * LOAD_WEIGHTS.hypotheses
  )
}

/** Maps count to [0, 1] range with saturation at max. */
function saturate(count: number, max: number): number {
  return Math.min(count / max, 1)
}
