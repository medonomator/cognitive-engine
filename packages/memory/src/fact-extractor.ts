import { uid } from '@cognitive-engine/core'
import type {
  LlmProvider,
  EmbeddingProvider,
  Fact,
} from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'
import type { FactExtractionResult } from './types.js'

const EXTRACTION_PROMPT = `Extract factual knowledge from the following message as subject-predicate-object triples.

Focus on:
- Personal facts (name, age, job, location, family)
- Preferences (likes, dislikes, interests, hobbies)
- Relationships (knows, works with, married to)
- Skills and abilities (can, knows how to)
- States and conditions (feels, wants, needs)

Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "facts": [
    {
      "subject": "entity name (usually the user or someone they mention)",
      "predicate": "relationship or property (e.g. works_at, likes, has_child, lives_in)",
      "object": "value or target entity",
      "confidence": 0 to 1,
      "source": "explicit" or "inferred"
    }
  ]
}

Rules:
- "explicit" = user directly stated this fact
- "inferred" = you deduced this from context (lower confidence)
- Use snake_case for predicates (works_at, not "works at")
- Keep subjects/objects as proper nouns or specific terms
- If no facts found, return {"facts": []}`

/**
 * Extracts semantic facts from user messages using LLM analysis.
 */
export class FactExtractor {
  constructor(
    private readonly llm: LlmProvider,
    private readonly embedding: EmbeddingProvider,
  ) {}

  /**
   * Analyze a message and extract facts.
   * Returns array of Fact objects (may be empty if no facts found).
   */
  async extract(userId: string, message: string): Promise<Fact[]> {
    const response = await this.llm.completeJson<FactExtractionResult>(
      [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: message },
      ],
      { temperature: 0, maxTokens: 500 },
    )

    const result = response.parsed
    if (!result.facts || result.facts.length === 0) return []

    const now = new Date()
    const facts: Fact[] = []

    for (const extracted of result.facts) {
      if (!extracted.subject || !extracted.predicate || !extracted.object) {
        continue
      }

      const tripleText = `${extracted.subject} ${extracted.predicate} ${extracted.object}`
      const vector = await this.embedding.embed(tripleText)

      facts.push({
        id: uid('fact'),
        userId,
        subject: extracted.subject,
        predicate: extracted.predicate,
        object: extracted.object,
        confidence: clamp(extracted.confidence ?? 0.7, 0, 1),
        source: extracted.source ?? 'extracted',
        evidence: [message],
        embedding: vector,
        createdAt: now,
        updatedAt: now,
        accessCount: 0,
      })
    }

    return facts
  }
}
