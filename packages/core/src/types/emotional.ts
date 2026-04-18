export interface EmotionalState {
  id: string
  userId: string
  currentEmotion: string
  valence: number
  arousal: number
  dominance: number
  intensity: number
  trend: 'improving' | 'stable' | 'declining'
  history: EmotionSnapshot[]
  updatedAt: Date
}

export interface EmotionSnapshot {
  emotion: string
  valence: number
  arousal: number
  intensity: number
  timestamp: Date
}

export interface EmotionalContext {
  currentState: EmotionalState | null
  recentTrajectory: EmotionSnapshot[]
  dominantEmotion: string
  volatility: number
  formattedContext: string
}
