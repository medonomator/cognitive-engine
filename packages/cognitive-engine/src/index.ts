// Core types & interfaces
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

//Math utilitiesexport {
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

//Storeexport { MemoryStore } from '@cognitive-engine/store-memory'

//OpenAI Providerexport { OpenAiLlmProvider, OpenAiEmbeddingProvider } from '@cognitive-engine/provider-openai'
export type { OpenAiLlmConfig, OpenAiEmbeddingConfig } from '@cognitive-engine/provider-openai'

//Perceptionexport { PerceptionService, quickAnalyze, deepAnalyze, extractBeliefCandidates } from '@cognitive-engine/perception'
export type { PerceptionResult, QuickAnalysisResult, QuickPatterns, DeepAnalysisResult } from '@cognitive-engine/perception'

//Banditexport { ThompsonBandit, MemoryBanditStorage } from '@cognitive-engine/bandit'
export type { BanditStorage } from '@cognitive-engine/bandit'

//Memoryexport { EpisodicMemory, EpisodeExtractor, SemanticMemory, FactExtractor } from '@cognitive-engine/memory'

//Mindexport { MindService, ReflectionService, RelationshipTracker, OpenLoopDetector, EmotionalTriggerTracker } from '@cognitive-engine/mind'

//Emotionalexport { EmotionalModel } from '@cognitive-engine/emotional'

//Socialexport { SocialModel, RapportTracker, BoundaryDetector, PreferenceLearner } from '@cognitive-engine/social'

//Temporalexport { TemporalEngine, PatternDetector, CausalChainBuilder, Predictor } from '@cognitive-engine/temporal'

//Planningexport { Planner } from '@cognitive-engine/planning'

//Metacognitionexport { MetacognitionService } from '@cognitive-engine/metacognition'

//Reasoningexport { Reasoner, WorldModel, WorkingMemory, generateIntentions, applyInferenceRules } from '@cognitive-engine/reasoning'

//Orchestratorexport { CognitiveOrchestrator } from '@cognitive-engine/orchestrator'
