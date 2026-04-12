import type {
  LlmProvider,
  Percept,
  BeliefCandidate,
  PerceptionConfig,
  ErrorHandler,
  Entity,
} from '@cognitive-engine/core'
import { defaultErrorHandler } from '@cognitive-engine/core'
import { quickAnalyze } from './quick-analyze.js'
import { deepAnalyze } from './deep-analyze.js'
import { extractBeliefCandidates } from './belief-extraction.js'

const DEFAULT_SIMPLE_MESSAGE_THRESHOLD = 50
const QUICK_ANALYSIS_CONFIDENCE = 0.6
const FALLBACK_ANALYSIS_CONFIDENCE = 0.4

export interface PerceptionResult {
  percept: Percept
  beliefCandidates: BeliefCandidate[]
}

export class PerceptionService {
  private readonly llm: LlmProvider
  private readonly config: PerceptionConfig
  private readonly simpleThreshold: number
  private readonly onError: ErrorHandler

  constructor(llm: LlmProvider, config: PerceptionConfig = {}) {
    this.llm = llm
    this.config = config
    this.simpleThreshold = config.simpleMessageThreshold ?? DEFAULT_SIMPLE_MESSAGE_THRESHOLD
    this.onError = config.onError ?? defaultErrorHandler
  }

  /**
   * Analyze a message with dual-mode processing:
   * - Short/simple messages → fast regex analysis only
   * - Complex messages → regex + LLM deep analysis
   */
  async perceive(
    text: string,
    conversationHistory: string[] = [],
  ): Promise<PerceptionResult> {
    const quick = quickAnalyze(
      text,
      conversationHistory.length,
      this.config.quickPatterns,
    )

    const isSimple =
      text.length < this.simpleThreshold ||
      quick.requestType === 'greeting'

    if (isSimple) {
      return this.buildQuickResult(text, quick)
    }

    try {
      return await this.buildDeepResult(text, conversationHistory, quick)
    } catch (error: unknown) {
      this.onError(error, 'perception.deepAnalysis')
      return this.buildFallbackResult(text, quick)
    }
  }

  private buildQuickResult(
    text: string,
    quick: ReturnType<typeof quickAnalyze>,
  ): PerceptionResult {
    const percept: Percept = {
      rawText: text,
      ...quick,
      implicitNeeds: [],
      confidence: QUICK_ANALYSIS_CONFIDENCE,
      analysisMethod: 'quick',
    }
    return {
      percept,
      beliefCandidates: extractBeliefCandidates(percept),
    }
  }

  private async buildDeepResult(
    text: string,
    conversationHistory: string[],
    quick: ReturnType<typeof quickAnalyze>,
  ): Promise<PerceptionResult> {
    const deep = await deepAnalyze(
      text,
      conversationHistory,
      this.llm,
      this.config.deepAnalysisPrompt,
    )

    const mergedEntities = deduplicateEntities([
      ...quick.entities,
      ...deep.entities,
    ])

    const percept: Percept = {
      rawText: text,
      emotionalTone: deep.emotionalTone,
      urgency: deep.urgency,
      requestType: deep.requestType,
      responseMode: quick.responseMode,
      entities: mergedEntities,
      implicitNeeds: deep.implicitNeeds,
      conversationPhase: quick.conversationPhase,
      confidence: deep.confidence,
      analysisMethod: 'deep',
    }

    return {
      percept,
      beliefCandidates: extractBeliefCandidates(percept),
    }
  }

  private buildFallbackResult(
    text: string,
    quick: ReturnType<typeof quickAnalyze>,
  ): PerceptionResult {
    const percept: Percept = {
      rawText: text,
      ...quick,
      implicitNeeds: [],
      confidence: FALLBACK_ANALYSIS_CONFIDENCE,
      analysisMethod: 'quick',
    }
    return {
      percept,
      beliefCandidates: extractBeliefCandidates(percept),
    }
  }
}

function deduplicateEntities(
  entities: Entity[],
): Entity[] {
  const seen = new Set<string>()
  const result: Entity[] = []

  for (const entity of entities) {
    const key = `${entity.type}:${entity.value}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(entity)
    }
  }

  return result
}
