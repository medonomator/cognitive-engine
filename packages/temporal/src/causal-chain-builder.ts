import type {
  Store,
  LlmProvider,
  CausalChain,
  Episode,
} from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'
import type { CausalExtractionResult } from './types.js'

const COLLECTION = 'causal_chains'
const LLM_TEMPERATURE = 0.1
const LLM_MAX_TOKENS = 600
const DEFAULT_CONFIDENCE = 0.5
const MIN_CHAIN_EVENTS = 2

const EXTRACTION_PROMPT = `Analyze the following episodes and identify causal chains — sequences of events where one thing led to another.

Look for:
- Stress cascades: work pressure → poor sleep → irritability → conflict
- Positive spirals: exercise → better mood → productivity → confidence
- Behavioral loops: procrastination → guilt → avoidance → more procrastination
- External triggers: event → emotional reaction → behavioral change

Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "chains": [
    {
      "events": ["event A", "event B", "event C"],
      "rootCause": "the initial trigger",
      "finalEffect": "the end result",
      "chainType": "stress_cascade" | "positive_spiral" | "behavioral_loop" | "external_trigger" | "other",
      "confidence": 0 to 1,
      "description": "human-readable description of the chain"
    }
  ]
}

Rules:
- Chains must have at least 2 events
- Only report chains with clear causal links (not just temporal proximity)
- Return {"chains": []} if no clear causal chains found`

/**
 * Identifies causal chains across episodes - "A caused B which led to C".
 *
 * Helps the agent understand WHY things happen, not just WHAT happened.
 */
export class CausalChainBuilder {
  constructor(
    private readonly store: Store,
    private readonly llm: LlmProvider,
  ) {}

  /** Build causal chains from a set of episodes. */
  async build(
    userId: string,
    episodes: Episode[],
  ): Promise<CausalChain[]> {
    if (episodes.length < MIN_CHAIN_EVENTS) return []

    try {
      const summaries = this.formatEpisodeSummaries(episodes)
      const response = await this.extractChains(summaries)

      return this.processExtractedChains(userId, response.parsed.chains ?? [])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[cognitive-engine] causalChain.build: ${message}`)
      return []
    }
  }

  /** Get all causal chains for a user. */
  async getAll(userId: string): Promise<CausalChain[]> {
    const all = await this.store.find<CausalChain>(COLLECTION, {
      where: { userId },
    })

    return all.sort((a, b) => b.confidence - a.confidence)
  }

  /** Get chains by type. */
  async getByType(
    userId: string,
    chainType: string,
  ): Promise<CausalChain[]> {
    const all = await this.getAll(userId)
    return all.filter((c) => c.chainType === chainType)
  }

  /** Get chains involving a specific root cause. */
  async getByRootCause(
    userId: string,
    cause: string,
  ): Promise<CausalChain[]> {
    const all = await this.getAll(userId)
    const normalized = cause.toLowerCase()
    return all.filter((c) =>
      c.rootCause.toLowerCase().includes(normalized),
    )
  }

  private formatEpisodeSummaries(episodes: Episode[]): string {
    return episodes
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .map(
        (e) =>
          `[${e.occurredAt.toISOString().slice(0, 10)}] ${e.summary} (emotions: ${e.emotions.join(', ')}, importance: ${e.importance})`,
      )
      .join('\n')
  }

  private async extractChains(
    summaries: string,
  ): Promise<{ parsed: CausalExtractionResult }> {
    return this.llm.completeJson<CausalExtractionResult>(
      [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: summaries },
      ],
      { temperature: LLM_TEMPERATURE, maxTokens: LLM_MAX_TOKENS },
    )
  }

  private async processExtractedChains(
    userId: string,
    rawChains: CausalExtractionResult['chains'],
  ): Promise<CausalChain[]> {
    const now = new Date()
    const chains: CausalChain[] = []

    for (const chain of rawChains) {
      if (!chain.events || chain.events.length < MIN_CHAIN_EVENTS) continue

      const isDuplicate = await this.isDuplicate(userId, chain.rootCause, chain.finalEffect)
      if (isDuplicate) continue

      const saved: CausalChain = {
        id: uid('chain'),
        userId,
        events: chain.events,
        rootCause: chain.rootCause ?? chain.events[0] ?? '',
        finalEffect: chain.finalEffect ?? chain.events[chain.events.length - 1] ?? '',
        chainType: chain.chainType ?? 'other',
        confidence: clamp(chain.confidence ?? DEFAULT_CONFIDENCE, 0, 1),
        description: chain.description ?? '',
        createdAt: now,
      }

      await this.store.set(COLLECTION, saved.id, saved)
      chains.push(saved)
    }

    return chains
  }

  private async isDuplicate(
    userId: string,
    rootCause: string,
    finalEffect: string,
  ): Promise<boolean> {
    const all = await this.store.find<CausalChain>(COLLECTION, {
      where: { userId },
    })

    const rc = rootCause.toLowerCase()
    const fe = finalEffect.toLowerCase()

    return all.some(
      (c) =>
        c.rootCause.toLowerCase().includes(rc) &&
        c.finalEffect.toLowerCase().includes(fe),
    )
  }
}
