import type { Percept } from './perception.js'

export interface Belief {
  id: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: BeliefSource
  evidence: string[]
  createdAt: Date
  updatedAt: Date
}

export type BeliefSource = 'explicit' | 'inferred' | 'observed'

export interface BeliefCandidate {
  subject: string
  predicate: string
  object: string
  confidence: number
}

export type IntentionType =
  | 'inform'
  | 'clarify'
  | 'suggest'
  | 'empathize'
  | 'challenge'
  | 'remind'
  | 'motivate'

export interface Intention {
  type: IntentionType
  target: string
  priority: number
  reason?: string
}

export interface CognitiveState {
  beliefs: Belief[]
  goals: UserGoal[]
  workingMemory: WorkingMemoryItem[]
  currentIntentions: Intention[]
  emotionalContext: string
  attentionFocus: string[]
  lastUpdated: Date
}

export interface UserGoal {
  id: string
  description: string
  priority: number
  progress: number
  deadline?: Date
  relatedBeliefs: string[]
}

export interface WorkingMemoryItem {
  content: string
  type: 'fact' | 'context' | 'question' | 'hypothesis'
  relevance: number
  timestamp: Date
}

export interface ReasoningResult {
  intentions: Intention[]
  newBeliefs: Belief[]
  hypotheses: string[]
  questionsToAsk: string[]
  suggestedActions: string[]
  confidence: number
}

export interface InferenceRule {
  name: string
  condition: (percept: Percept, beliefs: Belief[]) => boolean
  action: (percept: Percept) => BeliefCandidate
}
