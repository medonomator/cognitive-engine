import type {
  Percept,
  CognitiveState,
  Intention,
  IntentionType,
  Belief,
  InferenceRule,
  BeliefCandidate,
} from '@cognitive-engine/core'

const REQUEST_TO_INTENTION: Record<string, IntentionType> = {
  question: 'inform',
  task: 'inform',
  creative: 'inform',
  advice: 'suggest',
  venting: 'empathize',
  sharing: 'empathize',
  greeting: 'inform',
  feedback: 'empathize',
}

const NEGATIVE_EMOTIONS = new Set(['frustrated', 'anxious', 'negative'])

/**
 * Generate intentions from percept + cognitive state using BDI rules.
 */
export function generateIntentions(
  percept: Percept,
  state: CognitiveState,
): Intention[] {
  const intentions: Intention[] = []

  // CRITICAL: listening mode = ONLY empathize, no advice
  if (percept.responseMode === 'listening') {
    return [
      {
        type: 'empathize',
        target: percept.emotionalTone || 'neutral',
        priority: 10,
        reason: 'User is sharing, not asking for advice',
      },
    ]
  }

  // Primary intention by request type
  const intentionType =
    REQUEST_TO_INTENTION[percept.requestType] ?? 'inform'
  intentions.push({
    type: intentionType,
    target: percept.rawText.substring(0, 50),
    priority: 10,
    reason: `Primary response to ${percept.requestType}`,
  })

  // Negative emotion → empathize first
  if (NEGATIVE_EMOTIONS.has(percept.emotionalTone)) {
    intentions.push({
      type: 'empathize',
      target: percept.emotionalTone,
      priority: 8,
      reason: 'User is experiencing negative emotion',
    })
  }

  // High urgency → prioritize speed
  if (percept.urgency > 7) {
    intentions.push({
      type: 'inform',
      target: 'urgent_response',
      priority: 9,
      reason: 'High urgency detected',
    })
  }

  // Few beliefs → clarify
  if (state.beliefs.length < 5) {
    intentions.push({
      type: 'clarify',
      target: 'user_context',
      priority: 4,
      reason: 'Not enough context about user',
    })
  }

  return intentions.sort((a, b) => b.priority - a.priority)
}

// ═══════════════════════════════════════════
// Built-in inference rules
// ═══════════════════════════════════════════

const BUILTIN_RULES: InferenceRule[] = [
  {
    name: 'negative_emotion_problem',
    condition: (percept, _beliefs) =>
      NEGATIVE_EMOTIONS.has(percept.emotionalTone) &&
      percept.entities.length > 0,
    action: (percept) => ({
      subject: 'user',
      predicate: 'has_problem_with',
      object: percept.entities[0]?.value ?? 'unknown',
      confidence: 0.6,
    }),
  },
  {
    name: 'creative_personality',
    condition: (percept, beliefs) =>
      percept.requestType === 'creative' &&
      !beliefs.some((b) => b.predicate === 'is_creative'),
    action: () => ({
      subject: 'user',
      predicate: 'is_creative',
      object: 'true',
      confidence: 0.5,
    }),
  },
  {
    name: 'values_speed',
    condition: (percept) => percept.urgency > 7,
    action: () => ({
      subject: 'user',
      predicate: 'values',
      object: 'speed',
      confidence: 0.7,
    }),
  },
]

/**
 * Apply inference rules to generate new belief candidates.
 */
export function applyInferenceRules(
  percept: Percept,
  beliefs: Belief[],
  customRules: InferenceRule[] = [],
): BeliefCandidate[] {
  const allRules = [...BUILTIN_RULES, ...customRules]
  const candidates: BeliefCandidate[] = []

  for (const rule of allRules) {
    if (rule.condition(percept, beliefs)) {
      candidates.push(rule.action(percept))
    }
  }

  return candidates
}
