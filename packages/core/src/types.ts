/**
 * All core type definitions, organized by domain.
 *
 * Each domain has its own file under ./types/ for maintainability.
 * This barrel re-exports everything for backwards compatibility.
 */
export type {
  // Perception
  Percept,
  ResponseMode,
  ConversationPhase,
  Entity,
  // Reasoning
  Belief,
  BeliefSource,
  BeliefCandidate,
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
  // Emotional
  EmotionalState,
  EmotionSnapshot,
  EmotionalContext,
  // Social
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
} from './types/index.js'
