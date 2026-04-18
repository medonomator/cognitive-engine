import type {
  LlmProvider,
  EmbeddingProvider,
  Store,
  EngineConfig,
  EngineModules,
  ErrorHandler,
  Percept,
  ReasoningResult,
  EpisodicContext,
  SemanticContext,
  MindContext,
  EmotionalContext,
  SocialContext,
  TemporalContext,
  PlanningContext,
  MetacognitiveAssessment,
  CognitiveResponse,
  CognitiveEventMap,
} from '@cognitive-engine/core'
import { defaultErrorHandler, CognitiveEventEmitter } from '@cognitive-engine/core'
import { PerceptionService } from '@cognitive-engine/perception'
import { Reasoner } from '@cognitive-engine/reasoning'
import { EpisodicMemory, EpisodeExtractor, SemanticMemory, FactExtractor } from '@cognitive-engine/memory'
import { MindService } from '@cognitive-engine/mind'
import { EmotionalModel } from '@cognitive-engine/emotional'
import { SocialModel } from '@cognitive-engine/social'
import { TemporalEngine } from '@cognitive-engine/temporal'
import { ThompsonBandit, MemoryBanditStorage } from '@cognitive-engine/bandit'
import { Planner } from '@cognitive-engine/planning'
import { MetacognitionService } from '@cognitive-engine/metacognition'

const MAX_RECENT_EPISODES_IN_PROMPT = 3
const MAX_KNOWLEDGE_GAPS_IN_PROMPT = 3
const RESPONSE_TEMPERATURE = 0.7
const RESPONSE_MAX_TOKENS = 500

/** Resolve which modules are enabled. All default to true for backward compatibility. */
function resolveModules(modules?: EngineModules): Required<EngineModules> {
  return {
    perception: modules?.perception ?? true,
    reasoning: modules?.reasoning ?? true,
    memory: modules?.memory ?? true,
    temporal: modules?.temporal ?? true,
    bandit: modules?.bandit ?? true,
    mind: modules?.mind ?? true,
    emotional: modules?.emotional ?? true,
    social: modules?.social ?? true,
    planning: modules?.planning ?? true,
    metacognition: modules?.metacognition ?? true,
  }
}

/**
 * CognitiveOrchestrator - the master pipeline.
 *
 * Ties all cognitive modules together into a single `process()` call:
 *
 * 1. Perceive (analyze input)
 * 2. Remember (recall relevant episodes + facts)
 * 3. Reason (generate intentions)
 * 4. Reflect (mind: reflections, relationships, open loops, triggers)
 * 5. Feel (update emotional model)
 * 6. Socialize (update rapport, detect boundaries, learn preferences)
 * 7. Plan (detect goals, track plans)
 * 8. Meta-assess (evaluate own confidence)
 * 9. Generate (build system prompt + suggested response)
 * 10. Learn (store episode, extract facts)
 *
 * Modules can be selectively disabled via `config.modules`.
 * Perception and reasoning always run regardless of config
 * (they are the core pipeline).
 * All other modules default to enabled for backward compatibility.
 */
export class CognitiveOrchestrator {
  readonly perception: PerceptionService
  readonly reasoning: Reasoner
  readonly episodicMemory: EpisodicMemory | null
  readonly episodeExtractor: EpisodeExtractor | null
  readonly semanticMemory: SemanticMemory | null
  readonly factExtractor: FactExtractor | null
  readonly mind: MindService | null
  readonly emotional: EmotionalModel | null
  readonly social: SocialModel | null
  readonly temporal: TemporalEngine | null
  readonly bandit: ThompsonBandit | null
  readonly planner: Planner | null
  readonly metacognition: MetacognitionService | null

  /** Optional event emitter, null when events are not enabled (zero overhead). */
  readonly events: CognitiveEventEmitter | null

  private readonly enabledModules: Required<EngineModules>
  private readonly llm: LlmProvider
  private readonly onError: ErrorHandler

  constructor(config: EngineConfig) {
    this.llm = config.llm
    this.onError = config.onError ?? defaultErrorHandler
    this.events = config.events ?? null
    this.enabledModules = resolveModules(config.modules)

    // Core pipeline (always instantiated)
    this.perception = new PerceptionService(config.llm, {
      ...config.perception,
      onError: config.onError ?? defaultErrorHandler,
    })
    this.reasoning = new Reasoner(config.reasoning)

    // Memory
    if (this.enabledModules.memory) {
      this.episodicMemory = new EpisodicMemory(
        config.store,
        config.embedding,
        config.memory,
      )
      this.episodeExtractor = new EpisodeExtractor(config.llm, config.embedding)
      this.semanticMemory = new SemanticMemory(
        config.store,
        config.embedding,
        config.semanticMemory,
      )
      this.factExtractor = new FactExtractor(config.llm, config.embedding)
    } else {
      this.episodicMemory = null
      this.episodeExtractor = null
      this.semanticMemory = null
      this.factExtractor = null
    }

    // Mind
    this.mind = this.enabledModules.mind
      ? new MindService(config.store, config.llm, config.mind)
      : null

    // Emotional
    this.emotional = this.enabledModules.emotional
      ? new EmotionalModel(config.store, config.emotional)
      : null

    // Social
    this.social = this.enabledModules.social
      ? new SocialModel(config.store, config.llm, config.social)
      : null

    // Temporal
    this.temporal = this.enabledModules.temporal
      ? new TemporalEngine(config.store, config.llm, config.temporal)
      : null

    // Bandit
    this.bandit = this.enabledModules.bandit
      ? new ThompsonBandit(new MemoryBanditStorage(), config.bandit)
      : null

    // Planning
    this.planner = this.enabledModules.planning
      ? new Planner(config.store, config.llm, config.planning)
      : null

    // Metacognition
    this.metacognition = this.enabledModules.metacognition
      ? new MetacognitionService(config.metacognition)
      : null
  }

  /**
   * Run the full cognitive cycle for a user message.
   *
   * Returns a CognitiveResponse containing all context layers
   * and a suggested response + system prompt.
   * Disabled modules return undefined in the response.
   */
  async process(
    userId: string,
    message: string,
  ): Promise<CognitiveResponse> {
    try {
      // Step 1: Perceive
      const perceptionResult = await this.perception.perceive(message)
      const percept = perceptionResult.percept
      this.events?.emit('perception:complete', percept)

      // Step 2: Remember (parallel, non-critical)
      let episodicContext: EpisodicContext | undefined
      let semanticContext: SemanticContext | undefined

      if (this.episodicMemory && this.semanticMemory) {
        const [ecResult, scResult] = await Promise.allSettled([
          this.episodicMemory.getContext(userId, message),
          this.semanticMemory.getContext(userId, message),
        ])
        episodicContext = this.unwrapSettled(ecResult, 'episodicMemory.getContext')
        semanticContext = this.unwrapSettled(scResult, 'semanticMemory.getContext')
      }

      // Step 3: Reason
      const reasoning = this.reasoning.reason(userId, percept)

      // Step 4-7: Reflect, Feel, Socialize, Plan (parallel, non-critical)
      const parallelUpdates: Array<{ promise: Promise<unknown>; context: string }> = []

      if (this.mind) {
        const recentEpisodes = episodicContext?.recentEpisodes ?? []
        parallelUpdates.push({
          promise: this.mind.process(userId, message, percept, recentEpisodes),
          context: 'mind.process',
        })
      }
      if (this.emotional) {
        parallelUpdates.push({
          promise: this.emotional.update(userId, percept),
          context: 'emotional.update',
        })
      }
      if (this.social) {
        parallelUpdates.push({
          promise: this.social.process(userId, message, percept),
          context: 'social.process',
        })
      }
      if (this.planner) {
        parallelUpdates.push({
          promise: this.planner.detectAndCreate(userId, message),
          context: 'planner.detectAndCreate',
        })
      }

      if (parallelUpdates.length > 0) {
        const results = await Promise.allSettled(
          parallelUpdates.map((u) => u.promise),
        )
        for (let i = 0; i < results.length; i++) {
          this.unwrapSettled(results[i]!, parallelUpdates[i]!.context)
        }
      }

      // Gather contexts (parallel, non-critical)
      let mindContext: MindContext | undefined
      let emotionalContext: EmotionalContext | undefined
      let socialContext: SocialContext | undefined
      let planningContext: PlanningContext | undefined

      const contextEntries: Array<{ promise: Promise<unknown>; context: string }> = []

      if (this.mind) {
        contextEntries.push({
          promise: this.mind.getContext(userId).then((ctx) => { mindContext = ctx }),
          context: 'mind.getContext',
        })
      }
      if (this.emotional) {
        contextEntries.push({
          promise: this.emotional.getContext(userId).then((ctx) => { emotionalContext = ctx }),
          context: 'emotional.getContext',
        })
      }
      if (this.social) {
        contextEntries.push({
          promise: this.social.getContext(userId).then((ctx) => { socialContext = ctx }),
          context: 'social.getContext',
        })
      }
      if (this.planner) {
        contextEntries.push({
          promise: this.planner.getContext(userId).then((ctx) => { planningContext = ctx }),
          context: 'planner.getContext',
        })
      }

      if (contextEntries.length > 0) {
        const results = await Promise.allSettled(
          contextEntries.map((e) => e.promise),
        )
        for (let i = 0; i < results.length; i++) {
          this.unwrapSettled(results[i]!, contextEntries[i]!.context)
        }
      }

      // Step 8: Temporal context (non-critical)
      let temporalContext: TemporalContext | undefined

      if (this.temporal) {
        try {
          const recentEpisodes = episodicContext?.recentEpisodes ?? []
          temporalContext = await this.temporal.getContext(userId, recentEpisodes)
        } catch (error: unknown) {
          this.onError(error, 'temporal.getContext')
        }
      }

      // Step 9: Meta-assess
      let metacognition: MetacognitiveAssessment | undefined

      if (this.metacognition) {
        metacognition = this.metacognition.assess({
          percept,
          reasoning,
          episodicContext,
          semanticContext,
          emotionalContext,
          socialContext,
        })
      }

      // Step 10: Build system prompt
      const systemPrompt = this.buildSystemPrompt(
        episodicContext,
        semanticContext,
        mindContext,
        emotionalContext,
        socialContext,
        temporalContext,
        planningContext,
        metacognition,
      )

      // Step 11: Generate suggested response
      const suggestedResponse = await this.generateResponse(
        systemPrompt,
        message,
        percept,
        reasoning,
        metacognition,
      )

      // Step 12: Learn (background, don't block response)
      if (this.episodicMemory && this.semanticMemory) {
        void this.learn(userId, message)
      }

      return {
        percept,
        reasoning,
        episodicContext,
        semanticContext,
        mindContext,
        emotionalContext,
        socialContext,
        temporalContext,
        planningContext,
        metacognition,
        suggestedResponse,
        systemPrompt,
      }
    } catch (error: unknown) {
      this.onError(error, 'orchestrator.process')
      throw error
    }
  }

  /**
   * Run temporal analysis.
   * Call periodically (end of conversation or daily), not per-message.
   */
  async analyzeTemporalPatterns(userId: string): Promise<void> {
    if (!this.temporal || !this.episodicMemory) {
      return
    }

    const episodes = await this.episodicMemory.search({
      userId,
      limit: 50,
      includeDecayed: false,
    })

    await this.temporal.analyze(
      userId,
      episodes.map((r) => r.episode),
    )
  }

  /** Record feedback for bandit learning. */
  async recordFeedback(
    actionId: string,
    context: number[],
    reward: number,
  ): Promise<void> {
    if (!this.bandit) {
      return
    }

    await this.bandit.update(actionId, context, reward)
  }

  /** Subscribe to a cognitive event. No-op if events are not enabled. */
  on<K extends keyof CognitiveEventMap>(
    event: K,
    handler: (data: CognitiveEventMap[K]) => void,
  ): void {
    this.events?.on(event, handler)
  }

  /** Unsubscribe from a cognitive event. No-op if events are not enabled. */
  off<K extends keyof CognitiveEventMap>(
    event: K,
    handler: (data: CognitiveEventMap[K]) => void,
  ): void {
    this.events?.off(event, handler)
  }

  /**
   * Unwrap a settled promise result. Returns the value on success,
   * logs and returns undefined on failure. Non-critical modules
   * should never kill the pipeline.
   */
  private unwrapSettled<T>(
    result: PromiseSettledResult<T>,
    context: string,
  ): T | undefined {
    if (result.status === 'fulfilled') {
      return result.value
    }
    this.onError(result.reason, context)
    return undefined
  }

  private async learn(
    userId: string,
    message: string,
  ): Promise<void> {
    try {
      const [episode, facts] = await Promise.all([
        this.episodeExtractor!.extract(userId, message),
        this.factExtractor!.extract(userId, message),
      ])

      if (episode) {
        await this.episodicMemory!.storeEpisode(episode)
        this.events?.emit('episode:created', episode)
      }

      for (const fact of facts) {
        await this.semanticMemory!.storeFact(fact)
      }
    } catch (error: unknown) {
      this.onError(error, 'orchestrator.learn')
    }
  }

  private buildSystemPrompt(
    episodic?: EpisodicContext,
    semantic?: SemanticContext,
    mind?: MindContext,
    emotional?: EmotionalContext,
    social?: SocialContext,
    temporal?: TemporalContext,
    planning?: PlanningContext,
    meta?: MetacognitiveAssessment,
  ): string {
    const sections: string[] = []

    if (semantic?.formattedContext) {
      sections.push(semantic.formattedContext)
    }

    if (episodic) {
      this.appendEpisodicSection(sections, episodic)
    }
    this.appendFormattedSection(sections, mind?.formattedContext)
    this.appendFormattedSection(sections, emotional?.formattedContext)
    this.appendFormattedSection(sections, social?.formattedContext)
    this.appendFormattedSection(sections, planning?.formattedContext)
    if (temporal) {
      this.appendTemporalSection(sections, temporal)
    }
    if (meta) {
      this.appendMetaSection(sections, meta)
    }

    return sections.join('\n\n')
  }

  private appendEpisodicSection(
    sections: string[],
    episodic: EpisodicContext,
  ): void {
    if (episodic.recentEpisodes.length > 0) {
      const lines = episodic.recentEpisodes
        .slice(0, MAX_RECENT_EPISODES_IN_PROMPT)
        .map((e) => `  - ${e.summary}`)
      sections.push(`Recent memories:\n${lines.join('\n')}`)
    }
  }

  private appendFormattedSection(
    sections: string[],
    formatted: string | undefined,
  ): void {
    if (formatted) {
      sections.push(formatted)
    }
  }

  private appendTemporalSection(
    sections: string[],
    temporal: TemporalContext,
  ): void {
    if (temporal.warnings.length > 0) {
      const lines = temporal.warnings.map(
        (w) => `  - ${w.predictedState} (${w.timeframe})`,
      )
      sections.push(`Warnings:\n${lines.join('\n')}`)
    }
  }

  private appendMetaSection(
    sections: string[],
    meta: MetacognitiveAssessment,
  ): void {
    if (meta.suggestedStrategy !== 'proceed_normally') {
      sections.push(`Strategy: ${meta.suggestedStrategy}`)
    }
    if (meta.knowledgeGaps.length > 0) {
      sections.push(
        `Knowledge gaps: ${meta.knowledgeGaps.slice(0, MAX_KNOWLEDGE_GAPS_IN_PROMPT).join(', ')}`,
      )
    }
  }

  private async generateResponse(
    systemPrompt: string,
    userMessage: string,
    percept: Percept,
    reasoning: ReasoningResult,
    meta?: MetacognitiveAssessment,
  ): Promise<string> {
    const intentionsSummary = reasoning.intentions
      .map((i) => `${i.type}: ${i.target}`)
      .join(', ')

    const confidence = meta
      ? `${(meta.overallConfidence * 100).toFixed(0)}%`
      : 'N/A'

    const prompt = [
      systemPrompt,
      '',
      `Response mode: ${percept.responseMode}`,
      `Intentions: ${intentionsSummary || 'none'}`,
      `Confidence: ${confidence}`,
      meta && meta.suggestedStrategy !== 'proceed_normally'
        ? `Strategy: ${meta.suggestedStrategy}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    const response = await this.llm.complete(
      [
        { role: 'system', content: prompt },
        { role: 'user', content: userMessage },
      ],
      { temperature: RESPONSE_TEMPERATURE, maxTokens: RESPONSE_MAX_TOKENS },
    )

    return response.content
  }
}
