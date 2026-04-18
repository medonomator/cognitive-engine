/** Resolved configuration for Planner. */
export interface ResolvedPlanningConfig {
  maxActivePlans: number
  maxStepsPerPlan: number
}

/** LLM extraction result for plan detection. */
export interface PlanExtractionResult {
  hasPlan: boolean
  goal: string
  steps: Array<{
    description: string
    dependencies?: string[]
  }>
  priority: number
}
