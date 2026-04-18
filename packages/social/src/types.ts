/** LLM extraction result for boundary detection. */
export interface BoundaryExtractionResult {
  boundaries: Array<{
    topic: string
    sensitivity: number
    isExplicit: boolean
  }>
}

/** LLM extraction result for preference learning. */
export interface PreferenceExtractionResult {
  preferences: Array<{
    dimension: string
    preferredStyle: string
    confidence: number
  }>
}

/** Resolved configuration for RapportTracker. */
export interface ResolvedRapportConfig {
  initialTrust: number
  trustIncrement: number
}
