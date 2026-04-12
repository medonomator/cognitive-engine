export interface RapportState {
  id: string
  userId: string
  trust: number
  familiarity: number
  comfort: number
  engagement: number
  overallRapport: number
  conversationCount: number
  lastInteraction: Date
  createdAt: Date
  updatedAt: Date
}

export interface SocialBoundary {
  id: string
  userId: string
  topic: string
  sensitivity: number
  isExplicit: boolean
  createdAt: Date
}

export interface CommunicationPreference {
  id: string
  userId: string
  dimension: string
  preferredStyle: string
  confidence: number
  evidence: string[]
  updatedAt: Date
}

export interface SocialContext {
  rapport: RapportState | null
  boundaries: SocialBoundary[]
  preferences: CommunicationPreference[]
  formattedContext: string
}
