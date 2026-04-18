// Providers
export type {
  LlmProvider,
  LlmMessage,
  LlmOptions,
  LlmUsage,
  LlmResponse,
  EmbeddingProvider,
} from './providers.js'

// Store
export type {
  Store,
  StoreFilter,
  VectorSearchOptions,
  VectorSearchResult,
} from './store.js'
export { supportsVectorSearch } from './store.js'

// Types
export type {
  Percept,
  ResponseMode,
  ConversationPhase,
  Entity,
  Belief,
  BeliefSource,
  BeliefCandidate,
  IntentionType,
  Intention,
  CognitiveState,
  UserGoal,
  WorkingMemoryItem,
  ReasoningResult,
  Episode,
  EpisodeSearchResult,
  EpisodeQuery,
  EpisodicContext,
  ConsolidationResult,
  Fact,
  FactSource,
  FactSearchResult,
  FactQuery,
  SemanticContext,
  BehaviorPattern,
  CausalChain,
  FuturePrediction,
  TemporalContext,
  BanditChoice,
  BanditParams,
  Reflection,
  Relationship,
  OpenLoop,
  EmotionalTrigger,
  MindContext,
  EmotionalState,
  EmotionSnapshot,
  EmotionalContext,
  RapportState,
  SocialBoundary,
  CommunicationPreference,
  SocialContext,
  Plan,
  PlanStep,
  PlanningContext,
  MetacognitiveAssessment,
  MetacognitiveContradiction,
  MetacognitiveStrategy,
  MetacognitiveFlagType,
  MetacognitiveFlag,
  CognitiveResponse,
  InferenceRule,
} from './types.js'

// Config
export { defaultErrorHandler } from './config.js'
export type {
  ErrorHandler,
  UrgencyPattern,
  QuickPatterns,
  RelevanceWeights,
  MemoryScoringWeights,
  SemanticScoringWeights,
  PerceptionConfig,
  ReasoningConfig,
  MemoryConfig,
  SemanticMemoryConfig,
  TemporalConfig,
  BanditConfig,
  MindConfig,
  EmotionalModelConfig,
  SocialModelConfig,
  PlanningConfig,
  MetacognitionConfig,
  EngineModules,
  EngineConfig,
} from './config.js'

// Events
export type {
  CognitiveEventMap,
  BeliefUpdateEvent,
  PredictionResolvedEvent,
  BanditChoiceEvent,
  BanditRewardEvent,
} from './events.js'
export { CognitiveEventEmitter } from './events.js'

// Utilities
export { uid } from './uid.js'
