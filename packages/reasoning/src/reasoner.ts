import type {
  Percept,
  CognitiveState,
  ReasoningResult,
  ReasoningConfig,
  InferenceRule,
  Belief,
} from '@cognitive-engine/core'
import { WorldModel } from './world-model.js'
import { WorkingMemory } from './working-memory.js'
import { generateIntentions, applyInferenceRules } from './intention-generator.js'

const DEFAULT_MAX_WORKING_MEMORY = 50
const CONFIDENCE_BASE = 0.5
const CONFIDENCE_BELIEF_FACTOR = 0.02
const CONFIDENCE_BELIEF_CAP = 0.2
const CONFIDENCE_CLEAR_INTENTION_BOOST = 0.1
const CONFIDENCE_FEW_INTENTIONS_BOOST = 0.1
const CONFIDENCE_MAX = 0.95
const HIGH_PRIORITY_THRESHOLD = 8
const MAX_CONFLICTING_INTENTIONS = 3
const MIN_BELIEFS_FOR_CONTEXT = 3
const TARGET_PREVIEW_LENGTH = 50

/**
 * BDI Reasoning Engine.
 *
 * Orchestrates the reasoning loop:
 * 1. Update working memory from percept
 * 2. Apply inference rules → new belief candidates
 * 3. Update world model with new beliefs
 * 4. Generate intentions (BDI core)
 * 5. Calculate confidence
 */
export class Reasoner {
  readonly worldModel: WorldModel
  readonly workingMemory: WorkingMemory
  private readonly customRules: InferenceRule[]

  constructor(config: ReasoningConfig = {}) {
    this.worldModel = new WorldModel()
    this.workingMemory = new WorkingMemory(config.maxWorkingMemory ?? DEFAULT_MAX_WORKING_MEMORY)
    this.customRules = config.customRules ?? []
  }

  /**
   * Main reasoning loop: perceive → reason → decide.
   */
  reason(percept: Percept): ReasoningResult {
    this.workingMemory.update(percept)
    const newBeliefs = this.inferBeliefs(percept)
    const state = this.buildCognitiveState(percept)
    const intentions = generateIntentions(percept, state)

    return {
      intentions,
      newBeliefs,
      hypotheses: this.generateHypotheses(percept),
      questionsToAsk: this.generateQuestions(percept, state),
      suggestedActions: [],
      confidence: this.calculateConfidence(intentions, state),
    }
  }

  /** Get current cognitive state snapshot. */
  getState(): CognitiveState {
    return {
      beliefs: this.worldModel.getBeliefs(),
      goals: [],
      workingMemory: this.workingMemory.getItems(),
      currentIntentions: [],
      emotionalContext: '',
      attentionFocus: [],
      lastUpdated: new Date(),
    }
  }

  private inferBeliefs(percept: Percept): Belief[] {
    const beliefs = this.worldModel.getBeliefs()
    const candidates = applyInferenceRules(percept, beliefs, this.customRules)
    return candidates.map((c) => this.worldModel.addBelief(c, 'inferred'))
  }

  private buildCognitiveState(percept: Percept): CognitiveState {
    return {
      beliefs: this.worldModel.getBeliefs(),
      goals: [],
      workingMemory: this.workingMemory.getItems(),
      currentIntentions: [],
      emotionalContext: percept.emotionalTone,
      attentionFocus: percept.entities.map((e) => e.value),
      lastUpdated: new Date(),
    }
  }

  private generateHypotheses(percept: Percept): string[] {
    return percept.implicitNeeds.map((need) => `User might need ${need}`)
  }

  private generateQuestions(
    percept: Percept,
    state: CognitiveState,
  ): string[] {
    const questions: string[] = []

    if (state.beliefs.length < MIN_BELIEFS_FOR_CONTEXT && percept.requestType !== 'greeting') {
      questions.push('What specific outcome are you looking for?')
    }

    return questions
  }

  private calculateConfidence(
    intentions: Array<{ priority: number }>,
    state: CognitiveState,
  ): number {
    let confidence = CONFIDENCE_BASE

    confidence += Math.min(CONFIDENCE_BELIEF_CAP, state.beliefs.length * CONFIDENCE_BELIEF_FACTOR)

    if (intentions.length > 0 && intentions[0]!.priority >= HIGH_PRIORITY_THRESHOLD) {
      confidence += CONFIDENCE_CLEAR_INTENTION_BOOST
    }

    if (intentions.length <= MAX_CONFLICTING_INTENTIONS) {
      confidence += CONFIDENCE_FEW_INTENTIONS_BOOST
    }

    return Math.min(CONFIDENCE_MAX, confidence)
  }
}
