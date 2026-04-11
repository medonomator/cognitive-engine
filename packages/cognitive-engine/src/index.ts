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
  // Memory
  Episode,
  EpisodeSearchResult,
  EpisodeQuery,
  EpisodicContext,
  ConsolidationResult,
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
  // Config
  PerceptionConfig,
  ReasoningConfig,
  MemoryConfig,
  TemporalConfig,
  BanditConfig,
  MindConfig,
  EngineModules,
  EngineConfig,
  // Events
  CognitiveEventMap,
} from '@cognitive-engine/core'

export {
  supportsVectorSearch,
  CognitiveEventEmitter,
  Pipeline,
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
export { EpisodicMemory, EpisodeExtractor } from '@cognitive-engine/memory'

// ── Reasoning ──
export { Reasoner, WorldModel, WorkingMemory, generateIntentions, applyInferenceRules } from '@cognitive-engine/reasoning'
