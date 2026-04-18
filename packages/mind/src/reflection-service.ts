import type {
  Store,
  LlmProvider,
  Reflection,
  Percept,
  Episode,
} from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'
import type { ReflectionExtractionResult } from './types.js'

const COLLECTION = 'reflections'
const MAX_RECENT_EPISODES = 3
const EXTRACTION_TEMPERATURE = 0.3
const EXTRACTION_MAX_TOKENS = 500
const DEFAULT_PRIORITY = 0.5

const EXTRACTION_PROMPT = `Based on the conversation context, generate reflections — internal thoughts about the user.

Types of reflections:
- "observation": something you noticed about the user's behavior or state
- "question": something worth asking the user later
- "insight": a deeper connection or pattern you noticed
- "concern": something potentially worrying about the user
- "celebration": something positive worth acknowledging

Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "reflections": [
    {
      "type": "observation" | "question" | "insight" | "concern" | "celebration",
      "content": "the reflection text",
      "priority": 0 to 1
    }
  ]
}

Rules:
- Generate 0-3 reflections per message (don't force it)
- High priority = should be surfaced soon
- Return {"reflections": []} if nothing noteworthy`

/**
 * Generates and manages internal reflections about the user.
 *
 * Reflections are agent's "inner thoughts" - observations, questions,
 * insights that inform future conversations.
 */
export class ReflectionService {
  constructor(
    private readonly store: Store,
    private readonly llm: LlmProvider,
    private readonly maxReflections: number = 5,
  ) {}

  /** Generate reflections from current percept and recent episodes. */
  async generate(
    userId: string,
    percept: Percept,
    recentEpisodes: Episode[],
  ): Promise<Reflection[]> {
    try {
      const episodesSummary = recentEpisodes
        .slice(0, MAX_RECENT_EPISODES)
        .map((e) => `- ${e.summary}`)
        .join('\n')

      const context = [
        `Current message: "${percept.rawText}"`,
        `Emotion: ${percept.emotionalTone}, Urgency: ${percept.urgency}`,
        episodesSummary ? `Recent episodes:\n${episodesSummary}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      const response =
        await this.llm.completeJson<ReflectionExtractionResult>(
          [
            { role: 'system', content: EXTRACTION_PROMPT },
            { role: 'user', content: context },
          ],
          { temperature: EXTRACTION_TEMPERATURE, maxTokens: EXTRACTION_MAX_TOKENS },
        )

      const now = new Date()
      const reflections: Reflection[] = []

      for (const r of response.parsed.reflections ?? []) {
        if (!r.content) continue

        const reflection: Reflection = {
          id: uid('ref'),
          userId,
          type: r.type ?? 'observation',
          content: r.content,
          priority: clamp(r.priority ?? DEFAULT_PRIORITY, 0, 1),
          createdAt: now,
        }

        await this.store.set(COLLECTION, reflection.id, reflection)
        reflections.push(reflection)
      }

      return reflections
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[cognitive-engine] reflection.generate: ${message}`)
      return []
    }
  }

  /** Get active reflections for a user, sorted by priority. */
  async getActive(userId: string): Promise<Reflection[]> {
    const all = await this.store.find<Reflection>(COLLECTION, {
      where: { userId },
    })

    const now = Date.now()
    const active = all.filter(
      (r) => !r.expiresAt || r.expiresAt.getTime() > now,
    )

    active.sort((a, b) => b.priority - a.priority)
    return active.slice(0, this.maxReflections)
  }

  /** Remove a reflection (e.g. after it's been acted on). */
  async dismiss(reflectionId: string): Promise<void> {
    await this.store.delete(COLLECTION, reflectionId)
  }

  /** Remove expired reflections. */
  async cleanup(userId: string): Promise<number> {
    const all = await this.store.find<Reflection>(COLLECTION, {
      where: { userId },
    })

    const now = Date.now()
    let removed = 0

    for (const r of all) {
      if (r.expiresAt && r.expiresAt.getTime() <= now) {
        await this.store.delete(COLLECTION, r.id)
        removed++
      }
    }

    return removed
  }
}
