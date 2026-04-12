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

const PRIORITY_HIGHEST = 10
const PRIORITY_URGENT = 9
const PRIORITY_EMPATHY = 8
const PRIORITY_CLARIFY = 4
const URGENCY_HIGH_THRESHOLD = 7
const MIN_BELIEFS_FOR_CONTEXT = 5
const TARGET_PREVIEW_LENGTH = 50

/**
 * Generate intentions from percept + cognitive state using BDI rules.
 */
export function generateIntentions(
  percept: Percept,
  state: CognitiveState,
): Intention[] {
  if (percept.responseMode === 'listening') {
    return [buildListeningIntention(percept)]
  }

  const intentions: Intention[] = [
    buildPrimaryIntention(percept),
  ]

  appendEmpathyIntention(intentions, percept)
  appendUrgencyIntention(intentions, percept)
  appendClarifyIntention(intentions, state)

  return intentions.sort((a, b) => b.priority - a.priority)
}

function buildListeningIntention(percept: Percept): Intention {
  return {
    type: 'empathize',
    target: percept.emotionalTone || 'neutral',
    priority: PRIORITY_HIGHEST,
    reason: 'User is sharing, not asking for advice',
  }
}

function buildPrimaryIntention(percept: Percept): Intention {
  const intentionType = REQUEST_TO_INTENTION[percept.requestType] ?? 'inform'
  return {
    type: intentionType,
    target: percept.rawText.substring(0, TARGET_PREVIEW_LENGTH),
    priority: PRIORITY_HIGHEST,
    reason: `Primary response to ${percept.requestType}`,
  }
}

function appendEmpathyIntention(intentions: Intention[], percept: Percept): void {
  if (NEGATIVE_EMOTIONS.has(percept.emotionalTone)) {
    intentions.push({
      type: 'empathize',
      target: percept.emotionalTone,
      priority: PRIORITY_EMPATHY,
      reason: 'User is experiencing negative emotion',
    })
  }
}

function appendUrgencyIntention(intentions: Intention[], percept: Percept): void {
  if (percept.urgency > URGENCY_HIGH_THRESHOLD) {
    intentions.push({
      type: 'inform',
      target: 'urgent_response',
      priority: PRIORITY_URGENT,
      reason: 'High urgency detected',
    })
  }
}

function appendClarifyIntention(intentions: Intention[], state: CognitiveState): void {
  if (state.beliefs.length < MIN_BELIEFS_FOR_CONTEXT) {
    intentions.push({
      type: 'clarify',
      target: 'user_context',
      priority: PRIORITY_CLARIFY,
      reason: 'Not enough context about user',
    })
  }
}

// ═══════════════════════════════════════════
// Built-in inference rules
// ═══════════════════════════════════════════

const CONFIDENCE_PROBLEM_INFERENCE = 0.6
const CONFIDENCE_CREATIVE_INFERENCE = 0.5
const CONFIDENCE_SPEED_INFERENCE = 0.7

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
      confidence: CONFIDENCE_PROBLEM_INFERENCE,
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
      confidence: CONFIDENCE_CREATIVE_INFERENCE,
    }),
  },
  {
    name: 'values_speed',
    condition: (percept) => percept.urgency > URGENCY_HIGH_THRESHOLD,
    action: () => ({
      subject: 'user',
      predicate: 'values',
      object: 'speed',
      confidence: CONFIDENCE_SPEED_INFERENCE,
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
