export interface Reflection {
  id: string
  userId: string
  type: 'observation' | 'question' | 'insight' | 'concern' | 'celebration'
  content: string
  priority: number
  createdAt: Date
  expiresAt?: Date
}

export interface Relationship {
  id: string
  userId: string
  personName: string
  type: 'family' | 'friend' | 'colleague' | 'romantic' | 'other'
  sentiment: number
  mentionCount: number
  context: string
  lastMentioned: Date
  createdAt: Date
}

export interface OpenLoop {
  id: string
  userId: string
  question: string
  importance: number
  askAfter?: Date
  expiresAt?: Date
  isAsked: boolean
  isClosed: boolean
  answerSummary?: string
  createdAt: Date
}

export interface EmotionalTrigger {
  id: string
  userId: string
  trigger: string
  category: string
  emotion: string
  intensity: number
  occurrenceCount: number
  lastTriggered: Date
  createdAt: Date
}

export interface MindContext {
  reflections: Reflection[]
  relationships: Relationship[]
  openLoops: OpenLoop[]
  emotionalTriggers: EmotionalTrigger[]
  formattedContext: string
}
