import type { Episode } from './memory.js'

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
  createdAt: Date
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
  createdAt: Date
}

export interface TemporalContext {
  recentTimeline: Episode[]
  activePatterns: BehaviorPattern[]
  activeCausalChains: CausalChain[]
  predictions: FuturePrediction[]
  warnings: FuturePrediction[]
}
