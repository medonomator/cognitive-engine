import type { MetacognitiveFlag, IntentionType } from '@cognitive-engine/core'
import type { AssessmentInput } from './types.js'

/**
 * Detects incoherencies within the cognitive cycle.
 *
 * Checks for:
 * - Contradictory intentions (e.g. inform + challenge same target)
 * - Emotional tone mismatch (percept says happy, emotional model says sad)
 * - Fact conflicts in current context
 */

const CONFLICTING_INTENTION_PAIRS: ReadonlyArray<readonly [IntentionType, IntentionType]> = [
  ['inform', 'clarify'],
  ['empathize', 'challenge'],
  ['suggest', 'clarify'],
] as const

export function analyzeCoherence(input: AssessmentInput): MetacognitiveFlag[] {
  const flags: MetacognitiveFlag[] = []

  detectIntentionConflicts(input, flags)
  detectEmotionToneMismatch(input, flags)
  detectFactConflicts(input, flags)

  return flags
}

function detectIntentionConflicts(
  input: AssessmentInput,
  flags: MetacognitiveFlag[],
): void {
  const intentionTypes = new Set<IntentionType>(input.reasoning.intentions.map((i) => i.type))

  for (const [a, b] of CONFLICTING_INTENTION_PAIRS) {
    if (intentionTypes.has(a) && intentionTypes.has(b)) {
      flags.push({
        type: 'coherence_conflict',
        description: `Conflicting intentions: "${a}" and "${b}" active simultaneously`,
        severity: 'medium',
      })
    }
  }
}

function detectEmotionToneMismatch(
  input: AssessmentInput,
  flags: MetacognitiveFlag[],
): void {
  const state = input.emotionalContext?.currentState
  if (!state) return

  const perceptTone = input.percept.emotionalTone
  const modelValence = state.valence

  const toneIsPositive = perceptTone === 'positive' || perceptTone === 'excited'
  const toneIsNegative = perceptTone === 'negative' || perceptTone === 'angry' || perceptTone === 'sad'

  const VALENCE_MISMATCH_THRESHOLD = 0.3

  if (toneIsPositive && modelValence < -VALENCE_MISMATCH_THRESHOLD) {
    flags.push({
      type: 'coherence_conflict',
      description: `Perception says "${perceptTone}" but emotional model valence is ${modelValence.toFixed(2)}`,
      severity: 'medium',
    })
  }

  if (toneIsNegative && modelValence > VALENCE_MISMATCH_THRESHOLD) {
    flags.push({
      type: 'coherence_conflict',
      description: `Perception says "${perceptTone}" but emotional model valence is ${modelValence.toFixed(2)}`,
      severity: 'medium',
    })
  }
}

function detectFactConflicts(
  input: AssessmentInput,
  flags: MetacognitiveFlag[],
): void {
  const facts = input.semanticContext?.relevantFacts ?? []
  if (facts.length < 2) return

  for (let i = 0; i < facts.length; i++) {
    for (let j = i + 1; j < facts.length; j++) {
      const a = facts[i]!
      const b = facts[j]!

      const sameSubjectPredicate =
        a.subject.toLowerCase() === b.subject.toLowerCase() &&
        a.predicate.toLowerCase() === b.predicate.toLowerCase()

      if (sameSubjectPredicate && a.object.toLowerCase() !== b.object.toLowerCase()) {
        flags.push({
          type: 'coherence_conflict',
          description: `Contradictory facts: "${a.subject} ${a.predicate}" → "${a.object}" vs "${b.object}"`,
          severity: a.confidence > 0.7 && b.confidence > 0.7 ? 'high' : 'medium',
        })
      }
    }
  }
}
