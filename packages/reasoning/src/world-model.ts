import { uid } from '@cognitive-engine/core'
import type { Belief, BeliefSource, BeliefCandidate } from '@cognitive-engine/core'

const SOURCE_WEIGHTS: Record<BeliefSource, number> = {
  explicit: 0.9,
  observed: 0.6,
  inferred: 0.4,
}

/**
 * Manages user beliefs (world model) with Bayesian confidence updates.
 */
export class WorldModel {
  private beliefs: Map<string, Belief> = new Map()

  /** Get all current beliefs. */
  getBeliefs(): Belief[] {
    return Array.from(this.beliefs.values())
  }

  /** Get beliefs matching a predicate. */
  findByPredicate(predicate: string): Belief[] {
    return this.getBeliefs().filter((b) => b.predicate === predicate)
  }

  /** Get a specific belief by subject+predicate+object triple. */
  findByTriple(
    subject: string,
    predicate: string,
    object: string,
  ): Belief | undefined {
    return this.getBeliefs().find(
      (b) =>
        b.subject === subject &&
        b.predicate === predicate &&
        b.object === object,
    )
  }

  /**
   * Add or update a belief from a candidate.
   * If the belief already exists, performs Bayesian confidence update.
   */
  addBelief(candidate: BeliefCandidate, source: BeliefSource): Belief {
    const existing = this.findByTriple(
      candidate.subject,
      candidate.predicate,
      candidate.object,
    )

    if (existing) {
      const updated: Belief = {
        ...existing,
        confidence: this.updateConfidence(
          existing.confidence,
          candidate.confidence,
          source,
        ),
        evidence: [...existing.evidence, `Updated at ${new Date().toISOString()}`],
        updatedAt: new Date(),
      }
      this.beliefs.set(updated.id, updated)
      return updated
    }

    const now = new Date()
    const belief: Belief = {
      id: uid('belief'),
      subject: candidate.subject,
      predicate: candidate.predicate,
      object: candidate.object,
      confidence: candidate.confidence,
      source,
      evidence: [],
      createdAt: now,
      updatedAt: now,
    }
    this.beliefs.set(belief.id, belief)
    return belief
  }

  /** Strengthen belief confidence. */
  confirmBelief(beliefId: string): void {
    const belief = this.beliefs.get(beliefId)
    if (!belief) return
    this.beliefs.set(beliefId, {
      ...belief,
      confidence: Math.min(0.99, belief.confidence + 0.1),
      updatedAt: new Date(),
    })
  }

  /** Weaken belief confidence. Auto-deletes if below threshold. */
  weakenBelief(beliefId: string, amount = 0.15): void {
    const belief = this.beliefs.get(beliefId)
    if (!belief) return
    const newConfidence = belief.confidence - amount
    if (newConfidence < 0.1) {
      this.beliefs.delete(beliefId)
    } else {
      this.beliefs.set(beliefId, {
        ...belief,
        confidence: newConfidence,
        updatedAt: new Date(),
      })
    }
  }

  /** Apply periodic decay to inferred beliefs. */
  applyDecay(): void {
    for (const [id, belief] of this.beliefs) {
      const decayRate = belief.source === 'inferred' ? 0.1 : 0.05
      const newConfidence = belief.confidence * (1 - decayRate)
      if (newConfidence < 0.1) {
        this.beliefs.delete(id)
      } else {
        this.beliefs.set(id, { ...belief, confidence: newConfidence })
      }
    }
  }

  /** Remove a specific belief. */
  removeBelief(beliefId: string): void {
    this.beliefs.delete(beliefId)
  }

  /** Clear all beliefs. */
  clear(): void {
    this.beliefs.clear()
  }

  get size(): number {
    return this.beliefs.size
  }

  private updateConfidence(
    prior: number,
    newEvidence: number,
    source: BeliefSource,
  ): number {
    const weight = SOURCE_WEIGHTS[source]
    const updated = prior * (1 - weight) + newEvidence * weight
    return Math.min(0.99, Math.max(0.01, updated))
  }
}
