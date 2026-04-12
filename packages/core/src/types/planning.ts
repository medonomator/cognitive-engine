export interface Plan {
  id: string
  userId: string
  goal: string
  steps: PlanStep[]
  status: 'active' | 'completed' | 'abandoned'
  priority: number
  createdAt: Date
  updatedAt: Date
}

export interface PlanStep {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  order: number
  dependencies?: string[]
}

export interface PlanningContext {
  activePlans: Plan[]
  nextActions: PlanStep[]
  formattedContext: string
}
