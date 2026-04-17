import { describe, it, expect } from 'vitest'
import type {
  Percept,
  ReasoningResult,
  EpisodicContext,
  SemanticContext,
  EmotionalContext,
  SocialContext,
  Fact,
  Episode,
} from '@cognitive-engine/core'
import { MetacognitionService } from './metacognition-service.js'
import { analyzeCoherence } from './coherence-analyzer.js'
import { analyzeCognitiveLoad } from './cognitive-load-analyzer.js'
import { detectContradictions } from './contradiction-detector.js'
import { StrategyTracker } from './strategy-tracker.js'
import type { AssessmentInput } from './types.js'

// ── Factories ──

function makePercept(overrides: Partial<Percept> = {}): Percept {
  return {
    rawText: 'test message',
    emotionalTone: 'neutral',
    urgency: 0.3,
    requestType: 'statement',
    responseMode: 'listening',
    entities: [],
    implicitNeeds: [],
    conversationPhase: 'exploration',
    confidence: 0.8,
    analysisMethod: 'quick',
    ...overrides,
  }
}

function makeReasoning(overrides: Partial<ReasoningResult> = {}): ReasoningResult {
  return {
    intentions: [{ type: 'inform', target: 'test', priority: 5 }],
    newBeliefs: [],
    hypotheses: [],
    questionsToAsk: [],
    suggestedActions: [],
    confidence: 0.8,
    ...overrides,
  }
}

function makeEpisodicContext(overrides: Partial<EpisodicContext> = {}): EpisodicContext {
  return {
    recentEpisodes: [],
    relevantEpisodes: [],
    emotionalPattern: 'neutral',
    ...overrides,
  }
}

function makeSemanticContext(overrides: Partial<SemanticContext> = {}): SemanticContext {
  return {
    relevantFacts: [],
    subjectFacts: new Map(),
    formattedContext: '',
    ...overrides,
  }
}

function makeEmotionalContext(overrides: Partial<EmotionalContext> = {}): EmotionalContext {
  return {
    currentState: null,
    recentTrajectory: [],
    dominantEmotion: 'neutral',
    volatility: 0.1,
    formattedContext: '',
    ...overrides,
  }
}

function makeSocialContext(overrides: Partial<SocialContext> = {}): SocialContext {
  return {
    rapport: null,
    boundaries: [],
    preferences: [],
    formattedContext: '',
    ...overrides,
  }
}

function makeInput(overrides: {
  percept?: Partial<Percept>
  reasoning?: Partial<ReasoningResult>
  episodicContext?: Partial<EpisodicContext>
  semanticContext?: Partial<SemanticContext>
  emotionalContext?: Partial<EmotionalContext>
  socialContext?: Partial<SocialContext>
} = {}): AssessmentInput {
  return {
    percept: makePercept(overrides.percept),
    reasoning: makeReasoning(overrides.reasoning),
    episodicContext: makeEpisodicContext(overrides.episodicContext),
    semanticContext: makeSemanticContext(overrides.semanticContext),
    emotionalContext: makeEmotionalContext(overrides.emotionalContext),
    socialContext: makeSocialContext(overrides.socialContext),
  }
}

function makeFact(overrides: Partial<Fact> = {}): Fact {
  return {
    id: 'f1',
    userId: 'u1',
    subject: 'Alice',
    predicate: 'works_at',
    object: 'Google',
    confidence: 0.9,
    source: 'explicit',
    evidence: [],
    accessCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeEmotionalState(intensity: number, valence: number) {
  return {
    id: 'es1',
    userId: 'u1',
    currentEmotion: 'distressed',
    valence,
    arousal: 0.8,
    dominance: 0.3,
    intensity,
    trend: 'declining' as const,
    history: [],
    updatedAt: new Date(),
  }
}

function makeBoundary(topic: string, sensitivity: number, isExplicit: boolean) {
  return {
    id: 'b1',
    userId: 'u1',
    topic,
    sensitivity,
    isExplicit,
    createdAt: new Date(),
  }
}

// ── Tests ──

describe('MetacognitionService', () => {
  describe('signal flags', () => {
    it('returns proceed_normally for high-confidence input', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput())

      expect(result.suggestedStrategy).toBe('proceed_normally')
      expect(result.overallConfidence).toBeGreaterThan(0.5)
      // topic_shift fires when no memory context (empty defaults)
      expect(result.flags.filter((f) => f.type !== 'topic_shift')).toHaveLength(0)
    })

    it('detects low perception confidence', () => {
      const meta = new MetacognitionService({ lowConfidenceThreshold: 0.5 })
      const result = meta.assess(makeInput({ percept: { confidence: 0.3 } }))

      const flag = result.flags.find(
        (f) => f.type === 'low_confidence' && f.description.includes('Perception'),
      )
      expect(flag).toBeDefined()
      expect(flag!.severity).toBe('medium')
    })

    it('detects low reasoning confidence with high severity', () => {
      const meta = new MetacognitionService({ lowConfidenceThreshold: 0.5 })
      const result = meta.assess(makeInput({ reasoning: { confidence: 0.1 } }))

      const flag = result.flags.find(
        (f) => f.type === 'low_confidence' && f.description.includes('Reasoning'),
      )
      expect(flag).toBeDefined()
      expect(flag!.severity).toBe('high') // 0.1 < 0.2
    })

    it('detects confusion when no intentions generated', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput({ reasoning: { intentions: [] } }))

      expect(result.flags.some((f) => f.type === 'confusion')).toBe(true)
      expect(result.suggestedStrategy).toBe('ask_clarifying_question')
    })

    it('detects topic shift when no memory context', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput())

      expect(result.flags.some((f) => f.type === 'topic_shift')).toBe(true)
    })

    it('detects emotional mismatch', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput({
        emotionalContext: {
          currentState: makeEmotionalState(0.9, -0.5),
          recentTrajectory: [],
          dominantEmotion: 'distressed',
          volatility: 0.3,
          formattedContext: '',
        },
        reasoning: {
          intentions: [{ type: 'inform', target: 'test', priority: 5 }],
        },
      }))

      expect(result.flags.some((f) => f.type === 'emotional_mismatch')).toBe(true)
    })

    it('detects boundary risk with word matching', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput({
        percept: { rawText: 'I was thinking about my divorce' },
        socialContext: {
          rapport: null,
          boundaries: [makeBoundary('divorce', 0.9, true)],
          preferences: [],
          formattedContext: '',
        },
      }))

      expect(result.flags.some((f) => f.type === 'boundary_risk')).toBe(true)
      expect(result.suggestedStrategy).toBe('defer_to_user')
    })

    it('does not check boundaries when disabled', () => {
      const meta = new MetacognitionService({ checkBoundaryRisk: false })
      const result = meta.assess(makeInput({
        percept: { rawText: 'divorce' },
        socialContext: {
          rapport: null,
          boundaries: [makeBoundary('divorce', 0.9, true)],
          preferences: [],
          formattedContext: '',
        },
      }))

      expect(result.flags.some((f) => f.type === 'boundary_risk')).toBe(false)
    })
  })

  describe('coherence analysis', () => {
    it('detects conflicting intentions', () => {
      const flags = analyzeCoherence(makeInput({
        reasoning: {
          intentions: [
            { type: 'empathize', target: 'user', priority: 8 },
            { type: 'challenge', target: 'user', priority: 6 },
          ],
        },
      }))

      expect(flags.some((f) =>
        f.type === 'coherence_conflict' && f.description.includes('empathize'),
      )).toBe(true)
    })

    it('detects emotion/tone mismatch when perception says positive but model is negative', () => {
      const flags = analyzeCoherence(makeInput({
        percept: { emotionalTone: 'positive' },
        emotionalContext: {
          currentState: makeEmotionalState(0.7, -0.5),
          recentTrajectory: [],
          dominantEmotion: 'sad',
          volatility: 0.2,
          formattedContext: '',
        },
      }))

      expect(flags.some((f) =>
        f.type === 'coherence_conflict' && f.description.includes('valence'),
      )).toBe(true)
    })

    it('detects contradictory facts in context', () => {
      const flags = analyzeCoherence(makeInput({
        semanticContext: {
          relevantFacts: [
            makeFact({ subject: 'Alice', predicate: 'works_at', object: 'Google', confidence: 0.9 }),
            makeFact({ id: 'f2', subject: 'Alice', predicate: 'works_at', object: 'Meta', confidence: 0.8 }),
          ],
          subjectFacts: new Map(),
          formattedContext: '',
        },
      }))

      const conflict = flags.find((f) =>
        f.type === 'coherence_conflict' && f.description.includes('Contradictory facts'),
      )
      expect(conflict).toBeDefined()
      expect(conflict!.severity).toBe('high') // both > 0.7
    })

    it('returns empty for coherent input', () => {
      const flags = analyzeCoherence(makeInput())
      expect(flags).toHaveLength(0)
    })
  })

  describe('cognitive load', () => {
    it('reports low load for minimal input', () => {
      const { load, flags } = analyzeCognitiveLoad(
        makeInput(), 0,
        { lowConfidenceThreshold: 0.4, checkBoundaryRisk: true, cognitiveLoadThreshold: 0.8, strategyHistorySize: 5 },
      )

      expect(load).toBeLessThan(0.3)
      expect(flags).toHaveLength(0)
    })

    it('flags cognitive overload when many contexts active', () => {
      const manyIntentions = Array.from({ length: 6 }, (_, i) => ({
        type: 'inform' as const,
        target: `target-${i}`,
        priority: 5,
      }))

      const manyFacts = Array.from({ length: 12 }, (_, i) =>
        makeFact({ id: `f${i}`, subject: `subject-${i}` }),
      )

      const { load, flags } = analyzeCognitiveLoad(
        makeInput({
          reasoning: {
            intentions: manyIntentions,
            hypotheses: ['h1', 'h2', 'h3', 'h4', 'h5'],
          },
          semanticContext: {
            relevantFacts: manyFacts,
            subjectFacts: new Map(),
            formattedContext: '',
          },
          emotionalContext: {
            currentState: makeEmotionalState(0.9, -0.8),
            recentTrajectory: [],
            dominantEmotion: 'angry',
            volatility: 0.8,
            formattedContext: '',
          },
          socialContext: {
            rapport: null,
            boundaries: [
              makeBoundary('topic1', 0.8, true),
              makeBoundary('topic2', 0.7, false),
              makeBoundary('topic3', 0.9, true),
            ],
            preferences: [],
            formattedContext: '',
          },
        }),
        5,
        { lowConfidenceThreshold: 0.4, checkBoundaryRisk: true, cognitiveLoadThreshold: 0.8, strategyHistorySize: 5 },
      )

      expect(load).toBeGreaterThan(0.8)
      expect(flags.some((f) => f.type === 'cognitive_overload')).toBe(true)
    })

    it('includes cognitive load in assessment', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput())

      expect(result.cognitiveLoad).toBeGreaterThanOrEqual(0)
      expect(result.cognitiveLoad).toBeLessThanOrEqual(1)
    })
  })

  describe('contradiction detection', () => {
    it('detects percept contradicting stored facts', () => {
      const contradictions = detectContradictions(makeInput({
        percept: {
          rawText: "Alice doesn't work at Google anymore",
          entities: [{ type: 'person', value: 'Alice', confidence: 0.9 }],
        },
        semanticContext: {
          relevantFacts: [
            makeFact({ subject: 'Alice', predicate: 'works_at', object: 'Google', confidence: 0.9 }),
          ],
          subjectFacts: new Map(),
          formattedContext: '',
        },
      }))

      expect(contradictions.length).toBeGreaterThan(0)
      expect(contradictions[0]!.source).toBe('belief_vs_percept')
    })

    it('detects high volatility contradicting calm tone', () => {
      const contradictions = detectContradictions(makeInput({
        percept: { emotionalTone: 'neutral' },
        emotionalContext: {
          currentState: makeEmotionalState(0.5, 0),
          recentTrajectory: [],
          dominantEmotion: 'mixed',
          volatility: 0.8,
          formattedContext: '',
        },
      }))

      expect(contradictions.some((c) => c.source === 'emotion_vs_tone')).toBe(true)
    })

    it('detects challenge intention targeting sensitive topic', () => {
      const contradictions = detectContradictions(makeInput({
        reasoning: {
          intentions: [
            { type: 'challenge', target: 'your divorce decision', priority: 7 },
          ],
        },
        socialContext: {
          rapport: null,
          boundaries: [makeBoundary('divorce', 0.9, true)],
          preferences: [],
          formattedContext: '',
        },
      }))

      expect(contradictions.some((c) => c.source === 'intention_conflict')).toBe(true)
      expect(contradictions[0]!.severity).toBe('high') // explicit boundary
    })

    it('returns empty for non-contradictory input', () => {
      const contradictions = detectContradictions(makeInput())
      expect(contradictions).toHaveLength(0)
    })

    it('includes contradictions in assessment', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput())
      expect(result.contradictions).toBeDefined()
      expect(Array.isArray(result.contradictions)).toBe(true)
    })
  })

  describe('strategy tracker', () => {
    it('does not flag for varied strategies', () => {
      const tracker = new StrategyTracker(5)
      tracker.record('proceed_normally')
      tracker.record('ask_clarifying_question')
      const flags = tracker.record('proceed_normally')

      expect(flags).toHaveLength(0)
    })

    it('flags repetitive non-normal strategy', () => {
      const tracker = new StrategyTracker(5)
      tracker.record('ask_clarifying_question')
      tracker.record('ask_clarifying_question')
      const flags = tracker.record('ask_clarifying_question')

      expect(flags).toHaveLength(1)
      expect(flags[0]!.type).toBe('repetitive_strategy')
      expect(flags[0]!.severity).toBe('high')
    })

    it('does not flag repeated proceed_normally', () => {
      const tracker = new StrategyTracker(5)
      tracker.record('proceed_normally')
      tracker.record('proceed_normally')
      const flags = tracker.record('proceed_normally')

      expect(flags).toHaveLength(0)
    })

    it('respects max size and forgets old entries', () => {
      const tracker = new StrategyTracker(3)
      tracker.record('ask_clarifying_question')
      tracker.record('ask_clarifying_question')
      tracker.record('proceed_normally') // breaks the streak
      tracker.record('ask_clarifying_question')
      const flags = tracker.record('ask_clarifying_question')

      // Only last 3: [proceed_normally, ask, ask] - not 3 identical
      expect(flags).toHaveLength(0)
    })
  })

  describe('understanding assessment', () => {
    it('scores higher with relevant memories', () => {
      const meta = new MetacognitionService()

      const withoutMemory = meta.assess(makeInput())
      const withMemory = meta.assess(makeInput({
        episodicContext: {
          recentEpisodes: [],
          relevantEpisodes: [{
            id: 'ep1', userId: 'u', summary: 's', details: 'd',
            occurredAt: new Date(), reportedAt: new Date(),
            emotionalValence: 0, emotionalIntensity: 0.5,
            emotions: [], category: 'general', tags: [],
            importance: 0.5, accessCount: 0, decayFactor: 1,
            createdAt: new Date(),
          }],
          emotionalPattern: 'neutral',
        },
        semanticContext: {
          relevantFacts: [makeFact()],
          subjectFacts: new Map(),
          formattedContext: 'some context',
        },
      }))

      expect(withMemory.understanding).toBeGreaterThan(withoutMemory.understanding)
    })
  })

  describe('knowledge gaps', () => {
    it('detects questions from reasoning', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput({
        reasoning: { questionsToAsk: ['What do you mean by X?'] },
      }))

      expect(result.knowledgeGaps).toContain('What do you mean by X?')
    })

    it('detects entities with no matching facts', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput({
        percept: {
          entities: [{ type: 'person', value: 'Alice', confidence: 0.9 }],
        },
      }))

      expect(result.knowledgeGaps.some((g) => g.includes('Alice'))).toBe(true)
    })

    it('ignores low-confidence entities', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput({
        percept: {
          entities: [{ type: 'person', value: 'Maybe', confidence: 0.3 }],
        },
      }))

      expect(result.knowledgeGaps.some((g) => g.includes('Maybe'))).toBe(false)
    })

    it('suggests seek_more_context when too many gaps', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput({
        reasoning: { questionsToAsk: ['Q1', 'Q2', 'Q3'] },
      }))

      expect(result.suggestedStrategy).toBe('seek_more_context')
    })
  })

  describe('strategy selection', () => {
    it('boundary risk overrides everything', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput({
        percept: { rawText: 'my divorce was painful' },
        emotionalContext: {
          currentState: makeEmotionalState(0.95, -0.8),
          recentTrajectory: [],
          dominantEmotion: 'angry',
          volatility: 0.8,
          formattedContext: '',
        },
        socialContext: {
          rapport: null,
          boundaries: [makeBoundary('divorce', 0.9, true)],
          preferences: [],
          formattedContext: '',
        },
        reasoning: {
          intentions: [{ type: 'inform', target: 'x', priority: 5 }],
        },
      }))

      expect(result.suggestedStrategy).toBe('defer_to_user')
    })

    it('high-severity contradiction triggers address_contradiction', () => {
      const meta = new MetacognitionService()
      const result = meta.assess(makeInput({
        percept: { rawText: 'Let me challenge your view on relationships' },
        reasoning: {
          intentions: [{ type: 'challenge', target: 'your divorce decision', priority: 7 }],
        },
        socialContext: {
          rapport: null,
          boundaries: [makeBoundary('divorce', 0.9, true)],
          preferences: [],
          formattedContext: '',
        },
      }))

      // intention_conflict with explicit boundary -> high severity contradiction
      // boundary_risk doesn't fire (rawText doesn't contain "divorce")
      // so address_contradiction wins
      expect(result.suggestedStrategy).toBe('address_contradiction')
      expect(result.contradictions.some((c) => c.source === 'intention_conflict')).toBe(true)
    })
  })

  describe('overall confidence', () => {
    it('penalizes for contradictions', () => {
      const meta = new MetacognitionService()

      const clean = meta.assess(makeInput())
      const withContradiction = meta.assess(makeInput({
        percept: {
          rawText: "Alice doesn't work at Google anymore",
          entities: [{ type: 'person', value: 'Alice', confidence: 0.9 }],
        },
        semanticContext: {
          relevantFacts: [
            makeFact({ subject: 'Alice', predicate: 'works_at', object: 'Google', confidence: 0.9 }),
          ],
          subjectFacts: new Map(),
          formattedContext: '',
        },
      }))

      expect(withContradiction.overallConfidence).toBeLessThan(clean.overallConfidence)
    })

    it('stays within [0, 1] bounds', () => {
      const meta = new MetacognitionService({ lowConfidenceThreshold: 0.99 })
      const result = meta.assess(makeInput({
        percept: { confidence: 0.01 },
        reasoning: { confidence: 0.01, intentions: [] },
      }))

      expect(result.overallConfidence).toBeGreaterThanOrEqual(0)
      expect(result.overallConfidence).toBeLessThanOrEqual(1)
    })
  })
})
