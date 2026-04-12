import type {
  Store,
  LlmProvider,
  Relationship,
} from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'
import type { RelationshipExtractionResult } from './types.js'

const COLLECTION = 'relationships'
const EMA_EXISTING_WEIGHT = 0.7
const EMA_NEW_WEIGHT = 0.3

const EXTRACTION_PROMPT = `Extract mentions of people from the message. For each person mentioned, determine:

Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "people": [
    {
      "name": "person's name or role (e.g. 'mom', 'boss', 'Alex')",
      "type": "family" | "friend" | "colleague" | "romantic" | "other",
      "sentiment": -1 to 1 (how the user feels about this person in this context),
      "context": "brief context of the mention"
    }
  ]
}

Rules:
- Only extract real people, not hypothetical or fictional
- Normalize names: "my mom" → "mom", "my wife Sarah" → "Sarah"
- Return {"people": []} if no people mentioned`

/**
 * Tracks relationships the user mentions across conversations.
 *
 * Builds a social graph: who are the important people in the user's life,
 * what's the sentiment, how often they're mentioned.
 */
export class RelationshipTracker {
  constructor(
    private readonly store: Store,
    private readonly llm: LlmProvider,
    private readonly maxRelationships: number = 10,
  ) {}

  /** Extract and update relationships from a message. */
  async extract(userId: string, message: string): Promise<Relationship[]> {
    try {
      const response =
        await this.llm.completeJson<RelationshipExtractionResult>(
          [
            { role: 'system', content: EXTRACTION_PROMPT },
            { role: 'user', content: message },
          ],
          { temperature: 0, maxTokens: 300 },
        )

      const updated: Relationship[] = []

      for (const person of response.parsed.people ?? []) {
        if (!person.name) continue

        const existing = await this.findByName(userId, person.name)
        const now = new Date()

        if (existing) {
          // Update existing relationship
          const newSentiment =
            existing.sentiment * EMA_EXISTING_WEIGHT + person.sentiment * EMA_NEW_WEIGHT
          const updatedRel: Relationship = {
            ...existing,
            sentiment: clamp(newSentiment, -1, 1),
            mentionCount: existing.mentionCount + 1,
            context: person.context,
            lastMentioned: now,
            type: person.type ?? existing.type,
          }
          await this.store.set(COLLECTION, existing.id, updatedRel)
          updated.push(updatedRel)
        } else {
          // New relationship
          const rel: Relationship = {
            id: uid('rel'),
            userId,
            personName: person.name,
            type: person.type ?? 'other',
            sentiment: clamp(person.sentiment ?? 0, -1, 1),
            mentionCount: 1,
            context: person.context ?? '',
            lastMentioned: now,
            createdAt: now,
          }
          await this.store.set(COLLECTION, rel.id, rel)
          updated.push(rel)
        }
      }

      return updated
    } catch (error: unknown) {
      const message_ = error instanceof Error ? error.message : String(error)
      console.error(`[cognitive-engine] relationship.extract: ${message_}`)
      return []
    }
  }

  /** Get all relationships for a user, sorted by mention count. */
  async getAll(userId: string): Promise<Relationship[]> {
    const all = await this.store.find<Relationship>(COLLECTION, {
      where: { userId },
    })

    all.sort((a, b) => b.mentionCount - a.mentionCount)
    return all.slice(0, this.maxRelationships)
  }

  /** Get a specific relationship by person name. */
  async getByName(
    userId: string,
    personName: string,
  ): Promise<Relationship | null> {
    return this.findByName(userId, personName)
  }

  /** Get relationships by type (family, friend, etc.). */
  async getByType(
    userId: string,
    type: Relationship['type'],
  ): Promise<Relationship[]> {
    const all = await this.store.find<Relationship>(COLLECTION, {
      where: { userId },
    })

    return all.filter((r) => r.type === type)
  }

  // ── Private ──

  private async findByName(
    userId: string,
    name: string,
  ): Promise<Relationship | null> {
    const all = await this.store.find<Relationship>(COLLECTION, {
      where: { userId },
    })

    const normalized = name.toLowerCase()
    return all.find((r) => r.personName.toLowerCase() === normalized) ?? null
  }
}
