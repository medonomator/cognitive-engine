export interface Episode {
  id: string
  userId: string
  summary: string
  details: string
  participants?: string[]
  location?: string
  occurredAt: Date
  reportedAt: Date
  timeContext?: string
  emotionalValence: number
  emotionalIntensity: number
  emotions: string[]
  category: string
  tags: string[]
  importance: number
  accessCount: number
  lastAccessed?: Date
  decayFactor: number
  relatedEpisodes?: string[]
  embedding?: number[]
  createdAt: Date
}

export interface EpisodeSearchResult {
  episode: Episode
  relevanceScore: number
  recencyScore: number
  importanceScore: number
  combinedScore: number
}

export interface EpisodeQuery {
  userId: string
  query?: string
  categories?: string[]
  emotions?: string[]
  timeRange?: { from?: Date; to?: Date }
  minImportance?: number
  limit?: number
  includeDecayed?: boolean
}

export interface EpisodicContext {
  recentEpisodes: Episode[]
  relevantEpisodes: Episode[]
  emotionalPattern: string
}

export interface ConsolidationResult {
  decayedCount: number
  deletedCount: number
  remainingCount: number
}

export interface Fact {
  id: string
  userId: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: FactSource
  evidence: string[]
  embedding?: number[]
  createdAt: Date
  updatedAt: Date
  accessCount: number
  lastAccessed?: Date
}

export type FactSource = 'explicit' | 'inferred' | 'extracted'

export interface FactSearchResult {
  fact: Fact
  relevanceScore: number
  confidenceScore: number
  combinedScore: number
}

export interface FactQuery {
  userId: string
  query?: string
  subject?: string
  predicate?: string
  minConfidence?: number
  limit?: number
}

export interface SemanticContext {
  relevantFacts: Fact[]
  subjectFacts: Map<string, Fact[]>
  formattedContext: string
}
