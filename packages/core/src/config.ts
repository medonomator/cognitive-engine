// ═══════════════════════════════════════════
// Error handling
// ═══════════════════════════════════════════

/** Callback for non-fatal errors that shouldn't break the response. */
export type ErrorHandler = (error: unknown, context: string) => void

/** Default handler: writes to stderr so errors are never silently lost. */
export const defaultErrorHandler: ErrorHandler = (error, context) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[cognitive-engine] ${context}: ${message}`)
}

// ═══════════════════════════════════════════
// Extracted named types
// ═══════════════════════════════════════════

/** Single urgency pattern with its associated score. */
export interface UrgencyPattern {
  pattern: RegExp
  score: number
}

/** Weights for relevance scoring across time horizons. */
export interface RelevanceWeights {
  current?: number
  recent?: number
  past?: number
}

/** Scoring weights for episodic memory retrieval. */
export interface MemoryScoringWeights {
  relevance?: number
  recency?: number
  importance?: number
}

/** Scoring weights for semantic (fact-based) memory retrieval. */
export interface SemanticScoringWeights {
  relevance?: number
  confidence?: number
}

/** Custom quick-analysis regex patterns (language-specific). */
export interface QuickPatterns {
  emotions?: Record<string, RegExp[]>
  urgency?: UrgencyPattern[]
  requestTypes?: Record<string, RegExp[]>
  responseMode?: Record<string, RegExp[]>
}

// ═══════════════════════════════════════════
// Configuration types for all modules
// ═══════════════════════════════════════════

export interface PerceptionConfig {
  /** Custom quick-analysis regex patterns (language-specific) */
  quickPatterns?: QuickPatterns
  /** Messages shorter than this skip LLM analysis. Default: 50 */
  simpleMessageThreshold?: number
  /** Custom LLM prompt for deep analysis */
  deepAnalysisPrompt?: string
  /** Called when deep analysis fails and falls back to quick. */
  onError?: ErrorHandler
}

export interface ReasoningConfig {
  /** Maximum items in working memory. Default: 10 */
  maxWorkingMemory?: number
  /** Custom inference rules (run after built-in rules) */
  customRules?: import('./types.js').InferenceRule[]
  /** Weights for relevance scoring */
  relevanceWeights?: RelevanceWeights
}

export interface MemoryConfig {
  /** Decay coefficient per hour. Default: 0.03 */
  decayLambda?: number
  /** Scoring weights (must sum to 1). Default: 0.4/0.3/0.3 */
  scoringWeights?: MemoryScoringWeights
  /** Minimum similarity for search results. Default: 0.7 */
  similarityThreshold?: number
  /** Episode categories */
  categories?: string[]
  /** Max recent episodes to return. Default: 5 */
  maxRecentEpisodes?: number
  /** Max relevant episodes from search. Default: 3 */
  maxRelevantEpisodes?: number
}

export interface SemanticMemoryConfig {
  /** Minimum similarity for semantic search results. Default: 0.6 */
  similarityThreshold?: number
  /** Minimum confidence to keep a fact. Default: 0.3 */
  minConfidence?: number
  /** Confidence boost when the same fact is reinforced. Default: 0.1 */
  reinforcementBoost?: number
  /** Max confidence (cap). Default: 0.99 */
  maxConfidence?: number
  /** Max facts to return from search. Default: 10 */
  maxResults?: number
  /** Scoring weights for search (must sum to 1). Default: 0.6/0.4 */
  scoringWeights?: SemanticScoringWeights
}

export interface TemporalConfig {
  /** How far back to look for patterns (days). Default: 30 */
  lookbackDays?: number
  /** Minimum confidence to keep a pattern. Default: 0.5 */
  minPatternConfidence?: number
  /** Pattern types to detect */
  patternTypes?: string[]
  /** Prediction types to generate */
  predictionTypes?: string[]
}

export interface EmotionalModelConfig {
  /** Max snapshots to keep in history. Default: 20 */
  maxHistory?: number
  /** Smoothing factor for emotion updates (0-1). Default: 0.3 */
  smoothingFactor?: number
  /** Threshold for volatility warning. Default: 0.5 */
  volatilityThreshold?: number
}

export interface SocialModelConfig {
  /** Initial trust level for new users. Default: 0.3 */
  initialTrust?: number
  /** Trust increment per positive interaction. Default: 0.05 */
  trustIncrement?: number
  /** Max boundaries to track. Default: 20 */
  maxBoundaries?: number
  /** Max communication preferences to track. Default: 10 */
  maxPreferences?: number
}

export interface BanditConfig {
  /** Exploration rate (epsilon). Default: 0.1 */
  explorationRate?: number
  /** Observation noise variance. Default: 1.0 */
  noiseVariance?: number
  /** Initial variance for new actions. Default: 1000 */
  initialVariance?: number
}

export interface MindConfig {
  /** Max reflections to include in context. Default: 5 */
  maxReflections?: number
  /** Max relationships to include. Default: 10 */
  maxRelationships?: number
  /** Max open loops to include. Default: 3 */
  maxOpenLoops?: number
}

export interface PlanningConfig {
  /** Max active plans per user. Default: 5 */
  maxActivePlans?: number
  /** Max steps per plan. Default: 10 */
  maxStepsPerPlan?: number
}

export interface MetacognitionConfig {
  /** Confidence threshold below which to flag. Default: 0.4 */
  lowConfidenceThreshold?: number
  /** Enable boundary risk checking. Default: true */
  checkBoundaryRisk?: boolean
  /** Cognitive load threshold (0-1) above which to flag overload. Default: 0.8 */
  cognitiveLoadThreshold?: number
  /** Number of recent strategies to track for repetition detection. Default: 5 */
  strategyHistorySize?: number
}

export interface EngineModules {
  perception?: boolean
  reasoning?: boolean
  memory?: boolean
  temporal?: boolean
  bandit?: boolean
  mind?: boolean
  emotional?: boolean
  social?: boolean
  planning?: boolean
  metacognition?: boolean
}

export interface EngineConfig {
  llm: import('./providers.js').LlmProvider
  embedding: import('./providers.js').EmbeddingProvider
  store: import('./store.js').Store

  perception?: PerceptionConfig
  reasoning?: ReasoningConfig
  memory?: MemoryConfig
  semanticMemory?: SemanticMemoryConfig
  temporal?: TemporalConfig
  bandit?: BanditConfig
  mind?: MindConfig
  emotional?: EmotionalModelConfig
  social?: SocialModelConfig
  planning?: PlanningConfig
  metacognition?: MetacognitionConfig

  /**
   * Enable/disable modules. Default: ALL modules enabled (backward compatible).
   * Perception and reasoning always run regardless of this setting.
   * Set individual modules to false to skip them (e.g., `{ temporal: false, bandit: false }`).
   */
  modules?: EngineModules

  /** Called on non-fatal errors (learning failures, deep analysis fallbacks). */
  onError?: ErrorHandler

  /** Optional event emitter for subscribing to cognitive events. */
  events?: import('./events.js').CognitiveEventEmitter
}
