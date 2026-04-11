import type {
  Percept,
  CognitiveState,
  ReasoningResult,
  ReasoningConfig,
  InferenceRule,
} from '@cognitive-engine/core'
import { WorldModel } from './world-model.js'
import { WorkingMemory } from './working-memory.js'
import { generateIntentions, applyInferenceRules } from './intention-generator.js'

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
    this.workingMemory = new WorkingMemory(config.maxWorkingMemory ?? 50)
    this.customRules = config.customRules ?? []
  }

  /**
   * Main reasoning loop: perceive → reason → decide.
   */
  reason(percept: Percept): ReasoningResult {
    // 1. Update working memory
    this.workingMemory.update(percept)

    // 2. Apply inference rules
    const beliefs = this.worldModel.getBeliefs()
    const candidates = applyInferenceRules(
      percept,
      beliefs,
      this.customRules,
    )

    // 3. Update world model with inferred beliefs
    const newBeliefs = candidates.map((c) =>
      this.worldModel.addBelief(c, 'inferred'),
    )

    // 4. Build cognitive state
    const state: CognitiveState = {
      beliefs: this.worldModel.getBeliefs(),
      goals: [],
      workingMemory: this.workingMemory.getItems(),
      currentIntentions: [],
      emotionalContext: percept.emotionalTone,
      attentionFocus: percept.entities.map((e) => e.value),
      lastUpdated: new Date(),
    }

    // 5. Generate intentions
    const intentions = generateIntentions(percept, state)

    // 6. Generate hypotheses and questions
    const hypotheses = this.generateHypotheses(percept)
    const questionsToAsk = this.generateQuestions(percept, state)

    // 7. Calculate confidence
    const confidence = this.calculateConfidence(intentions, state)

    return {
      intentions,
      newBeliefs,
      hypotheses,
      questionsToAsk,
      suggestedActions: [],
      confidence,
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

  private generateHypotheses(percept: Percept): string[] {
    const hypotheses: string[] = []
    for (const need of percept.implicitNeeds) {
      hypotheses.push(`User might need ${need}`)
    }
    return hypotheses
  }

  private generateQuestions(
    percept: Percept,
    state: CognitiveState,
  ): string[] {
    const questions: string[] = []

    // If few beliefs, suggest asking for more context
    if (state.beliefs.length < 3 && percept.requestType !== 'greeting') {
      questions.push('What specific outcome are you looking for?')
    }

    return questions
  }

  private calculateConfidence(
    intentions: Array<{ priority: number }>,
    state: CognitiveState,
  ): number {
    let confidence = 0.5

    // More beliefs = more confident
    confidence += Math.min(0.2, state.beliefs.length * 0.02)

    // Clear primary intention = more confident
    if (intentions.length > 0 && intentions[0]!.priority >= 8) {
      confidence += 0.1
    }

    // Few conflicting intentions = more confident
    if (intentions.length <= 3) {
      confidence += 0.1
    }

    return Math.min(0.95, confidence)
  }
}
