// ── Core types & interfaces ──
export type {
  // Providers
  LlmProvider,
  LlmMessage,
  LlmOptions,
  LlmUsage,
  LlmResponse,
  EmbeddingProvider,
  // Store
  Store,
  StoreFilter,
  VectorSearchOptions,
  VectorSearchResult,
  // Perception
  Percept,
  ResponseMode,
  ConversationPhase,
  Entity,
  // Beliefs
  Belief,
  BeliefSource,
  BeliefCandidate,
  // Intentions & Reasoning
  IntentionType,
  Intention,
  CognitiveState,
  UserGoal,
  WorkingMemoryItem,
  ReasoningResult,
  InferenceRule,
  // Memory (Episodic)
  Episode,
  EpisodeSearchResult,
  EpisodeQuery,
  EpisodicContext,
  ConsolidationResult,
  // Memory (Semantic)
  Fact,
  FactSource,
  FactSearchResult,
  FactQuery,
  SemanticContext,
  // Temporal
  BehaviorPattern,
  CausalChain,
  FuturePrediction,
  TemporalContext,
  // Bandit
  BanditChoice,
  BanditParams,
  // Mind
  Reflection,
  Relationship,
  OpenLoop,
  EmotionalTrigger,
  MindContext,
  // Emotional Model
  EmotionalState,
  EmotionSnapshot,
  EmotionalContext,
  // Social Model
  RapportState,
  SocialBoundary,
  CommunicationPreference,
  SocialContext,
  // Planning
  Plan,
  PlanStep,
  PlanningContext,
  // Metacognition
  MetacognitiveAssessment,
  MetacognitiveContradiction,
  MetacognitiveStrategy,
  MetacognitiveFlagType,
  MetacognitiveFlag,
  // Orchestrator
  CognitiveResponse,
  // Config
  ErrorHandler,
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
  // Events
  CognitiveEventMap,
  BeliefUpdateEvent,
  PredictionResolvedEvent,
  BanditChoiceEvent,
  BanditRewardEvent,
} from '@cognitive-engine/core'

export {
  defaultErrorHandler,
  supportsVectorSearch,
  CognitiveEventEmitter,
  uid,
} from '@cognitive-engine/core'

// ── Math utilities ──
export {
  l2Normalize,
  cosineSimilarity,
  dotProduct,
  meanVector,
  weightedMeanVector,
  euclideanDistance,
  addVectors,
  scaleVector,
  matVec,
  outer,
  subMat,
  cholesky,
  sampleStdNormal,
  sampleMVN,
  sampleDiagonalMVN,
  exponentialDecay,
  timeDecayWeights,
  oneHot,
  binValue,
  clamp,
} from '@cognitive-engine/math'

// ── Store ──
export { MemoryStore } from '@cognitive-engine/store-memory'

// ── OpenAI Provider ──
export { OpenAiLlmProvider, OpenAiEmbeddingProvider } from '@cognitive-engine/provider-openai'
export type { OpenAiLlmConfig, OpenAiEmbeddingConfig } from '@cognitive-engine/provider-openai'

// ── Perception ──
export { PerceptionService, quickAnalyze, deepAnalyze, extractBeliefCandidates } from '@cognitive-engine/perception'
export type { PerceptionResult, QuickAnalysisResult, QuickPatterns, DeepAnalysisResult } from '@cognitive-engine/perception'

// ── Bandit ──
export { ThompsonBandit, MemoryBanditStorage } from '@cognitive-engine/bandit'
export type { BanditStorage } from '@cognitive-engine/bandit'

// ── Memory ──
export { EpisodicMemory, EpisodeExtractor, SemanticMemory, FactExtractor } from '@cognitive-engine/memory'

// ── Mind ──
export { MindService, ReflectionService, RelationshipTracker, OpenLoopDetector, EmotionalTriggerTracker } from '@cognitive-engine/mind'

// ── Emotional ──
export { EmotionalModel } from '@cognitive-engine/emotional'

// ── Social ──
export { SocialModel, RapportTracker, BoundaryDetector, PreferenceLearner } from '@cognitive-engine/social'

// ── Temporal ──
export { TemporalEngine, PatternDetector, CausalChainBuilder, Predictor } from '@cognitive-engine/temporal'

// ── Planning ──
export { Planner } from '@cognitive-engine/planning'

// ── Metacognition ──
export { MetacognitionService } from '@cognitive-engine/metacognition'

// ── Reasoning ──
export { Reasoner, WorldModel, WorkingMemory, generateIntentions, applyInferenceRules } from '@cognitive-engine/reasoning'

// ── Orchestrator ──
export { CognitiveOrchestrator } from '@cognitive-engine/orchestrator'
