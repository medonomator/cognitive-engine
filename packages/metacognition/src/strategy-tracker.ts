import type {
  MetacognitiveStrategy,
  MetacognitiveFlag,
} from '@cognitive-engine/core'

/**
 * Tracks recent strategy selections to detect repetitive patterns.
 *
 * If the agent keeps choosing the same strategy (e.g. "ask_clarifying_question"
 * 5 times in a row), something is wrong - it's stuck in a loop.
 * This tracker detects that and flags it.
 */

const REPETITION_THRESHOLD = 3

export class StrategyTracker {
  private readonly history: MetacognitiveStrategy[] = []
  private readonly maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  /** Record a strategy and check for repetition. */
  record(strategy: MetacognitiveStrategy): MetacognitiveFlag[] {
    this.history.push(strategy)

    if (this.history.length > this.maxSize) {
      this.history.shift()
    }

    return this.detectRepetition()
  }

  /** Get the full history (for testing/debugging). */
  getHistory(): readonly MetacognitiveStrategy[] {
    return this.history
  }

  private detectRepetition(): MetacognitiveFlag[] {
    if (this.history.length < REPETITION_THRESHOLD) return []

    const recent = this.history.slice(-REPETITION_THRESHOLD)
    const allSame = recent.every((s) => s === recent[0])

    if (allSame && recent[0] !== 'proceed_normally') {
      return [
        {
          type: 'repetitive_strategy',
          description: `Strategy "${recent[0]!}" selected ${REPETITION_THRESHOLD}+ times consecutively — agent may be stuck`,
          severity: 'high',
        },
      ]
    }

    return []
  }
}
