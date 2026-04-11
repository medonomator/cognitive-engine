// ═══════════════════════════════════════════
// Perception Types
// ═══════════════════════════════════════════

export interface Percept {
  rawText: string
  emotionalTone: string
  urgency: number
  requestType: string
  responseMode: ResponseMode
  entities: Entity[]
  implicitNeeds: string[]
  conversationPhase: ConversationPhase
  confidence: number
  analysisMethod: 'quick' | 'deep'
}

export type ResponseMode = 'listening' | 'advising' | 'informing'

export type ConversationPhase =
  | 'opening'
  | 'exploration'
  | 'deep_dive'
  | 'conclusion'
  | 'follow_up'

export interface Entity {
  type: string
  value: string
  confidence: number
}

// ═══════════════════════════════════════════
// Reasoning Types
// ═══════════════════════════════════════════

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

// ═══════════════════════════════════════════
// Memory Types
// ═══════════════════════════════════════════

export interface Episode {
  id: string
  userId: string
  summary: string
  details: string
  participants?: string[]
  location?: string
  occurredAt: Date
  reportedAt: Date
  timeContext?: string
  emotionalValence: number
  emotionalIntensity: number
  emotions: string[]
  category: string
  tags: string[]
  importance: number
  accessCount: number
  lastAccessed?: Date
  decayFactor: number
  relatedEpisodes?: string[]
  embedding?: number[]
  createdAt: Date
}

export interface EpisodeSearchResult {
  episode: Episode
  relevanceScore: number
  recencyScore: number
  importanceScore: number
  combinedScore: number
}

export interface EpisodeQuery {
  userId: string
  query?: string
  categories?: string[]
  emotions?: string[]
  timeRange?: { from?: Date; to?: Date }
  minImportance?: number
  limit?: number
  includeDecayed?: boolean
}

export interface EpisodicContext {
  recentEpisodes: Episode[]
  relevantEpisodes: Episode[]
  emotionalPattern: string
}

export interface ConsolidationResult {
  decayedCount: number
  deletedCount: number
  remainingCount: number
}

// ═══════════════════════════════════════════
// Temporal Types
// ═══════════════════════════════════════════

export interface BehaviorPattern {
  id: string
  userId: string
  patternType: string
  description: string
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'irregular'
  occurrences: number
  confidence: number
  nextExpected?: Date
  createdAt: Date
}

export interface CausalChain {
  id: string
  userId: string
  events: string[]
  rootCause: string
  finalEffect: string
  chainType: string
  confidence: number
  description: string
}

export interface FuturePrediction {
  id: string
  userId: string
  predictedState: string
  timeframe: string
  predictionType: string
  severity: 'low' | 'medium' | 'high'
  isWarning: boolean
  recommendation?: string
  confidence: number
  isResolved: boolean
  wasCorrect?: boolean
}

export interface TemporalContext {
  recentTimeline: Episode[]
  activePatterns: BehaviorPattern[]
  activeCausalChains: CausalChain[]
  predictions: FuturePrediction[]
  warnings: FuturePrediction[]
}

// ═══════════════════════════════════════════
// Bandit Types
// ═══════════════════════════════════════════

export interface BanditChoice {
  actionId: string
  expectedReward: number
  wasExploration: boolean
}

export interface BanditParams {
  actionId: string
  mu: number[]
  sigma: number[]
  updatedAt: Date
}

// ═══════════════════════════════════════════
// Mind Types
// ═══════════════════════════════════════════

export interface Reflection {
  id: string
  type: 'observation' | 'question' | 'insight' | 'concern' | 'celebration'
  content: string
  priority: number
  expiresAt?: Date
}

export interface Relationship {
  personName: string
  type: 'family' | 'friend' | 'colleague' | 'romantic' | 'other'
  sentiment: number
  mentionCount: number
  context: string
}

export interface OpenLoop {
  id: string
  question: string
  importance: number
  askAfter?: Date
  expiresAt?: Date
  isAsked: boolean
  isClosed: boolean
  answerSummary?: string
}

export interface EmotionalTrigger {
  trigger: string
  category: string
  emotion: string
  intensity: number
  occurrenceCount: number
}

export interface MindContext {
  reflections: Reflection[]
  relationships: Relationship[]
  openLoops: OpenLoop[]
  emotionalTriggers: EmotionalTrigger[]
  formattedContext: string
}

// ═══════════════════════════════════════════
// Inference Rule (extensible)
// ═══════════════════════════════════════════

export interface InferenceRule {
  name: string
  condition: (percept: Percept, beliefs: Belief[]) => boolean
  action: (percept: Percept) => BeliefCandidate
}
