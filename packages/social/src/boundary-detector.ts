import type {
  Store,
  LlmProvider,
  SocialBoundary,
} from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'
import type { BoundaryExtractionResult } from './types.js'

const COLLECTION = 'social_boundaries'
const DEFAULT_SENSITIVITY = 0.5
const DEFAULT_SENSITIVITY_THRESHOLD = 0.5

const EXTRACTION_PROMPT = `Detect social boundaries in the user's message — topics or areas where the user signals discomfort, avoidance, or sets limits.

Look for:
- Explicit: "I don't want to talk about X", "that's too personal", "let's change the subject"
- Implicit: short answers on sensitive topics, deflection, changing subject, nervous tone
- Topic sensitivity: some topics are inherently sensitive (health, finances, family conflict, trauma)

Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "boundaries": [
    {
      "topic": "the topic or area",
      "sensitivity": 0 to 1 (how sensitive this topic is for the user),
      "isExplicit": true/false (did the user explicitly set this boundary?)
    }
  ]
}

Rules:
- Explicit boundaries are always high confidence
- Only detect genuine boundaries, not casual topic changes
- Return {"boundaries": []} if no boundaries detected`

/**
 * Detects and tracks social boundaries - topics or areas
 * where the user signals discomfort.
 *
 * The agent should respect boundaries by avoiding or
 * treading carefully on sensitive topics.
 */
export class BoundaryDetector {
  constructor(
    private readonly store: Store,
    private readonly llm: LlmProvider,
    private readonly maxBoundaries: number = 20,
  ) {}

  /** Detect boundaries from a message. */
  async detect(
    userId: string,
    message: string,
  ): Promise<SocialBoundary[]> {
    try {
      const response =
        await this.llm.completeJson<BoundaryExtractionResult>(
          [
            { role: 'system', content: EXTRACTION_PROMPT },
            { role: 'user', content: message },
          ],
          { temperature: 0, maxTokens: 300 },
        )

      const now = new Date()
      const boundaries: SocialBoundary[] = []

      for (const boundary of response.parsed.boundaries ?? []) {
        if (!boundary.topic) continue

        const existing = await this.findByTopic(userId, boundary.topic)
        if (existing) {
          // Update sensitivity (increase only, never decrease)
          if (boundary.sensitivity > existing.sensitivity) {
            const updated: SocialBoundary = {
              ...existing,
              sensitivity: boundary.sensitivity,
              isExplicit: existing.isExplicit || boundary.isExplicit,
            }
            await this.store.set(COLLECTION, existing.id, updated)
            boundaries.push(updated)
          } else {
            boundaries.push(existing)
          }
          continue
        }

        const saved: SocialBoundary = {
          id: uid('bound'),
          userId,
          topic: boundary.topic,
          sensitivity: clamp(boundary.sensitivity ?? DEFAULT_SENSITIVITY, 0, 1),
          isExplicit: boundary.isExplicit ?? false,
          createdAt: now,
        }

        await this.store.set(COLLECTION, saved.id, saved)
        boundaries.push(saved)
      }

      return boundaries
    } catch (error: unknown) {
      const message_ = error instanceof Error ? error.message : String(error)
      console.error(`[cognitive-engine] boundary.detect: ${message_}`)
      return []
    }
  }

  /** Get all boundaries for a user. */
  async getAll(userId: string): Promise<SocialBoundary[]> {
    const all = await this.store.find<SocialBoundary>(COLLECTION, {
      where: { userId },
    })

    return all
      .sort((a, b) => b.sensitivity - a.sensitivity)
      .slice(0, this.maxBoundaries)
  }

  /** Check if a topic is sensitive for a user. */
  async isSensitive(
    userId: string,
    topic: string,
    threshold: number = DEFAULT_SENSITIVITY_THRESHOLD,
  ): Promise<boolean> {
    const boundary = await this.findByTopic(userId, topic)
    return boundary !== null && boundary.sensitivity >= threshold
  }

  /** Remove a boundary (e.g. user signals topic is now OK). */
  async remove(boundaryId: string): Promise<void> {
    await this.store.delete(COLLECTION, boundaryId)
  }

  private async findByTopic(
    userId: string,
    topic: string,
  ): Promise<SocialBoundary | null> {
    const all = await this.store.find<SocialBoundary>(COLLECTION, {
      where: { userId },
    })

    const normalized = topic.toLowerCase()
    return (
      all.find((b) => b.topic.toLowerCase().includes(normalized) ||
        normalized.includes(b.topic.toLowerCase())) ?? null
    )
  }
}
