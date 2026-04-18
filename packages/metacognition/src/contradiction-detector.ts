import type { MetacognitiveContradiction } from '@cognitive-engine/core'
import {
  ENTITY_CONFIDENCE_THRESHOLD,
  HIGH_BOUNDARY_SENSITIVITY,
  type AssessmentInput,
} from './types.js'

/**
 * Detects contradictions between different cognitive layers.
 *
 * Unlike coherence analysis (which checks internal consistency),
 * this checks cross-layer conflicts:
 * - User says X now, but stored facts say ¬X
 * - Emotional tone contradicts the percept's urgency assessment
 * - Intentions conflict with social boundaries
 */

export function detectContradictions(
  input: AssessmentInput,
): MetacognitiveContradiction[] {
  const contradictions: MetacognitiveContradiction[] = []

  detectPerceptVsFacts(input, contradictions)
  detectEmotionVsTone(input, contradictions)
  detectIntentionVsBoundary(input, contradictions)

  return contradictions
}

/** User's current message contradicts stored facts. */
function detectPerceptVsFacts(
  input: AssessmentInput,
  contradictions: MetacognitiveContradiction[],
): void {
  const entities = input.percept.entities.filter(
    (e) => e.confidence > ENTITY_CONFIDENCE_THRESHOLD,
  )
  const facts = input.semanticContext?.relevantFacts ?? []

  for (const entity of entities) {
    const entityLower = entity.value.toLowerCase()

    for (const fact of facts) {
      if (!fact.subject.toLowerCase().includes(entityLower)) continue

      const rawLower = input.percept.rawText.toLowerCase()
      const negations = ['not', "don't", "doesn't", 'never', 'no longer', "isn't", "aren't", "wasn't"]
      const factObjectLower = fact.object.toLowerCase()

      const mentionsFact = rawLower.includes(factObjectLower)
      const hasNegation = negations.some((neg) => rawLower.includes(neg))

      if (mentionsFact && hasNegation && fact.confidence > 0.5) {
        contradictions.push({
          description: `User may contradict stored fact: "${fact.subject} ${fact.predicate} ${fact.object}" (confidence: ${(fact.confidence * 100).toFixed(0)}%)`,
          source: 'belief_vs_percept',
          severity: fact.confidence > 0.8 ? 'high' : 'medium',
        })
      }
    }
  }
}

/** Emotional volatility contradicts calm/neutral tone. */
function detectEmotionVsTone(
  input: AssessmentInput,
  contradictions: MetacognitiveContradiction[],
): void {
  const volatility = input.emotionalContext?.volatility ?? 0
  const tone = input.percept.emotionalTone

  const VOLATILITY_THRESHOLD = 0.6
  const calmTones = new Set(['neutral', 'calm', 'positive'])

  if (volatility > VOLATILITY_THRESHOLD && calmTones.has(tone)) {
    contradictions.push({
      description: `Emotional volatility is high (${(volatility * 100).toFixed(0)}%) but percept tone is "${tone}"`,
      source: 'emotion_vs_tone',
      severity: 'low',
    })
  }
}

/** Intentions that may cross known social boundaries. */
function detectIntentionVsBoundary(
  input: AssessmentInput,
  contradictions: MetacognitiveContradiction[],
): void {
  const highSensitivity = (input.socialContext?.boundaries ?? []).filter(
    (b) => b.sensitivity > HIGH_BOUNDARY_SENSITIVITY,
  )

  if (highSensitivity.length === 0) return

  const challengeIntentions = input.reasoning.intentions.filter(
    (i) => i.type === 'challenge',
  )

  for (const intention of challengeIntentions) {
    const targetLower = intention.target.toLowerCase()

    for (const boundary of highSensitivity) {
      if (targetLower.includes(boundary.topic.toLowerCase())) {
        contradictions.push({
          description: `"challenge" intention targets sensitive topic: "${boundary.topic}"`,
          source: 'intention_conflict',
          severity: boundary.isExplicit ? 'high' : 'medium',
        })
      }
    }
  }
}
