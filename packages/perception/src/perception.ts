import type {
  LlmProvider,
  Percept,
  BeliefCandidate,
  PerceptionConfig,
} from '@cognitive-engine/core'
import { quickAnalyze } from './quick-analyze.js'
import { deepAnalyze } from './deep-analyze.js'
import { extractBeliefCandidates } from './belief-extraction.js'

export interface PerceptionResult {
  percept: Percept
  beliefCandidates: BeliefCandidate[]
}

export class PerceptionService {
  private readonly llm: LlmProvider
  private readonly config: PerceptionConfig
  private readonly simpleThreshold: number

  constructor(llm: LlmProvider, config: PerceptionConfig = {}) {
    this.llm = llm
    this.config = config
    this.simpleThreshold = config.simpleMessageThreshold ?? 50
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
      const percept: Percept = {
        rawText: text,
        ...quick,
        implicitNeeds: [],
        confidence: 0.6,
        analysisMethod: 'quick',
      }
      return {
        percept,
        beliefCandidates: extractBeliefCandidates(percept),
      }
    }

    try {
      const deep = await deepAnalyze(
        text,
        conversationHistory,
        this.llm,
        this.config.deepAnalysisPrompt,
      )

      // Merge quick entities (regex) + deep entities (LLM)
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
    } catch {
      // Fallback to quick analysis on LLM failure
      const percept: Percept = {
        rawText: text,
        ...quick,
        implicitNeeds: [],
        confidence: 0.4,
        analysisMethod: 'quick',
      }
      return {
        percept,
        beliefCandidates: extractBeliefCandidates(percept),
      }
    }
  }
}

function deduplicateEntities(
  entities: Array<{ type: string; value: string; confidence: number }>,
): Array<{ type: string; value: string; confidence: number }> {
  const seen = new Set<string>()
  const result: Array<{ type: string; value: string; confidence: number }> = []

  for (const entity of entities) {
    const key = `${entity.type}:${entity.value}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(entity)
    }
  }

  return result
}
