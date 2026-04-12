import type {
  Store,
  LlmProvider,
  Percept,
  Episode,
  MindContext,
  MindConfig,
} from '@cognitive-engine/core'
import { ReflectionService } from './reflection-service.js'
import { RelationshipTracker } from './relationship-tracker.js'
import { OpenLoopDetector } from './open-loop-detector.js'
import { EmotionalTriggerTracker } from './emotional-trigger-tracker.js'
import type { ResolvedMindConfig } from './types.js'

const SENTIMENT_POSITIVE_THRESHOLD = 0.3
const SENTIMENT_NEGATIVE_THRESHOLD = -0.3

const DEFAULT_CONFIG: ResolvedMindConfig = {
  maxReflections: 5,
  maxRelationships: 10,
  maxOpenLoops: 3,
}

/**
 * MindService orchestrates all "living mind" components:
 * reflections, relationships, open loops, emotional triggers.
 *
 * It processes each message through all trackers and provides
 * a unified MindContext for the reasoning layer.
 */
export class MindService {
  readonly reflections: ReflectionService
  readonly relationships: RelationshipTracker
  readonly openLoops: OpenLoopDetector
  readonly emotionalTriggers: EmotionalTriggerTracker

  private readonly config: ResolvedMindConfig

  constructor(
    store: Store,
    llm: LlmProvider,
    config: MindConfig = {},
  ) {
    this.config = {
      maxReflections:
        config.maxReflections ?? DEFAULT_CONFIG.maxReflections,
      maxRelationships:
        config.maxRelationships ?? DEFAULT_CONFIG.maxRelationships,
      maxOpenLoops: config.maxOpenLoops ?? DEFAULT_CONFIG.maxOpenLoops,
    }

    this.reflections = new ReflectionService(
      store,
      llm,
      this.config.maxReflections,
    )
    this.relationships = new RelationshipTracker(
      store,
      llm,
      this.config.maxRelationships,
    )
    this.openLoops = new OpenLoopDetector(
      store,
      llm,
      this.config.maxOpenLoops,
    )
    this.emotionalTriggers = new EmotionalTriggerTracker(store)
  }

  /**
   * Process a message through all mind components.
   * Call this after perception to keep the mind up to date.
   */
  async process(
    userId: string,
    message: string,
    percept: Percept,
    recentEpisodes: Episode[],
  ): Promise<void> {
    await Promise.all([
      this.reflections.generate(userId, percept, recentEpisodes),
      this.relationships.extract(userId, message),
      this.openLoops.detect(userId, message),
      this.emotionalTriggers.track(userId, percept),
    ])
  }

  /** Build full mind context for the reasoning layer. */
  async getContext(userId: string): Promise<MindContext> {
    const [reflections, relationships, openLoops, emotionalTriggers] =
      await Promise.all([
        this.reflections.getActive(userId),
        this.relationships.getAll(userId),
        this.openLoops.getReady(userId),
        this.emotionalTriggers.getStrong(userId),
      ])

    const formattedContext = this.formatContext(
      reflections,
      relationships,
      openLoops,
      emotionalTriggers,
    )

    return {
      reflections,
      relationships,
      openLoops,
      emotionalTriggers,
      formattedContext,
    }
  }

  /** Clean up expired reflections and loops. */
  async cleanup(userId: string): Promise<void> {
    await Promise.all([
      this.reflections.cleanup(userId),
      this.openLoops.cleanup(userId),
    ])
  }

  // ── Private ──

  private formatContext(
    reflections: MindContext['reflections'],
    relationships: MindContext['relationships'],
    openLoops: MindContext['openLoops'],
    triggers: MindContext['emotionalTriggers'],
  ): string {
    const sections: string[] = []

    this.appendReflectionsSection(sections, reflections)
    this.appendRelationshipsSection(sections, relationships)
    this.appendOpenLoopsSection(sections, openLoops)
    this.appendTriggersSection(sections, triggers)

    return sections.join('\n\n')
  }

  private appendReflectionsSection(
    sections: string[],
    reflections: MindContext['reflections'],
  ): void {
    if (reflections.length > 0) {
      const lines = reflections.map(
        (r) => `  - [${r.type}] ${r.content}`,
      )
      sections.push(`Internal reflections:\n${lines.join('\n')}`)
    }
  }

  private appendRelationshipsSection(
    sections: string[],
    relationships: MindContext['relationships'],
  ): void {
    if (relationships.length > 0) {
      const lines = relationships.map((r) => {
        const sentimentLabel =
          r.sentiment > SENTIMENT_POSITIVE_THRESHOLD
            ? 'positive'
            : r.sentiment < SENTIMENT_NEGATIVE_THRESHOLD
              ? 'negative'
              : 'neutral'
        return `  - ${r.personName} (${r.type}, ${sentimentLabel}, mentioned ${r.mentionCount}x)`
      })
      sections.push(`Known people:\n${lines.join('\n')}`)
    }
  }

  private appendOpenLoopsSection(
    sections: string[],
    openLoops: MindContext['openLoops'],
  ): void {
    if (openLoops.length > 0) {
      const lines = openLoops.map((l) => `  - ${l.question}`)
      sections.push(`Follow-up questions:\n${lines.join('\n')}`)
    }
  }

  private appendTriggersSection(
    sections: string[],
    triggers: MindContext['emotionalTriggers'],
  ): void {
    if (triggers.length > 0) {
      const lines = triggers.map(
        (t) =>
          `  - "${t.trigger}" → ${t.emotion} (${t.occurrenceCount}x)`,
      )
      sections.push(`Emotional triggers:\n${lines.join('\n')}`)
    }
  }
}
