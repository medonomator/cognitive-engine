import type {
  Store,
  LlmProvider,
  Percept,
  SocialContext,
  SocialModelConfig,
} from '@cognitive-engine/core'
import { RapportTracker } from './rapport-tracker.js'
import { BoundaryDetector } from './boundary-detector.js'
import { PreferenceLearner } from './preference-learner.js'

/**
 * SocialModel orchestrates all social intelligence components:
 * rapport tracking, boundary detection, communication preference learning.
 *
 * Provides unified SocialContext for the reasoning layer.
 */
export class SocialModel {
  readonly rapport: RapportTracker
  readonly boundaries: BoundaryDetector
  readonly preferences: PreferenceLearner

  constructor(
    store: Store,
    llm: LlmProvider,
    config: SocialModelConfig = {},
  ) {
    this.rapport = new RapportTracker(store, config)
    this.boundaries = new BoundaryDetector(
      store,
      llm,
      config.maxBoundaries ?? 20,
    )
    this.preferences = new PreferenceLearner(
      store,
      llm,
      config.maxPreferences ?? 10,
    )
  }

  /**
   * Process a message through all social components.
   * Call after perception.
   */
  async process(
    userId: string,
    message: string,
    percept: Percept,
  ): Promise<void> {
    await Promise.all([
      this.rapport.update(userId, percept, message.length),
      this.boundaries.detect(userId, message),
      this.preferences.learn(userId, message),
    ])
  }

  /** Build social context for the reasoning layer. */
  async getContext(userId: string): Promise<SocialContext> {
    const [rapport, boundaries, preferences] = await Promise.all([
      this.rapport.getState(userId),
      this.boundaries.getAll(userId),
      this.preferences.getAll(userId),
    ])

    const formattedContext = this.formatContext(
      rapport,
      boundaries,
      preferences,
    )

    return {
      rapport,
      boundaries,
      preferences,
      formattedContext,
    }
  }

  // ── Private ──

  private formatContext(
    rapport: SocialContext['rapport'],
    boundaries: SocialContext['boundaries'],
    preferences: SocialContext['preferences'],
  ): string {
    const sections: string[] = []

    if (rapport) {
      sections.push(
        `Rapport: trust=${rapport.trust.toFixed(2)}, familiarity=${rapport.familiarity.toFixed(2)}, comfort=${rapport.comfort.toFixed(2)}, engagement=${rapport.engagement.toFixed(2)} (${rapport.conversationCount} conversations)`,
      )
    }

    if (boundaries.length > 0) {
      const lines = boundaries.map(
        (b) =>
          `  - ${b.topic}: sensitivity=${b.sensitivity.toFixed(2)}${b.isExplicit ? ' (explicit)' : ''}`,
      )
      sections.push(`Boundaries:\n${lines.join('\n')}`)
    }

    if (preferences.length > 0) {
      const lines = preferences.map(
        (p) =>
          `  - ${p.dimension}: ${p.preferredStyle} (${Math.round(p.confidence * 100)}%)`,
      )
      sections.push(`Communication style:\n${lines.join('\n')}`)
    }

    return sections.join('\n\n')
  }
}
