import type {
  Store,
  LlmProvider,
  Episode,
  TemporalContext,
  TemporalConfig,
} from '@cognitive-engine/core'
import { PatternDetector } from './pattern-detector.js'
import { CausalChainBuilder } from './causal-chain-builder.js'
import { Predictor } from './predictor.js'
import type { ResolvedTemporalConfig } from './types.js'

const DEFAULT_CONFIG: ResolvedTemporalConfig = {
  lookbackDays: 30,
  minPatternConfidence: 0.5,
}

/**
 * TemporalEngine orchestrates all temporal reasoning:
 * pattern detection, causal chain building, and prediction.
 *
 * Call `analyze()` periodically (not per-message) with accumulated episodes.
 */
export class TemporalEngine {
  readonly patterns: PatternDetector
  readonly causalChains: CausalChainBuilder
  readonly predictor: Predictor

  private readonly config: ResolvedTemporalConfig

  constructor(
    store: Store,
    llm: LlmProvider,
    config: TemporalConfig = {},
  ) {
    this.config = {
      lookbackDays: config.lookbackDays ?? DEFAULT_CONFIG.lookbackDays,
      minPatternConfidence:
        config.minPatternConfidence ?? DEFAULT_CONFIG.minPatternConfidence,
    }

    this.patterns = new PatternDetector(
      store,
      llm,
      this.config.lookbackDays,
      this.config.minPatternConfidence,
    )
    this.causalChains = new CausalChainBuilder(store, llm)
    this.predictor = new Predictor(store, llm)
  }

  /**
   * Run full temporal analysis on a set of episodes.
   * Best called periodically (e.g. end of conversation or daily batch)
   * rather than per-message.
   */
  async analyze(
    userId: string,
    episodes: Episode[],
  ): Promise<void> {
    // Step 1: Detect patterns
    const detectedPatterns = await this.patterns.detect(userId, episodes)

    // Step 2: Build causal chains
    const chains = await this.causalChains.build(userId, episodes)

    // Step 3: Generate predictions from patterns + chains + episodes
    const allPatterns = await this.patterns.getActive(userId)
    const allChains = await this.causalChains.getAll(userId)

    await this.predictor.predict(userId, allPatterns, allChains, episodes)
  }

  /** Build temporal context for the reasoning layer. */
  async getContext(
    userId: string,
    recentEpisodes: Episode[],
  ): Promise<TemporalContext> {
    const [activePatterns, activeCausalChains, activePredictions] =
      await Promise.all([
        this.patterns.getActive(userId),
        this.causalChains.getAll(userId),
        this.predictor.getActive(userId),
      ])

    const warnings = activePredictions.filter((p) => p.isWarning)
    const predictions = activePredictions.filter((p) => !p.isWarning)

    return {
      recentTimeline: recentEpisodes,
      activePatterns,
      activeCausalChains,
      predictions,
      warnings,
    }
  }
}
