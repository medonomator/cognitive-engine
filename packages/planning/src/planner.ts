import type {
  Store,
  LlmProvider,
  Plan,
  PlanStep,
  PlanningContext,
  PlanningConfig,
} from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'
import type { ResolvedPlanningConfig, PlanExtractionResult } from './types.js'

const COLLECTION = 'plans'
const LLM_TEMPERATURE = 0
const LLM_MAX_TOKENS = 500
const DEFAULT_PRIORITY = 0.5

const DEFAULT_CONFIG: ResolvedPlanningConfig = {
  maxActivePlans: 5,
  maxStepsPerPlan: 10,
}

const EXTRACTION_PROMPT = `Analyze the user's message and determine if they expressed a goal that needs a plan.

A goal needs a plan when:
- User wants to achieve something with multiple steps
- User asks for help organizing or structuring something
- User mentions a project, challenge, or ambition

Do NOT create plans for:
- Simple questions
- Casual conversation
- Things that need a single action

Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "hasPlan": true/false,
  "goal": "clear description of the goal",
  "steps": [
    {
      "description": "what to do",
      "dependencies": ["step IDs this depends on"] or omit if none
    }
  ],
  "priority": 0 to 1
}

Rules:
- Steps should be concrete and actionable
- 2-8 steps typical
- Set hasPlan=false if no goal detected
- Higher priority = more urgent`

/**
 * Detects goals and creates action plans from user messages.
 *
 * Plans are decomposed into ordered steps with dependency tracking.
 * The agent can suggest next actions and track progress.
 */
export class Planner {
  private readonly store: Store
  private readonly llm: LlmProvider
  private readonly config: ResolvedPlanningConfig

  constructor(
    store: Store,
    llm: LlmProvider,
    config: PlanningConfig = {},
  ) {
    this.store = store
    this.llm = llm
    this.config = {
      maxActivePlans:
        config.maxActivePlans ?? DEFAULT_CONFIG.maxActivePlans,
      maxStepsPerPlan:
        config.maxStepsPerPlan ?? DEFAULT_CONFIG.maxStepsPerPlan,
    }
  }

  /** Detect and create a plan from a message. Returns null if no goal detected. */
  async detectAndCreate(
    userId: string,
    message: string,
  ): Promise<Plan | null> {
    try {
      const result = await this.extractPlan(message)
      if (!result.hasPlan || !result.goal) return null

      const existing = await this.findSimilar(userId, result.goal)
      if (existing) return existing

      const plan = this.buildPlan(userId, result)

      await this.enforceLimit(userId)
      await this.store.set(COLLECTION, plan.id, plan)
      return plan
    } catch (error: unknown) {
      const message_ = error instanceof Error ? error.message : String(error)
      console.error(`[cognitive-engine] planner.detectAndCreate: ${message_}`)
      return null
    }
  }

  /** Get all active plans for a user. */
  async getActive(userId: string): Promise<Plan[]> {
    const all = await this.store.find<Plan>(COLLECTION, {
      where: { userId },
    })

    return all
      .filter((p) => p.status === 'active')
      .sort((a, b) => b.priority - a.priority)
  }

  /** Get the next actionable steps across all plans. */
  async getNextActions(userId: string): Promise<PlanStep[]> {
    const plans = await this.getActive(userId)
    const actions: PlanStep[] = []

    for (const plan of plans) {
      const completedIds = new Set(
        plan.steps
          .filter((s) => s.status === 'completed')
          .map((s) => s.id),
      )

      for (const step of plan.steps) {
        if (step.status !== 'pending') continue

        // Check dependencies
        const depsComplete =
          !step.dependencies ||
          step.dependencies.every((d) => completedIds.has(d))

        if (depsComplete) {
          actions.push(step)
          break // Only one next action per plan
        }
      }
    }

    return actions
  }

  /** Mark a step as completed. Auto-completes plan if all steps done. */
  async completeStep(planId: string, stepId: string): Promise<void> {
    const plan = await this.store.get<Plan>(COLLECTION, planId)
    if (!plan) return

    const updatedSteps = plan.steps.map((s) =>
      s.id === stepId ? { ...s, status: 'completed' as const } : s,
    )

    const allDone = updatedSteps.every(
      (s) => s.status === 'completed' || s.status === 'skipped',
    )

    await this.store.set(COLLECTION, planId, {
      ...plan,
      steps: updatedSteps,
      status: allDone ? 'completed' : plan.status,
      updatedAt: new Date(),
    })
  }

  /** Abandon a plan. */
  async abandon(planId: string): Promise<void> {
    const plan = await this.store.get<Plan>(COLLECTION, planId)
    if (!plan) return

    await this.store.set(COLLECTION, planId, {
      ...plan,
      status: 'abandoned',
      updatedAt: new Date(),
    })
  }

  /** Build planning context for the reasoning layer. */
  async getContext(userId: string): Promise<PlanningContext> {
    const activePlans = await this.getActive(userId)
    const nextActions = await this.getNextActions(userId)

    const formattedContext = this.formatContext(activePlans, nextActions)

    return { activePlans, nextActions, formattedContext }
  }

  // ── Private ──

  private async extractPlan(message: string): Promise<PlanExtractionResult> {
    const response = await this.llm.completeJson<PlanExtractionResult>(
      [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: message },
      ],
      { temperature: LLM_TEMPERATURE, maxTokens: LLM_MAX_TOKENS },
    )
    return response.parsed
  }

  private buildPlan(userId: string, result: PlanExtractionResult): Plan {
    const now = new Date()
    const steps: PlanStep[] = result.steps
      .slice(0, this.config.maxStepsPerPlan)
      .map((s, i) => ({
        id: uid('step'),
        description: s.description,
        status: 'pending' as const,
        order: i,
        dependencies: s.dependencies,
      }))

    return {
      id: uid('plan'),
      userId,
      goal: result.goal,
      steps,
      status: 'active',
      priority: clamp(result.priority ?? DEFAULT_PRIORITY, 0, 1),
      createdAt: now,
      updatedAt: now,
    }
  }

  private async findSimilar(
    userId: string,
    goal: string,
  ): Promise<Plan | null> {
    const active = await this.getActive(userId)
    const normalized = goal.toLowerCase()

    return (
      active.find(
        (p) =>
          p.goal.toLowerCase().includes(normalized) ||
          normalized.includes(p.goal.toLowerCase()),
      ) ?? null
    )
  }

  private async enforceLimit(userId: string): Promise<void> {
    const active = await this.getActive(userId)

    if (active.length >= this.config.maxActivePlans) {
      // Abandon lowest priority plan
      const lowest = active[active.length - 1]
      if (lowest) {
        await this.abandon(lowest.id)
      }
    }
  }

  private formatContext(
    plans: Plan[],
    nextActions: PlanStep[],
  ): string {
    if (plans.length === 0) return ''

    const sections: string[] = []

    for (const plan of plans) {
      const completed = plan.steps.filter(
        (s) => s.status === 'completed',
      ).length
      const total = plan.steps.length
      sections.push(
        `  - ${plan.goal} (${completed}/${total} steps done)`,
      )
    }

    const lines = [`Active plans:\n${sections.join('\n')}`]

    if (nextActions.length > 0) {
      const actionLines = nextActions.map(
        (a) => `  - ${a.description}`,
      )
      lines.push(`Next actions:\n${actionLines.join('\n')}`)
    }

    return lines.join('\n\n')
  }
}
