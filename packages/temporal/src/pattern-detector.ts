import type {
  Store,
  LlmProvider,
  BehaviorPattern,
  Episode,
} from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'
import type { PatternExtractionResult } from './types.js'

const COLLECTION = 'behavior_patterns'
const MS_PER_DAY = 1000 * 60 * 60 * 24

const LLM_TEMPERATURE = 0
const LLM_MAX_TOKENS = 500
const CONFIDENCE_BOOST_FACTOR = 1.1
const MAX_BOOSTED_CONFIDENCE = 0.99
const DEFAULT_CONFIDENCE = 0.5
const DECAY_DELETION_MULTIPLIER = 0.5
const DEFAULT_DECAY_FACTOR = 0.8

const EXTRACTION_PROMPT = `Analyze the following episodes (events from a user's life) and detect recurring behavioral patterns.

Look for:
- Time-based patterns (e.g. "gets stressed every Monday", "exercises on weekends")
- Emotional patterns (e.g. "mood drops after work calls", "happier when talking about hobbies")
- Behavioral patterns (e.g. "avoids conflict", "procrastinates on big tasks")
- Social patterns (e.g. "feels lonely on weekends", "energized after seeing friends")

Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "patterns": [
    {
      "patternType": "emotional" | "behavioral" | "social" | "temporal" | "health",
      "description": "clear description of the pattern",
      "frequency": "daily" | "weekly" | "biweekly" | "monthly" | "irregular",
      "confidence": 0 to 1
    }
  ]
}

Rules:
- Only report patterns with at least 2 supporting episodes
- Higher confidence = more consistent pattern
- Return {"patterns": []} if no clear patterns found`

/**
 * Detects recurring behavioral patterns from episodic memory.
 *
 * Analyzes episodes over a lookback window to find temporal,
 * emotional, behavioral, and social patterns.
 */
export class PatternDetector {
  constructor(
    private readonly store: Store,
    private readonly llm: LlmProvider,
    private readonly lookbackDays: number = 30,
    private readonly minConfidence: number = 0.5,
  ) {}

  /** Detect patterns from a set of episodes. */
  async detect(
    userId: string,
    episodes: Episode[],
  ): Promise<BehaviorPattern[]> {
    if (episodes.length < 2) return []

    const recentEpisodes = this.filterRecent(episodes)
    if (recentEpisodes.length < 2) return []

    try {
      const summaries = this.formatEpisodeSummaries(recentEpisodes)
      const response = await this.extractPatterns(summaries)

      return this.processExtractedPatterns(userId, response.parsed.patterns ?? [])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[cognitive-engine] pattern.detect: ${message}`)
      return []
    }
  }

  /** Get all active patterns for a user. */
  async getActive(userId: string): Promise<BehaviorPattern[]> {
    const all = await this.store.find<BehaviorPattern>(COLLECTION, {
      where: { userId },
    })

    return all
      .filter((p) => p.confidence >= this.minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
  }

  /** Get patterns by type. */
  async getByType(
    userId: string,
    patternType: string,
  ): Promise<BehaviorPattern[]> {
    const all = await this.getActive(userId)
    return all.filter((p) => p.patternType === patternType)
  }

  /** Manually decay a pattern's confidence (when it stops occurring). */
  async decay(patternId: string, factor: number = DEFAULT_DECAY_FACTOR): Promise<void> {
    const pattern = await this.store.get<BehaviorPattern>(
      COLLECTION,
      patternId,
    )
    if (!pattern) return

    const newConfidence = pattern.confidence * factor
    if (newConfidence < this.minConfidence * DECAY_DELETION_MULTIPLIER) {
      await this.store.delete(COLLECTION, patternId)
    } else {
      await this.store.set(COLLECTION, patternId, {
        ...pattern,
        confidence: newConfidence,
      })
    }
  }

  // ── Private ──

  private formatEpisodeSummaries(episodes: Episode[]): string {
    return episodes
      .map(
        (e) =>
          `[${e.occurredAt.toISOString().slice(0, 10)}] ${e.summary} (${e.emotions.join(', ')}, category: ${e.category})`,
      )
      .join('\n')
  }

  private async extractPatterns(
    summaries: string,
  ): Promise<{ parsed: PatternExtractionResult }> {
    return this.llm.completeJson<PatternExtractionResult>(
      [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: summaries },
      ],
      { temperature: LLM_TEMPERATURE, maxTokens: LLM_MAX_TOKENS },
    )
  }

  private async processExtractedPatterns(
    userId: string,
    rawPatterns: PatternExtractionResult['patterns'],
  ): Promise<BehaviorPattern[]> {
    const now = new Date()
    const patterns: BehaviorPattern[] = []

    for (const pattern of rawPatterns) {
      if (!pattern.description || (pattern.confidence ?? 0) < this.minConfidence) continue

      const existing = await this.findSimilar(userId, pattern.description)
      if (existing) {
        await this.reinforce(existing)
        patterns.push(existing)
        continue
      }

      const saved: BehaviorPattern = {
        id: uid('pat'),
        userId,
        patternType: pattern.patternType ?? 'behavioral',
        description: pattern.description,
        frequency: pattern.frequency ?? 'irregular',
        occurrences: 1,
        confidence: clamp(pattern.confidence ?? DEFAULT_CONFIDENCE, 0, 1),
        nextExpected: this.estimateNext(pattern.frequency ?? 'irregular'),
        createdAt: now,
      }

      await this.store.set(COLLECTION, saved.id, saved)
      patterns.push(saved)
    }

    return patterns
  }

  private filterRecent(episodes: Episode[]): Episode[] {
    const cutoff = Date.now() - this.lookbackDays * MS_PER_DAY
    return episodes
      .filter((e) => e.occurredAt.getTime() >= cutoff)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
  }

  private async findSimilar(
    userId: string,
    description: string,
  ): Promise<BehaviorPattern | null> {
    const all = await this.store.find<BehaviorPattern>(COLLECTION, {
      where: { userId },
    })

    const normalized = description.toLowerCase()
    return (
      all.find((p) => {
        const existing = p.description.toLowerCase()
        return (
          existing.includes(normalized) || normalized.includes(existing)
        )
      }) ?? null
    )
  }

  private async reinforce(pattern: BehaviorPattern): Promise<void> {
    const boosted = Math.min(pattern.confidence * CONFIDENCE_BOOST_FACTOR, MAX_BOOSTED_CONFIDENCE)
    await this.store.set(COLLECTION, pattern.id, {
      ...pattern,
      confidence: boosted,
      occurrences: pattern.occurrences + 1,
      nextExpected: this.estimateNext(pattern.frequency),
    })
  }

  private estimateNext(
    frequency: BehaviorPattern['frequency'],
  ): Date | undefined {
    const now = Date.now()
    switch (frequency) {
      case 'daily':
        return new Date(now + MS_PER_DAY)
      case 'weekly':
        return new Date(now + 7 * MS_PER_DAY)
      case 'biweekly':
        return new Date(now + 14 * MS_PER_DAY)
      case 'monthly':
        return new Date(now + 30 * MS_PER_DAY)
      case 'irregular':
        return undefined
    }
  }
}
