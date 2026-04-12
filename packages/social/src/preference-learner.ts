import type {
  Store,
  LlmProvider,
  CommunicationPreference,
} from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'
import type { PreferenceExtractionResult } from './types.js'

const COLLECTION = 'communication_preferences'

const CONFIDENCE_RETAIN_WEIGHT = 0.6
const CONFIDENCE_NEW_WEIGHT = 0.4
const MAX_CONFIDENCE = 0.99
const DEFAULT_CONFIDENCE = 0.5
const MIN_CONFIDENCE_THRESHOLD = 0.4
const MAX_EVIDENCE_ITEMS = 4

const EXTRACTION_PROMPT = `Analyze the user's communication style from the message and detect preferences.

Dimensions to detect:
- "formality": casual, semi-formal, formal
- "detail_level": brief, moderate, detailed
- "emotional_support": validation_first, advice_first, balanced
- "humor": appreciates_humor, neutral, serious
- "directness": direct, diplomatic, indirect
- "structure": structured_lists, free_flowing, mixed
- "challenge_tolerance": welcomes_challenge, neutral, avoids_challenge

Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "preferences": [
    {
      "dimension": "formality" | "detail_level" | "emotional_support" | "humor" | "directness" | "structure" | "challenge_tolerance",
      "preferredStyle": "the preferred style for this dimension",
      "confidence": 0 to 1
    }
  ]
}

Rules:
- Only report preferences with clear signals (confidence > 0.4)
- Return {"preferences": []} if no clear preferences detected`

/**
 * Learns user's communication preferences over time.
 *
 * Detects how the user prefers to be communicated with:
 * formality, detail level, directness, humor, etc.
 */
export class PreferenceLearner {
  constructor(
    private readonly store: Store,
    private readonly llm: LlmProvider,
    private readonly maxPreferences: number = 10,
  ) {}

  /** Learn preferences from a message. */
  async learn(
    userId: string,
    message: string,
  ): Promise<CommunicationPreference[]> {
    try {
      const response =
        await this.llm.completeJson<PreferenceExtractionResult>(
          [
            { role: 'system', content: EXTRACTION_PROMPT },
            { role: 'user', content: message },
          ],
          { temperature: 0, maxTokens: 300 },
        )

      const updated: CommunicationPreference[] = []
      const now = new Date()

      for (const pref of response.parsed.preferences ?? []) {
        if (!pref.dimension || !pref.preferredStyle) continue
        if ((pref.confidence ?? 0) < MIN_CONFIDENCE_THRESHOLD) continue

        const existing = await this.findByDimension(userId, pref.dimension)

        if (existing) {
          // Update confidence (EMA blend)
          const newConfidence =
            existing.confidence * CONFIDENCE_RETAIN_WEIGHT +
            (pref.confidence ?? DEFAULT_CONFIDENCE) * CONFIDENCE_NEW_WEIGHT

          const evidence = existing.evidence.includes(message)
            ? existing.evidence
            : [...existing.evidence.slice(-MAX_EVIDENCE_ITEMS), message]

          const saved: CommunicationPreference = {
            ...existing,
            preferredStyle: pref.preferredStyle,
            confidence: Math.min(newConfidence, MAX_CONFIDENCE),
            evidence,
            updatedAt: now,
          }
          await this.store.set(COLLECTION, existing.id, saved)
          updated.push(saved)
        } else {
          const saved: CommunicationPreference = {
            id: uid('pref'),
            userId,
            dimension: pref.dimension,
            preferredStyle: pref.preferredStyle,
            confidence: clamp(pref.confidence ?? DEFAULT_CONFIDENCE, 0, 1),
            evidence: [message],
            updatedAt: now,
          }
          await this.store.set(COLLECTION, saved.id, saved)
          updated.push(saved)
        }
      }

      return updated
    } catch (error: unknown) {
      const message_ = error instanceof Error ? error.message : String(error)
      console.error(`[cognitive-engine] preference.learn: ${message_}`)
      return []
    }
  }

  /** Get all learned preferences for a user. */
  async getAll(userId: string): Promise<CommunicationPreference[]> {
    const all = await this.store.find<CommunicationPreference>(COLLECTION, {
      where: { userId },
    })

    return all
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.maxPreferences)
  }

  /** Get preference for a specific dimension. */
  async getPreference(
    userId: string,
    dimension: string,
  ): Promise<CommunicationPreference | null> {
    return this.findByDimension(userId, dimension)
  }

  // ── Private ──

  private async findByDimension(
    userId: string,
    dimension: string,
  ): Promise<CommunicationPreference | null> {
    const all = await this.store.find<CommunicationPreference>(COLLECTION, {
      where: { userId },
    })

    const normalized = dimension.toLowerCase()
    return (
      all.find((p) => p.dimension.toLowerCase() === normalized) ?? null
    )
  }
}
