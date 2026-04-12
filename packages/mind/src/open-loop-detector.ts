import type { Store, LlmProvider, OpenLoop } from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'
import type { OpenLoopExtractionResult } from './types.js'

const COLLECTION = 'open_loops'

const EXTRACTION_PROMPT = `Detect "open loops" in the conversation — things the user mentioned but didn't resolve, questions left unanswered, topics worth following up on later.

Examples:
- "I have a job interview next week" → follow up: "How did the interview go?"
- "My mom is in the hospital" → follow up: "How is your mom doing?"
- "I'm thinking about moving" → follow up: "Have you decided about the move?"
- "I'll try meditation" → follow up: "Have you tried meditation yet?"

Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "loops": [
    {
      "question": "the follow-up question to ask later",
      "importance": 0 to 1,
      "askAfterDays": number of days to wait before asking (optional, default 3)
    }
  ]
}

Rules:
- Only create loops for significant topics (importance > 0.3)
- Don't create loops for casual/trivial mentions
- Return {"loops": []} if nothing to follow up on`

/**
 * Detects and manages "open loops" — unresolved topics worth following up on.
 *
 * Open loops create the feeling of continuity: the agent remembers what
 * matters and checks back at the right time.
 */
export class OpenLoopDetector {
  constructor(
    private readonly store: Store,
    private readonly llm: LlmProvider,
    private readonly maxOpenLoops: number = 3,
  ) {}

  /** Detect new open loops from a message. */
  async detect(userId: string, message: string): Promise<OpenLoop[]> {
    try {
      const response =
        await this.llm.completeJson<OpenLoopExtractionResult>(
          [
            { role: 'system', content: EXTRACTION_PROMPT },
            { role: 'user', content: message },
          ],
          { temperature: 0, maxTokens: 300 },
        )

      const now = new Date()
      const loops: OpenLoop[] = []

      for (const l of response.parsed.loops ?? []) {
        if (!l.question || (l.importance ?? 0) < 0.3) continue

        // Check for duplicate questions
        const isDuplicate = await this.isDuplicate(userId, l.question)
        if (isDuplicate) continue

        const askAfterDays = l.askAfterDays ?? 3
        const askAfter = new Date(
          now.getTime() + askAfterDays * 24 * 60 * 60 * 1000,
        )
        const expiresAt = new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000,
        ) // 30 days

        const loop: OpenLoop = {
          id: uid('loop'),
          userId,
          question: l.question,
          importance: clamp(l.importance ?? 0.5, 0, 1),
          askAfter,
          expiresAt,
          isAsked: false,
          isClosed: false,
          createdAt: now,
        }

        await this.store.set(COLLECTION, loop.id, loop)
        loops.push(loop)
      }

      return loops
    } catch (error: unknown) {
      const message_ = error instanceof Error ? error.message : String(error)
      console.error(`[cognitive-engine] openLoop.detect: ${message_}`)
      return []
    }
  }

  /** Get open loops that are ready to be asked. */
  async getReady(userId: string): Promise<OpenLoop[]> {
    const all = await this.store.find<OpenLoop>(COLLECTION, {
      where: { userId },
    })

    const now = Date.now()
    const ready = all.filter(
      (l) =>
        !l.isClosed &&
        !l.isAsked &&
        (!l.askAfter || l.askAfter.getTime() <= now) &&
        (!l.expiresAt || l.expiresAt.getTime() > now),
    )

    ready.sort((a, b) => b.importance - a.importance)
    return ready.slice(0, this.maxOpenLoops)
  }

  /** Get all active (unclosed) loops for a user. */
  async getActive(userId: string): Promise<OpenLoop[]> {
    const all = await this.store.find<OpenLoop>(COLLECTION, {
      where: { userId },
    })

    const now = Date.now()
    return all.filter(
      (l) =>
        !l.isClosed && (!l.expiresAt || l.expiresAt.getTime() > now),
    )
  }

  /** Mark a loop as asked. */
  async markAsked(loopId: string): Promise<void> {
    const loop = await this.store.get<OpenLoop>(COLLECTION, loopId)
    if (!loop) return

    await this.store.set(COLLECTION, loopId, {
      ...loop,
      isAsked: true,
    })
  }

  /** Close a loop with an answer summary. */
  async close(loopId: string, answerSummary?: string): Promise<void> {
    const loop = await this.store.get<OpenLoop>(COLLECTION, loopId)
    if (!loop) return

    await this.store.set(COLLECTION, loopId, {
      ...loop,
      isClosed: true,
      answerSummary,
    })
  }

  /** Remove expired loops. */
  async cleanup(userId: string): Promise<number> {
    const all = await this.store.find<OpenLoop>(COLLECTION, {
      where: { userId },
    })

    const now = Date.now()
    let removed = 0

    for (const l of all) {
      if (l.expiresAt && l.expiresAt.getTime() <= now) {
        await this.store.delete(COLLECTION, l.id)
        removed++
      }
    }

    return removed
  }

  // ── Private ──

  private async isDuplicate(
    userId: string,
    question: string,
  ): Promise<boolean> {
    const active = await this.getActive(userId)
    const normalized = question.toLowerCase()

    return active.some(
      (l) =>
        l.question.toLowerCase().includes(normalized) ||
        normalized.includes(l.question.toLowerCase()),
    )
  }
}
