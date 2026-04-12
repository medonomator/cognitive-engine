import type {
  MetacognitiveAssessment,
  MetacognitiveContradiction,
  MetacognitiveStrategy,
  MetacognitiveFlag,
  MetacognitionConfig,
} from '@cognitive-engine/core'
import {
  ENTITY_CONFIDENCE_THRESHOLD,
  HIGH_BOUNDARY_SENSITIVITY,
  type AssessmentInput,
  type ResolvedMetacognitionConfig,
} from './types.js'
import { analyzeCoherence } from './coherence-analyzer.js'
import { analyzeCognitiveLoad } from './cognitive-load-analyzer.js'
import { detectContradictions } from './contradiction-detector.js'
import { StrategyTracker } from './strategy-tracker.js'

// ── Thresholds ──

const LOW_CONFIDENCE_SEVERITY_BOUNDARY = 0.2
const HIGH_EMOTIONAL_INTENSITY = 0.7

const UNDERSTANDING_BASE = 0.5
const UNDERSTANDING_PERCEPTION_WEIGHT = 0.2
const UNDERSTANDING_MEMORY_BONUS = 0.1
const UNDERSTANDING_INTENTION_BONUS = 0.1

const QUALITY_BASE = 0.5
const QUALITY_MULTI_INTENTION_BONUS = 0.15
const QUALITY_RICH_INTENTION_BONUS = 0.1
const QUALITY_REASONING_WEIGHT = 0.15
const QUALITY_RAPPORT_BONUS = 0.05
const QUALITY_PREFERENCE_BONUS = 0.05

const CONFIDENCE_UNDERSTANDING_WEIGHT = 0.35
const CONFIDENCE_QUALITY_WEIGHT = 0.25
const CONFIDENCE_PERCEPTION_WEIGHT = 0.15
const CONFIDENCE_REASONING_WEIGHT = 0.15
const CONFIDENCE_CONTRADICTION_WEIGHT = 0.10
const HIGH_FLAG_PENALTY = 0.15
const MEDIUM_FLAG_PENALTY = 0.05

const KNOWLEDGE_GAP_OVERFLOW = 2
const LOW_CONFIDENCE_THRESHOLD = 0.3
const MODERATE_CONFIDENCE_THRESHOLD = 0.5

const MULTI_INTENTION_MIN = 2
const RICH_INTENTION_MIN = 3

const DEFAULT_CONFIG: ResolvedMetacognitionConfig = {
  lowConfidenceThreshold: 0.4,
  checkBoundaryRisk: true,
  cognitiveLoadThreshold: 0.8,
  strategyHistorySize: 5,
}

/**
 * Metacognition — "thinking about thinking".
 *
 * Evaluates the cognitive cycle quality through five lenses:
 * 1. **Signal flags** — low confidence, confusion, topic shift, emotional mismatch, boundary risk
 * 2. **Coherence** — intention conflicts, emotion/tone mismatch, fact contradictions
 * 3. **Cognitive load** — how many context layers are active simultaneously
 * 4. **Contradictions** — cross-layer conflicts (percept vs facts, intention vs boundary)
 * 5. **Strategy tracking** — detects repetitive strategy selection (agent stuck in loop)
 *
 * No LLM needed — works from signals already computed by other modules.
 */
export class MetacognitionService {
  private readonly config: ResolvedMetacognitionConfig
  private readonly strategyTracker: StrategyTracker

  constructor(config: MetacognitionConfig = {}) {
    this.config = {
      lowConfidenceThreshold:
        config.lowConfidenceThreshold ?? DEFAULT_CONFIG.lowConfidenceThreshold,
      checkBoundaryRisk:
        config.checkBoundaryRisk ?? DEFAULT_CONFIG.checkBoundaryRisk,
      cognitiveLoadThreshold:
        config.cognitiveLoadThreshold ?? DEFAULT_CONFIG.cognitiveLoadThreshold,
      strategyHistorySize:
        config.strategyHistorySize ?? DEFAULT_CONFIG.strategyHistorySize,
    }

    this.strategyTracker = new StrategyTracker(this.config.strategyHistorySize)
  }

  /** Assess the quality of the current cognitive cycle. */
  assess(input: AssessmentInput): MetacognitiveAssessment {
    const { flags, knowledgeGaps, cognitiveLoad, contradictions } =
      this.collectFlags(input)

    return this.buildAssessment(input, flags, knowledgeGaps, cognitiveLoad, contradictions)
  }

  // ── Core Helpers ──

  private collectFlags(input: AssessmentInput): {
    flags: MetacognitiveFlag[]
    knowledgeGaps: string[]
    cognitiveLoad: number
    contradictions: MetacognitiveContradiction[]
  } {
    const signalFlags = this.detectSignalFlags(input)
    const coherenceFlags = analyzeCoherence(input)
    const knowledgeGaps = this.detectKnowledgeGaps(input)
    const { load: cognitiveLoad, flags: loadFlags } =
      analyzeCognitiveLoad(input, knowledgeGaps.length, this.config)
    const contradictions = detectContradictions(input)

    const flags = [...signalFlags, ...coherenceFlags, ...loadFlags]

    return { flags, knowledgeGaps, cognitiveLoad, contradictions }
  }

  private buildAssessment(
    input: AssessmentInput,
    flags: MetacognitiveFlag[],
    knowledgeGaps: string[],
    cognitiveLoad: number,
    contradictions: MetacognitiveContradiction[],
  ): MetacognitiveAssessment {
    const understanding = this.assessUnderstanding(input)
    const responseQuality = this.assessResponseQuality(input)
    const overallConfidence = this.computeConfidence(
      input, understanding, responseQuality, flags, contradictions,
    )

    const suggestedStrategy = this.selectStrategy(
      overallConfidence, flags, knowledgeGaps, contradictions,
    )

    // Track strategy for repetition detection
    const repetitionFlags = this.strategyTracker.record(suggestedStrategy)
    flags.push(...repetitionFlags)

    return {
      overallConfidence,
      understanding,
      responseQuality,
      cognitiveLoad,
      knowledgeGaps,
      contradictions,
      suggestedStrategy,
      flags,
    }
  }

  // ── Signal Flags ──

  private detectSignalFlags(input: AssessmentInput): MetacognitiveFlag[] {
    const flags: MetacognitiveFlag[] = []

    this.checkConfidence(input, flags)
    this.checkConfusion(input, flags)
    this.checkTopicShift(input, flags)
    this.checkEmotionalMismatch(input, flags)
    this.checkBoundaryRisk(input, flags)

    return flags
  }

  private checkConfidence(
    input: AssessmentInput,
    flags: MetacognitiveFlag[],
  ): void {
    const threshold = this.config.lowConfidenceThreshold

    if (input.percept.confidence < threshold) {
      flags.push({
        type: 'low_confidence',
        description: `Perception confidence is low (${formatPercent(input.percept.confidence)})`,
        severity: input.percept.confidence < LOW_CONFIDENCE_SEVERITY_BOUNDARY ? 'high' : 'medium',
      })
    }

    if (input.reasoning.confidence < threshold) {
      flags.push({
        type: 'low_confidence',
        description: `Reasoning confidence is low (${formatPercent(input.reasoning.confidence)})`,
        severity: input.reasoning.confidence < LOW_CONFIDENCE_SEVERITY_BOUNDARY ? 'high' : 'medium',
      })
    }
  }

  private checkConfusion(
    input: AssessmentInput,
    flags: MetacognitiveFlag[],
  ): void {
    if (input.reasoning.intentions.length === 0) {
      flags.push({
        type: 'confusion',
        description: 'No clear intentions generated — unclear how to respond',
        severity: 'medium',
      })
    }
  }

  private checkTopicShift(
    input: AssessmentInput,
    flags: MetacognitiveFlag[],
  ): void {
    const noEpisodes = (input.episodicContext?.relevantEpisodes.length ?? 0) === 0
    const noFacts = (input.semanticContext?.relevantFacts.length ?? 0) === 0

    if (noEpisodes && noFacts) {
      flags.push({
        type: 'topic_shift',
        description: 'No relevant memory context — possibly new topic',
        severity: 'low',
      })
    }
  }

  private checkEmotionalMismatch(
    input: AssessmentInput,
    flags: MetacognitiveFlag[],
  ): void {
    const state = input.emotionalContext?.currentState
    if (!state) return

    const hasEmpathize = input.reasoning.intentions.some(
      (i) => i.type === 'empathize',
    )

    if (state.intensity > HIGH_EMOTIONAL_INTENSITY && !hasEmpathize) {
      flags.push({
        type: 'emotional_mismatch',
        description: 'High emotional intensity detected but no empathy intention',
        severity: 'high',
      })
    }
  }

  private checkBoundaryRisk(
    input: AssessmentInput,
    flags: MetacognitiveFlag[],
  ): void {
    if (!this.config.checkBoundaryRisk) return
    if (!input.socialContext) return

    const sensitive = input.socialContext.boundaries.filter(
      (b) => b.sensitivity > HIGH_BOUNDARY_SENSITIVITY,
    )

    const rawLower = input.percept.rawText.toLowerCase()

    for (const boundary of sensitive) {
      const topicWords = boundary.topic.toLowerCase().split(/\s+/)
      const matches = topicWords.some((word) => rawLower.includes(word))

      if (matches) {
        flags.push({
          type: 'boundary_risk',
          description: `Message touches sensitive topic: "${boundary.topic}"`,
          severity: boundary.isExplicit ? 'high' : 'medium',
        })
      }
    }
  }

  // ── Scoring ──

  private assessUnderstanding(input: AssessmentInput): number {
    let score = UNDERSTANDING_BASE
    score += input.percept.confidence * UNDERSTANDING_PERCEPTION_WEIGHT
    if ((input.episodicContext?.relevantEpisodes.length ?? 0) > 0) score += UNDERSTANDING_MEMORY_BONUS
    if ((input.semanticContext?.relevantFacts.length ?? 0) > 0) score += UNDERSTANDING_MEMORY_BONUS
    if (input.reasoning.intentions.length > 0) score += UNDERSTANDING_INTENTION_BONUS
    return clamp01(score)
  }

  private assessResponseQuality(input: AssessmentInput): number {
    let score = QUALITY_BASE
    const intentionCount = input.reasoning.intentions.length
    if (intentionCount >= MULTI_INTENTION_MIN) score += QUALITY_MULTI_INTENTION_BONUS
    if (intentionCount >= RICH_INTENTION_MIN) score += QUALITY_RICH_INTENTION_BONUS
    score += input.reasoning.confidence * QUALITY_REASONING_WEIGHT
    if (input.socialContext?.rapport) score += QUALITY_RAPPORT_BONUS
    if ((input.socialContext?.preferences.length ?? 0) > 0) score += QUALITY_PREFERENCE_BONUS
    return clamp01(score)
  }

  private detectKnowledgeGaps(input: AssessmentInput): string[] {
    const gaps: string[] = []

    for (const q of input.reasoning.questionsToAsk) {
      gaps.push(q)
    }

    for (const entity of input.percept.entities) {
      if (entity.confidence <= ENTITY_CONFIDENCE_THRESHOLD) continue

      const entityLower = entity.value.toLowerCase()
      const hasInfo = (input.semanticContext?.relevantFacts ?? []).some(
        (f) =>
          f.subject.toLowerCase().includes(entityLower) ||
          f.object.toLowerCase().includes(entityLower),
      )

      if (!hasInfo) {
        gaps.push(`No information about "${entity.value}"`)
      }
    }

    return gaps
  }

  private computeConfidence(
    input: AssessmentInput,
    understanding: number,
    responseQuality: number,
    flags: MetacognitiveFlag[],
    contradictions: MetacognitiveContradiction[],
  ): number {
    let confidence =
      understanding * CONFIDENCE_UNDERSTANDING_WEIGHT +
      responseQuality * CONFIDENCE_QUALITY_WEIGHT +
      input.percept.confidence * CONFIDENCE_PERCEPTION_WEIGHT +
      input.reasoning.confidence * CONFIDENCE_REASONING_WEIGHT

    // Contradictions reduce confidence proportionally
    const contradictionPenalty =
      Math.min(contradictions.length, 3) * CONFIDENCE_CONTRADICTION_WEIGHT
    confidence -= contradictionPenalty

    // Flags reduce confidence by severity
    const highCount = flags.filter((f) => f.severity === 'high').length
    const mediumCount = flags.filter((f) => f.severity === 'medium').length
    confidence -= highCount * HIGH_FLAG_PENALTY
    confidence -= mediumCount * MEDIUM_FLAG_PENALTY

    return clamp01(confidence)
  }

  // ── Strategy Selection ──

  private selectStrategy(
    confidence: number,
    flags: MetacognitiveFlag[],
    gaps: string[],
    contradictions: MetacognitiveContradiction[],
  ): MetacognitiveStrategy {
    const flagTypes = new Set(flags.map((f) => f.type))
    const hasHighFlags = flags.some((f) => f.severity === 'high')

    // Priority order (most critical first):
    if (flagTypes.has('boundary_risk')) return 'defer_to_user'

    if (contradictions.some((c) => c.severity === 'high')) {
      return 'address_contradiction'
    }

    if (flagTypes.has('emotional_mismatch')) return 'acknowledge_uncertainty'
    if (flagTypes.has('confusion')) return 'ask_clarifying_question'
    if (gaps.length > KNOWLEDGE_GAP_OVERFLOW) return 'seek_more_context'
    if (confidence < LOW_CONFIDENCE_THRESHOLD) return 'acknowledge_uncertainty'

    if (confidence < MODERATE_CONFIDENCE_THRESHOLD && hasHighFlags) {
      return 'offer_alternatives'
    }

    if (confidence < MODERATE_CONFIDENCE_THRESHOLD) {
      return 'ask_clarifying_question'
    }

    return 'proceed_normally'
  }
}

// ── Helpers ──

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}
