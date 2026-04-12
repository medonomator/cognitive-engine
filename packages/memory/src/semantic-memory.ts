import type {
  Store,
  EmbeddingProvider,
  Fact,
  FactSearchResult,
  FactQuery,
  SemanticContext,
  SemanticMemoryConfig,
} from '@cognitive-engine/core'
import { cosineSimilarity } from '@cognitive-engine/math'
import type { ResolvedSemanticConfig } from './types.js'

const COLLECTION = 'facts'
const CONFLICT_CONFIDENCE_REDUCTION = 0.5
const DEFAULT_RELEVANCE_SCORE = 0.5

const DEFAULT_CONFIG: ResolvedSemanticConfig = {
  similarityThreshold: 0.6,
  minConfidence: 0.3,
  reinforcementBoost: 0.1,
  maxConfidence: 0.99,
  maxResults: 10,
  scoringWeights: { relevance: 0.6, confidence: 0.4 },
}

/**
 * Semantic memory stores factual knowledge as subject-predicate-object triples.
 *
 * Features:
 * - CRUD for facts with confidence tracking
 * - Embedding-based semantic search
 * - Confidence reinforcement (repeated facts become stronger)
 * - Conflict resolution (contradictory facts reduce confidence of old ones)
 * - Formatted context generation for reasoning layer
 */
export class SemanticMemory {
  private readonly store: Store
  private readonly embedding: EmbeddingProvider
  private readonly config: ResolvedSemanticConfig

  constructor(
    store: Store,
    embedding: EmbeddingProvider,
    config: SemanticMemoryConfig = {},
  ) {
    this.store = store
    this.embedding = embedding
    this.config = {
      similarityThreshold:
        config.similarityThreshold ?? DEFAULT_CONFIG.similarityThreshold,
      minConfidence: config.minConfidence ?? DEFAULT_CONFIG.minConfidence,
      reinforcementBoost:
        config.reinforcementBoost ?? DEFAULT_CONFIG.reinforcementBoost,
      maxConfidence: config.maxConfidence ?? DEFAULT_CONFIG.maxConfidence,
      maxResults: config.maxResults ?? DEFAULT_CONFIG.maxResults,
      scoringWeights: {
        relevance:
          config.scoringWeights?.relevance ??
          DEFAULT_CONFIG.scoringWeights.relevance,
        confidence:
          config.scoringWeights?.confidence ??
          DEFAULT_CONFIG.scoringWeights.confidence,
      },
    }
  }

  /** Store a new fact. If a matching fact exists, reinforce its confidence. */
  async storeFact(fact: Fact): Promise<void> {
    const existing = await this.findExactMatch(
      fact.userId,
      fact.subject,
      fact.predicate,
      fact.object,
    )

    if (existing) {
      await this.reinforce(existing, fact.evidence)
      return
    }

    // Check for contradictions (same subject+predicate, different object)
    await this.resolveConflicts(fact)

    await this.store.set(COLLECTION, fact.id, fact)
  }

  /** Retrieve a specific fact by ID. */
  async get(factId: string): Promise<Fact | null> {
    return this.store.get<Fact>(COLLECTION, factId)
  }

  /** Search facts by semantic similarity and/or subject/predicate filter. */
  async search(query: FactQuery): Promise<FactSearchResult[]> {
    const candidates = await this.fetchCandidates(query)

    const relevanceScores = await this.computeRelevanceScores(
      query.query,
      candidates,
    )

    const { relevance, confidence } = this.config.scoringWeights
    const results: FactSearchResult[] = []

    for (const fact of candidates) {
      if (fact.confidence < (query.minConfidence ?? this.config.minConfidence)) {
        continue
      }

      const relevanceScore = relevanceScores.get(fact.id) ?? DEFAULT_RELEVANCE_SCORE
      const confidenceScore = fact.confidence
      const combinedScore =
        relevanceScore * relevance + confidenceScore * confidence

      results.push({
        fact,
        relevanceScore,
        confidenceScore,
        combinedScore,
      })
    }

    results.sort((a, b) => b.combinedScore - a.combinedScore)
    return results.slice(0, query.limit ?? this.config.maxResults)
  }

  /** Get all facts for a subject. */
  async getFactsAbout(userId: string, subject: string): Promise<Fact[]> {
    const all = await this.store.find<Fact>(COLLECTION, {
      where: { userId },
    })

    const normalized = subject.toLowerCase()
    return all.filter((f) => f.subject.toLowerCase() === normalized)
  }

  /** Get all facts with a specific predicate (e.g. "works_at", "likes"). */
  async getFactsByPredicate(
    userId: string,
    predicate: string,
  ): Promise<Fact[]> {
    const all = await this.store.find<Fact>(COLLECTION, {
      where: { userId },
    })

    const normalized = predicate.toLowerCase()
    return all.filter((f) => f.predicate.toLowerCase() === normalized)
  }

  /** Build semantic context for the reasoning layer. */
  async getContext(
    userId: string,
    currentQuery?: string,
  ): Promise<SemanticContext> {
    let relevantFacts: Fact[] = []

    if (currentQuery) {
      const results = await this.search({
        userId,
        query: currentQuery,
        limit: this.config.maxResults,
      })
      relevantFacts = results.map((r) => r.fact)
    } else {
      // No query — return top facts by confidence
      const all = await this.store.find<Fact>(COLLECTION, {
        where: { userId },
      })
      relevantFacts = all
        .filter((f) => f.confidence >= this.config.minConfidence)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.config.maxResults)
    }

    // Group facts by subject
    const subjectFacts = new Map<string, Fact[]>()
    for (const fact of relevantFacts) {
      const existing = subjectFacts.get(fact.subject) ?? []
      existing.push(fact)
      subjectFacts.set(fact.subject, existing)
    }

    const formattedContext = this.formatContext(subjectFacts)

    return { relevantFacts, subjectFacts, formattedContext }
  }

  /** Update a fact's object value and adjust confidence. */
  async updateFact(
    factId: string,
    newObject: string,
    evidence?: string,
  ): Promise<void> {
    const fact = await this.store.get<Fact>(COLLECTION, factId)
    if (!fact) return

    const now = new Date()
    const vector = await this.embedding.embed(
      `${fact.subject} ${fact.predicate} ${newObject}`,
    )

    const updatedEvidence = evidence
      ? [...fact.evidence, evidence]
      : fact.evidence

    await this.store.set(COLLECTION, factId, {
      ...fact,
      object: newObject,
      embedding: vector,
      evidence: updatedEvidence,
      updatedAt: now,
    })
  }

  /** Delete a fact. */
  async deleteFact(factId: string): Promise<void> {
    await this.store.delete(COLLECTION, factId)
  }

  /** Mark a fact as accessed (for usage tracking). */
  async recordAccess(factId: string): Promise<void> {
    const fact = await this.store.get<Fact>(COLLECTION, factId)
    if (!fact) return

    await this.store.set(COLLECTION, factId, {
      ...fact,
      accessCount: fact.accessCount + 1,
      lastAccessed: new Date(),
    })
  }

  // ── Private ──

  private async findExactMatch(
    userId: string,
    subject: string,
    predicate: string,
    object: string,
  ): Promise<Fact | null> {
    const all = await this.store.find<Fact>(COLLECTION, {
      where: { userId },
    })

    const s = subject.toLowerCase()
    const p = predicate.toLowerCase()
    const o = object.toLowerCase()

    return (
      all.find(
        (f) =>
          f.subject.toLowerCase() === s &&
          f.predicate.toLowerCase() === p &&
          f.object.toLowerCase() === o,
      ) ?? null
    )
  }

  private async reinforce(fact: Fact, newEvidence: string[]): Promise<void> {
    const boosted = Math.min(
      fact.confidence + this.config.reinforcementBoost,
      this.config.maxConfidence,
    )

    const mergedEvidence = [
      ...fact.evidence,
      ...newEvidence.filter((e) => !fact.evidence.includes(e)),
    ]

    await this.store.set(COLLECTION, fact.id, {
      ...fact,
      confidence: boosted,
      evidence: mergedEvidence,
      accessCount: fact.accessCount + 1,
      updatedAt: new Date(),
    })
  }

  private async resolveConflicts(newFact: Fact): Promise<void> {
    const all = await this.store.find<Fact>(COLLECTION, {
      where: { userId: newFact.userId },
    })

    const s = newFact.subject.toLowerCase()
    const p = newFact.predicate.toLowerCase()

    const conflicts = all.filter(
      (f) =>
        f.subject.toLowerCase() === s &&
        f.predicate.toLowerCase() === p &&
        f.object.toLowerCase() !== newFact.object.toLowerCase(),
    )

    for (const conflict of conflicts) {
      // Reduce confidence of the conflicting fact
      const reduced = conflict.confidence * CONFLICT_CONFIDENCE_REDUCTION
      if (reduced < this.config.minConfidence) {
        await this.store.delete(COLLECTION, conflict.id)
      } else {
        await this.store.set(COLLECTION, conflict.id, {
          ...conflict,
          confidence: reduced,
          updatedAt: new Date(),
        })
      }
    }
  }

  private async fetchCandidates(query: FactQuery): Promise<Fact[]> {
    const all = await this.store.find<Fact>(COLLECTION, {
      where: { userId: query.userId },
    })

    return all.filter((f) => {
      if (
        query.subject &&
        f.subject.toLowerCase() !== query.subject.toLowerCase()
      ) {
        return false
      }
      if (
        query.predicate &&
        f.predicate.toLowerCase() !== query.predicate.toLowerCase()
      ) {
        return false
      }
      return true
    })
  }

  private async computeRelevanceScores(
    queryText: string | undefined,
    facts: Fact[],
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()
    if (!queryText || facts.length === 0) return scores

    const queryVec = await this.embedding.embed(queryText)

    for (const fact of facts) {
      if (fact.embedding && fact.embedding.length > 0) {
        const similarity = cosineSimilarity(queryVec, fact.embedding)
        if (similarity >= this.config.similarityThreshold) {
          scores.set(fact.id, Math.max(0, similarity))
        }
      }
    }

    return scores
  }

  private formatContext(subjectFacts: Map<string, Fact[]>): string {
    if (subjectFacts.size === 0) return ''

    const lines: string[] = ['Known facts:']

    for (const [subject, facts] of subjectFacts) {
      lines.push(`  ${subject}:`)
      for (const fact of facts) {
        const conf = Math.round(fact.confidence * 100)
        lines.push(`    - ${fact.predicate}: ${fact.object} (${conf}%)`)
      }
    }

    return lines.join('\n')
  }
}
