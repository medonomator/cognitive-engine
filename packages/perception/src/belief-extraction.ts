import type { Percept, BeliefCandidate } from '@cognitive-engine/core'

/**
 * Extract belief candidates from a perception result.
 * Converts entities and implicit needs into structured belief triples.
 */
export function extractBeliefCandidates(percept: Percept): BeliefCandidate[] {
  const candidates: BeliefCandidate[] = []

  // Emotional state as belief
  if (percept.emotionalTone !== 'neutral') {
    candidates.push({
      subject: 'user',
      predicate: 'current_emotion',
      object: percept.emotionalTone,
      confidence: Math.min(percept.confidence, 0.8),
    })
  }

  // Entities → beliefs
  for (const entity of percept.entities) {
    const predicate = entityTypeToPredicate(entity.type)
    if (predicate) {
      candidates.push({
        subject: 'user',
        predicate,
        object: entity.value,
        confidence: entity.confidence,
      })
    }
  }

  // Implicit needs → beliefs
  for (const need of percept.implicitNeeds) {
    candidates.push({
      subject: 'user',
      predicate: 'might_need',
      object: need,
      confidence: 0.6,
    })
  }

  return candidates
}

function entityTypeToPredicate(type: string): string | undefined {
  const mapping: Record<string, string> = {
    email: 'has_email',
    person: 'knows_person',
    place: 'mentioned_place',
    concept: 'interested_in',
    event: 'mentioned_event',
    url: 'shared_url',
  }
  return mapping[type]
}
