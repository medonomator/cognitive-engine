import type {
  LlmProvider,
  EmbeddingProvider,
  Episode,
} from '@cognitive-engine/core'

interface ExtractionResult {
  hasEpisode: boolean
  summary: string
  details: string
  participants: string[]
  location?: string
  emotions: string[]
  emotionalValence: number
  emotionalIntensity: number
  category: string
  tags: string[]
  importance: number
}

const EXTRACTION_PROMPT = `Analyze the following message and determine if it contains a personal episode (event, experience, story).
Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "hasEpisode": true/false,
  "summary": "one-line summary",
  "details": "key details",
  "participants": ["person names"],
  "location": "place or null",
  "emotions": ["emotion labels"],
  "emotionalValence": -1 to 1,
  "emotionalIntensity": 0 to 1,
  "category": "work|personal|health|relationship|finance|education|hobby|other",
  "tags": ["relevant tags"],
  "importance": 0 to 1
}

If the message is not a personal episode (greetings, questions, commands), set hasEpisode=false and leave other fields with defaults.`

let idCounter = 0
function generateId(): string {
  return `ep_${Date.now()}_${++idCounter}`
}

/**
 * Extracts episodic memories from user messages using LLM analysis.
 */
export class EpisodeExtractor {
  constructor(
    private readonly llm: LlmProvider,
    private readonly embedding: EmbeddingProvider,
  ) {}

  /**
   * Analyze a message and extract an episode if present.
   * Returns null if the message doesn't contain a personal episode.
   */
  async extract(
    userId: string,
    message: string,
    occurredAt?: Date,
  ): Promise<Episode | null> {
    const response = await this.llm.completeJson<ExtractionResult>(
      [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: message },
      ],
      { temperature: 0, maxTokens: 500 },
    )

    const result = response.parsed
    if (!result.hasEpisode) return null

    const now = new Date()
    const vector = await this.embedding.embed(
      `${result.summary}. ${result.details}`,
    )

    return {
      id: generateId(),
      userId,
      summary: result.summary ?? '',
      details: result.details ?? '',
      participants: result.participants ?? [],
      location: result.location,
      occurredAt: occurredAt ?? now,
      reportedAt: now,
      emotionalValence: clamp(result.emotionalValence ?? 0, -1, 1),
      emotionalIntensity: clamp(result.emotionalIntensity ?? 0, 0, 1),
      emotions: result.emotions ?? [],
      category: result.category ?? 'other',
      tags: result.tags ?? [],
      importance: clamp(result.importance ?? 0.5, 0, 1),
      accessCount: 0,
      decayFactor: 0.03,
      embedding: vector,
      createdAt: now,
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
