// ═══════════════════════════════════════════
// Configuration types for all modules
// ═══════════════════════════════════════════

export interface PerceptionConfig {
  /** Custom quick-analysis regex patterns (language-specific) */
  quickPatterns?: {
    emotions?: Record<string, RegExp[]>
    urgency?: Array<{ pattern: RegExp; score: number }>
    requestTypes?: Record<string, RegExp[]>
    responseMode?: Record<string, RegExp[]>
  }
  /** Messages shorter than this skip LLM analysis. Default: 50 */
  simpleMessageThreshold?: number
  /** Custom LLM prompt for deep analysis */
  deepAnalysisPrompt?: string
}

export interface ReasoningConfig {
  /** Maximum items in working memory. Default: 10 */
  maxWorkingMemory?: number
  /** Custom inference rules (run after built-in rules) */
  customRules?: import('./types.js').InferenceRule[]
  /** Weights for relevance scoring */
  relevanceWeights?: {
    current?: number
    recent?: number
    past?: number
  }
}

export interface MemoryConfig {
  /** Decay coefficient per hour. Default: 0.03 */
  decayLambda?: number
  /** Scoring weights (must sum to 1). Default: 0.4/0.3/0.3 */
  scoringWeights?: {
    relevance?: number
    recency?: number
    importance?: number
  }
  /** Minimum similarity for search results. Default: 0.7 */
  similarityThreshold?: number
  /** Episode categories */
  categories?: string[]
  /** Max recent episodes to return. Default: 5 */
  maxRecentEpisodes?: number
  /** Max relevant episodes from search. Default: 3 */
  maxRelevantEpisodes?: number
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

export interface EngineModules {
  perception?: boolean
  reasoning?: boolean
  memory?: boolean
  temporal?: boolean
  bandit?: boolean
  mind?: boolean
}

export interface EngineConfig {
  llm: import('./providers.js').LlmProvider
  embedding: import('./providers.js').EmbeddingProvider
  store: import('./store.js').Store

  perception?: PerceptionConfig
  reasoning?: ReasoningConfig
  memory?: MemoryConfig
  temporal?: TemporalConfig
  bandit?: BanditConfig
  mind?: MindConfig

  /** Enable/disable modules. Default: perception, reasoning, memory = true */
  modules?: EngineModules
}
