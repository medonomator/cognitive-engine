import type {
  Store,
  LlmProvider,
  FuturePrediction,
  BehaviorPattern,
  CausalChain,
  Episode,
} from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'
import type { PredictionExtractionResult } from './types.js'

const COLLECTION = 'predictions'
const LLM_TEMPERATURE = 0.2
const LLM_MAX_TOKENS = 500
const DEFAULT_CONFIDENCE = 0.5
const RECENT_EPISODES_LIMIT = 5

const EXTRACTION_PROMPT = `Based on the user's behavioral patterns, causal chains, and recent episodes, predict what might happen next.

Types of predictions:
- "emotional": likely emotional state changes
- "behavioral": likely behavioral changes
- "risk": potential negative outcomes to watch for
- "opportunity": potential positive outcomes to encourage

Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "predictions": [
    {
      "predictedState": "what you predict will happen",
      "timeframe": "when (e.g. 'next week', 'in 2-3 days', 'within a month')",
      "predictionType": "emotional" | "behavioral" | "risk" | "opportunity",
      "severity": "low" | "medium" | "high",
      "isWarning": true/false,
      "recommendation": "what the agent should do about it (optional)",
      "confidence": 0 to 1
    }
  ]
}

Rules:
- Only predict things with reasonable evidence
- Warnings (isWarning=true) should be actionable
- Return {"predictions": []} if nothing to predict`

/**
 * Generates predictions about future user states based on
 * patterns, causal chains, and recent episodes.
 *
 * Predictions can be warnings ("burnout risk") or opportunities
 * ("good time to suggest exercise").
 */
export class Predictor {
  constructor(
    private readonly store: Store,
    private readonly llm: LlmProvider,
  ) {}

  /** Generate predictions from patterns, chains, and episodes. */
  async predict(
    userId: string,
    patterns: BehaviorPattern[],
    chains: CausalChain[],
    recentEpisodes: Episode[],
  ): Promise<FuturePrediction[]> {
    if (patterns.length === 0 && chains.length === 0 && recentEpisodes.length === 0) {
      return []
    }

    try {
      const context = this.buildContext(patterns, chains, recentEpisodes)
      const response = await this.extractPredictions(context)

      return this.processExtractedPredictions(userId, response.parsed.predictions ?? [])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[cognitive-engine] predictor.predict: ${message}`)
      return []
    }
  }

  /** Get all active (unresolved) predictions. */
  async getActive(userId: string): Promise<FuturePrediction[]> {
    const all = await this.store.find<FuturePrediction>(COLLECTION, {
      where: { userId },
    })

    return all
      .filter((p) => !p.isResolved)
      .sort((a, b) => b.confidence - a.confidence)
  }

  /** Get active warnings only. */
  async getWarnings(userId: string): Promise<FuturePrediction[]> {
    const active = await this.getActive(userId)
    return active.filter((p) => p.isWarning)
  }

  /** Resolve a prediction (mark as correct or incorrect). */
  async resolve(
    predictionId: string,
    wasCorrect: boolean,
  ): Promise<void> {
    const prediction = await this.store.get<FuturePrediction>(
      COLLECTION,
      predictionId,
    )
    if (!prediction) return

    await this.store.set(COLLECTION, predictionId, {
      ...prediction,
      isResolved: true,
      wasCorrect,
    })
  }

  /** Get prediction accuracy for a user (for self-assessment). */
  async getAccuracy(userId: string): Promise<{
    total: number
    resolved: number
    correct: number
    accuracy: number
  }> {
    const all = await this.store.find<FuturePrediction>(COLLECTION, {
      where: { userId },
    })

    const resolved = all.filter((p) => p.isResolved)
    const correct = resolved.filter((p) => p.wasCorrect === true)

    return {
      total: all.length,
      resolved: resolved.length,
      correct: correct.length,
      accuracy: resolved.length > 0 ? correct.length / resolved.length : 0,
    }
  }

  private async extractPredictions(
    context: string,
  ): Promise<{ parsed: PredictionExtractionResult }> {
    return this.llm.completeJson<PredictionExtractionResult>(
      [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: context },
      ],
      { temperature: LLM_TEMPERATURE, maxTokens: LLM_MAX_TOKENS },
    )
  }

  private async processExtractedPredictions(
    userId: string,
    rawPredictions: PredictionExtractionResult['predictions'],
  ): Promise<FuturePrediction[]> {
    const now = new Date()
    const predictions: FuturePrediction[] = []

    for (const prediction of rawPredictions) {
      if (!prediction.predictedState) continue

      const saved: FuturePrediction = {
        id: uid('pred'),
        userId,
        predictedState: prediction.predictedState,
        timeframe: prediction.timeframe ?? 'unknown',
        predictionType: prediction.predictionType ?? 'behavioral',
        severity: prediction.severity ?? 'low',
        isWarning: prediction.isWarning ?? false,
        recommendation: prediction.recommendation,
        confidence: clamp(prediction.confidence ?? DEFAULT_CONFIDENCE, 0, 1),
        isResolved: false,
        createdAt: now,
      }

      await this.store.set(COLLECTION, saved.id, saved)
      predictions.push(saved)
    }

    return predictions
  }

  private buildContext(
    patterns: BehaviorPattern[],
    chains: CausalChain[],
    episodes: Episode[],
  ): string {
    const sections: string[] = []

    if (patterns.length > 0) {
      sections.push(this.formatPatternsSection(patterns))
    }
    if (chains.length > 0) {
      sections.push(this.formatChainsSection(chains))
    }
    if (episodes.length > 0) {
      sections.push(this.formatEpisodesSection(episodes))
    }

    return sections.join('\n\n')
  }

  private formatPatternsSection(patterns: BehaviorPattern[]): string {
    const lines = patterns.map(
      (p) =>
        `- [${p.patternType}] ${p.description} (${p.frequency}, confidence: ${p.confidence.toFixed(2)})`,
    )
    return `Behavioral patterns:\n${lines.join('\n')}`
  }

  private formatChainsSection(chains: CausalChain[]): string {
    const lines = chains.map(
      (c) => `- ${c.rootCause} → ${c.finalEffect} (${c.chainType})`,
    )
    return `Causal chains:\n${lines.join('\n')}`
  }

  private formatEpisodesSection(episodes: Episode[]): string {
    const lines = episodes
      .slice(-RECENT_EPISODES_LIMIT)
      .map(
        (e) =>
          `- [${e.occurredAt.toISOString().slice(0, 10)}] ${e.summary} (${e.emotions.join(', ')})`,
      )
    return `Recent episodes:\n${lines.join('\n')}`
  }
}
