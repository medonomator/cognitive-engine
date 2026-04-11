import type {
  Store,
  EmbeddingProvider,
  Episode,
  EpisodeSearchResult,
  EpisodeQuery,
  EpisodicContext,
  ConsolidationResult,
  MemoryConfig,
} from '@cognitive-engine/core'
import { cosineSimilarity, exponentialDecay } from '@cognitive-engine/math'

const COLLECTION = 'episodes'
const MS_PER_DAY = 1000 * 60 * 60 * 24
const ACCESS_BOOST_PER_VIEW = 0.1
const MAX_ACCESS_BOOST = 0.5
const CONSOLIDATION_AGE_DAYS = 30
const FORGOTTEN_THRESHOLD = 0.1
const MIN_ACCESS_TO_KEEP = 2
const CONSOLIDATION_DECAY_FACTOR = 0.01

interface ResolvedMemoryConfig {
  decayLambda: number
  scoringWeights: { relevance: number; recency: number; importance: number }
  similarityThreshold: number
  categories: string[]
  maxRecentEpisodes: number
  maxRelevantEpisodes: number
}

const DEFAULT_CONFIG: ResolvedMemoryConfig = {
  decayLambda: 0.03,
  scoringWeights: { relevance: 0.4, recency: 0.3, importance: 0.3 },
  similarityThreshold: 0.7,
  categories: [],
  maxRecentEpisodes: 5,
  maxRelevantEpisodes: 3,
}

/**
 * Episodic memory with semantic search, exponential decay, and consolidation.
 *
 * Uses embeddings + cosine similarity for relevance search.
 * Combines relevance, recency, and importance for final scoring.
 */
export class EpisodicMemory {
  private readonly store: Store
  private readonly embedding: EmbeddingProvider
  private readonly config: ResolvedMemoryConfig

  constructor(
    store: Store,
    embedding: EmbeddingProvider,
    config: MemoryConfig = {},
  ) {
    this.store = store
    this.embedding = embedding
    this.config = {
      decayLambda: config.decayLambda ?? DEFAULT_CONFIG.decayLambda,
      scoringWeights: {
        relevance: config.scoringWeights?.relevance ?? DEFAULT_CONFIG.scoringWeights.relevance,
        recency: config.scoringWeights?.recency ?? DEFAULT_CONFIG.scoringWeights.recency,
        importance: config.scoringWeights?.importance ?? DEFAULT_CONFIG.scoringWeights.importance,
      },
      similarityThreshold: config.similarityThreshold ?? DEFAULT_CONFIG.similarityThreshold,
      categories: config.categories ?? DEFAULT_CONFIG.categories,
      maxRecentEpisodes: config.maxRecentEpisodes ?? DEFAULT_CONFIG.maxRecentEpisodes,
      maxRelevantEpisodes: config.maxRelevantEpisodes ?? DEFAULT_CONFIG.maxRelevantEpisodes,
    }
  }

  /** Store a new episode. */
  async storeEpisode(episode: Episode): Promise<void> {
    await this.store.set(COLLECTION, episode.id, episode)
  }

  /** Retrieve a specific episode by ID. */
  async get(episodeId: string): Promise<Episode | null> {
    return this.store.get<Episode>(COLLECTION, episodeId)
  }

  /** Search episodes with semantic + temporal scoring. */
  async search(query: EpisodeQuery): Promise<EpisodeSearchResult[]> {
    const now = Date.now()
    const relevance = this.config.scoringWeights.relevance
    const recency = this.config.scoringWeights.recency
    const importance = this.config.scoringWeights.importance

    // Fetch candidate episodes
    const candidates = await this.fetchCandidates(query)

    // Compute relevance scores via embedding similarity
    const relevanceScores = await this.computeRelevanceScores(
      query.query,
      candidates,
    )

    // Score and rank
    const results: EpisodeSearchResult[] = []
    for (const ep of candidates) {
      const daysSince = (now - ep.occurredAt.getTime()) / MS_PER_DAY
      const recencyScore = exponentialDecay(daysSince, ep.decayFactor)
      const relevanceScore = relevanceScores.get(ep.id) ?? 0.5
      const accessBoost = Math.min(ep.accessCount * ACCESS_BOOST_PER_VIEW, MAX_ACCESS_BOOST)
      const importanceScore = Math.min(ep.importance + accessBoost, 1)

      const combinedScore =
        relevanceScore * relevance +
        recencyScore * recency +
        importanceScore * importance

      // Skip "forgotten" episodes unless explicitly requested
      if (!query.includeDecayed && recencyScore < 0.1) continue

      results.push({
        episode: ep,
        relevanceScore,
        recencyScore,
        importanceScore,
        combinedScore,
      })
    }

    results.sort((a, b) => b.combinedScore - a.combinedScore)
    return results.slice(0, query.limit ?? this.config.maxRelevantEpisodes)
  }

  /** Build episodic context for the reasoning layer. */
  async getContext(
    userId: string,
    currentQuery?: string,
  ): Promise<EpisodicContext> {
    // Recent episodes
    const recentResults = await this.store.find<Episode>(COLLECTION, {
      where: { userId },
      orderBy: { occurredAt: 'desc' },
      limit: this.config.maxRecentEpisodes,
    })

    // Relevant episodes (semantic search)
    let relevantEpisodes: Episode[] = []
    if (currentQuery) {
      const searchResults = await this.search({
        userId,
        query: currentQuery,
        limit: this.config.maxRelevantEpisodes,
      })
      relevantEpisodes = searchResults.map((r) => r.episode)
    }

    // Detect dominant emotional pattern
    const allEpisodes = [...recentResults, ...relevantEpisodes]
    const emotionalPattern = this.detectEmotionalPattern(allEpisodes)

    return {
      recentEpisodes: recentResults,
      relevantEpisodes,
      emotionalPattern,
    }
  }

  /**
   * Consolidate memories: apply decay, delete forgotten episodes.
   */
  async consolidate(userId: string): Promise<ConsolidationResult> {
    const now = Date.now()
    const episodes = await this.store.find<Episode>(COLLECTION, {
      where: { userId },
    })

    let decayedCount = 0
    let deletedCount = 0

    for (const ep of episodes) {
      const daysSince = (now - ep.occurredAt.getTime()) / MS_PER_DAY
      if (daysSince < CONSOLIDATION_AGE_DAYS) continue

      const newImportance =
        ep.importance * exponentialDecay(daysSince, ep.decayFactor * CONSOLIDATION_DECAY_FACTOR)

      if (newImportance < FORGOTTEN_THRESHOLD && ep.accessCount < MIN_ACCESS_TO_KEEP) {
        // Forget this episode
        await this.store.delete(COLLECTION, ep.id)
        deletedCount++
      } else if (newImportance < ep.importance) {
        // Decay importance
        await this.store.set(COLLECTION, ep.id, {
          ...ep,
          importance: newImportance,
        })
        decayedCount++
      }
    }

    return {
      decayedCount,
      deletedCount,
      remainingCount: episodes.length - deletedCount,
    }
  }

  /** Mark an episode as accessed (boosts importance). */
  async recordAccess(episodeId: string): Promise<void> {
    const ep = await this.store.get<Episode>(COLLECTION, episodeId)
    if (!ep) return
    await this.store.set(COLLECTION, episodeId, {
      ...ep,
      accessCount: ep.accessCount + 1,
      lastAccessed: new Date(),
    })
  }

  // ── Private ──

  private async fetchCandidates(query: EpisodeQuery): Promise<Episode[]> {
    const where: Record<string, unknown> = { userId: query.userId }
    if (query.categories && query.categories.length > 0) {
      // Store doesn't support $in, filter post-fetch
    }

    const episodes = await this.store.find<Episode>(COLLECTION, {
      where,
      orderBy: { occurredAt: 'desc' },
      limit: (query.limit ?? this.config.maxRelevantEpisodes) * 3,
    })

    return episodes.filter((ep) => {
      if (
        query.categories &&
        query.categories.length > 0 &&
        !query.categories.includes(ep.category)
      ) {
        return false
      }
      if (
        query.emotions &&
        query.emotions.length > 0 &&
        !ep.emotions.some((e) => query.emotions!.includes(e))
      ) {
        return false
      }
      if (query.timeRange?.from && ep.occurredAt < query.timeRange.from) {
        return false
      }
      if (query.timeRange?.to && ep.occurredAt > query.timeRange.to) {
        return false
      }
      if (
        query.minImportance !== undefined &&
        ep.importance < query.minImportance
      ) {
        return false
      }
      return true
    })
  }

  private async computeRelevanceScores(
    queryText: string | undefined,
    episodes: Episode[],
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()
    if (!queryText || episodes.length === 0) return scores

    const queryVec = await this.embedding.embed(queryText)

    for (const ep of episodes) {
      if (ep.embedding && ep.embedding.length > 0) {
        const similarity = cosineSimilarity(queryVec, ep.embedding)
        scores.set(ep.id, Math.max(0, similarity))
      }
    }

    return scores
  }

  private detectEmotionalPattern(episodes: Episode[]): string {
    if (episodes.length === 0) return 'neutral'

    const emotionCounts = new Map<string, number>()
    let totalValence = 0

    for (const ep of episodes) {
      totalValence += ep.emotionalValence
      for (const emotion of ep.emotions) {
        emotionCounts.set(emotion, (emotionCounts.get(emotion) ?? 0) + 1)
      }
    }

    const avgValence = totalValence / episodes.length

    // Find dominant emotion
    let dominantEmotion = 'neutral'
    let maxCount = 0
    for (const [emotion, count] of emotionCounts) {
      if (count > maxCount) {
        maxCount = count
        dominantEmotion = emotion
      }
    }

    if (avgValence > 0.3) return `positive (${dominantEmotion})`
    if (avgValence < -0.3) return `negative (${dominantEmotion})`
    if (dominantEmotion !== 'neutral') return dominantEmotion
    return 'neutral'
  }
}
