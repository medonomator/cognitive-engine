import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryStore } from '@cognitive-engine/store-memory'
import type { LlmProvider } from '@cognitive-engine/core'
import { Planner } from './planner.js'

function createMockLlm(response: unknown): LlmProvider {
  return {
    complete: vi.fn().mockResolvedValue({
      content: JSON.stringify(response),
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      finishReason: 'stop' as const,
    }),
    completeJson: vi.fn().mockResolvedValue({
      content: JSON.stringify(response),
      parsed: response,
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      finishReason: 'stop' as const,
    }),
  }
}

const noopLlm: LlmProvider = createMockLlm({ hasPlan: false, goal: '', steps: [], priority: 0 })

describe('Planner', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = new MemoryStore()
  })

  describe('detectAndCreate', () => {
    it('creates a plan when LLM detects a goal', async () => {
      const llm = createMockLlm({
        hasPlan: true,
        goal: 'Learn TypeScript',
        steps: [
          { description: 'Read the handbook' },
          { description: 'Build a project' },
          { description: 'Write tests' },
        ],
        priority: 0.7,
      })

      const planner = new Planner(store, llm)
      const plan = await planner.detectAndCreate('user1', 'I want to learn TypeScript')

      expect(plan).not.toBeNull()
      expect(plan!.goal).toBe('Learn TypeScript')
      expect(plan!.steps).toHaveLength(3)
      expect(plan!.status).toBe('active')
      expect(plan!.priority).toBe(0.7)
      expect(plan!.userId).toBe('user1')
      expect(plan!.steps[0]!.status).toBe('pending')
      expect(plan!.steps[0]!.order).toBe(0)
      expect(plan!.steps[2]!.order).toBe(2)
    })

    it('returns null when no goal detected', async () => {
      const llm = createMockLlm({
        hasPlan: false,
        goal: '',
        steps: [],
        priority: 0,
      })

      const planner = new Planner(store, llm)
      const plan = await planner.detectAndCreate('user1', 'Hello, how are you?')

      expect(plan).toBeNull()
    })

    it('deduplicates similar goals', async () => {
      const llm = createMockLlm({
        hasPlan: true,
        goal: 'Learn TypeScript',
        steps: [{ description: 'Read docs' }],
        priority: 0.5,
      })

      const planner = new Planner(store, llm)

      const plan1 = await planner.detectAndCreate('user1', 'Learn TypeScript')
      const plan2 = await planner.detectAndCreate('user1', 'I want to learn TypeScript deeply')

      expect(plan1).not.toBeNull()
      expect(plan2).not.toBeNull()
      // Should return the same plan (deduplication via substring match)
      expect(plan2!.id).toBe(plan1!.id)
    })

    it('clamps priority to [0, 1]', async () => {
      const llm = createMockLlm({
        hasPlan: true,
        goal: 'Urgent task',
        steps: [{ description: 'Do it' }],
        priority: 5.0,
      })

      const planner = new Planner(store, llm)
      const plan = await planner.detectAndCreate('user1', 'Urgent task')

      expect(plan!.priority).toBeLessThanOrEqual(1)
      expect(plan!.priority).toBeGreaterThanOrEqual(0)
    })

    it('limits steps to maxStepsPerPlan', async () => {
      const steps = Array.from({ length: 20 }, (_, i) => ({
        description: `Step ${i + 1}`,
      }))

      const llm = createMockLlm({
        hasPlan: true,
        goal: 'Big project',
        steps,
        priority: 0.5,
      })

      const planner = new Planner(store, llm, { maxStepsPerPlan: 3 })
      const plan = await planner.detectAndCreate('user1', 'Big project')

      expect(plan!.steps).toHaveLength(3)
    })

    it('enforces max active plans by abandoning lowest priority', async () => {
      const makePlan = (goal: string, priority: number) => ({
        hasPlan: true,
        goal,
        steps: [{ description: 'do it' }],
        priority,
      })

      const config = { maxActivePlans: 2 }

      // Create first plan
      const plannerA = new Planner(store, createMockLlm(makePlan('Goal A', 0.9)), config)
      await plannerA.detectAndCreate('user1', 'Goal A')

      // Create second plan
      const plannerB = new Planner(store, createMockLlm(makePlan('Goal B', 0.5)), config)
      await plannerB.detectAndCreate('user1', 'Goal B')

      // Create third — should abandon lowest priority (B)
      const plannerC = new Planner(store, createMockLlm(makePlan('Goal C', 0.7)), config)
      await plannerC.detectAndCreate('user1', 'Goal C')

      const active = await plannerC.getActive('user1')
      expect(active).toHaveLength(2)
      const goals = active.map((p) => p.goal)
      expect(goals).toContain('Goal A')
      expect(goals).toContain('Goal C')
    })
  })

  describe('completeStep', () => {
    it('marks a step as completed', async () => {
      const llm = createMockLlm({
        hasPlan: true,
        goal: 'Test plan',
        steps: [
          { description: 'Step 1' },
          { description: 'Step 2' },
        ],
        priority: 0.5,
      })

      const planner = new Planner(store, llm)
      const plan = await planner.detectAndCreate('user1', 'Test plan')

      await planner.completeStep(plan!.id, plan!.steps[0]!.id)

      const active = await planner.getActive('user1')
      expect(active[0]!.steps[0]!.status).toBe('completed')
      expect(active[0]!.steps[1]!.status).toBe('pending')
      expect(active[0]!.status).toBe('active')
    })

    it('auto-completes plan when all steps are done', async () => {
      const llm = createMockLlm({
        hasPlan: true,
        goal: 'Simple plan',
        steps: [{ description: 'Only step' }],
        priority: 0.5,
      })

      const planner = new Planner(store, llm)
      const plan = await planner.detectAndCreate('user1', 'Simple plan')

      await planner.completeStep(plan!.id, plan!.steps[0]!.id)

      const active = await planner.getActive('user1')
      expect(active).toHaveLength(0) // completed plans don't show in active
    })

    it('handles non-existent plan gracefully', async () => {
      const planner = new Planner(store, noopLlm)
      // Should not throw
      await planner.completeStep('nonexistent', 'step1')
    })
  })

  describe('abandon', () => {
    it('marks a plan as abandoned', async () => {
      const llm = createMockLlm({
        hasPlan: true,
        goal: 'Abandonable plan',
        steps: [{ description: 'Step' }],
        priority: 0.5,
      })

      const planner = new Planner(store, llm)
      const plan = await planner.detectAndCreate('user1', 'Abandonable')

      await planner.abandon(plan!.id)

      const active = await planner.getActive('user1')
      expect(active).toHaveLength(0)
    })
  })

  describe('getNextActions', () => {
    it('returns the first pending step from each plan', async () => {
      const llm = createMockLlm({
        hasPlan: true,
        goal: 'Multi-step',
        steps: [
          { description: 'First' },
          { description: 'Second' },
          { description: 'Third' },
        ],
        priority: 0.5,
      })

      const planner = new Planner(store, llm)
      await planner.detectAndCreate('user1', 'Multi-step')

      const actions = await planner.getNextActions('user1')
      expect(actions).toHaveLength(1)
      expect(actions[0]!.description).toBe('First')
    })

    it('skips steps with unmet dependencies', async () => {
      const llm = createMockLlm({
        hasPlan: true,
        goal: 'Dependent steps',
        steps: [
          { description: 'Build', dependencies: ['nonexistent-dep'] },
          { description: 'Test' },
        ],
        priority: 0.5,
      })

      const planner = new Planner(store, llm)
      await planner.detectAndCreate('user1', 'Dependent steps')

      const actions = await planner.getNextActions('user1')
      // First step has unmet deps, so it should skip to second
      // Actually, the code breaks after finding the first eligible step
      // and step 1 has unmet deps, step 2 has no deps so it's eligible
      expect(actions).toHaveLength(1)
      expect(actions[0]!.description).toBe('Test')
    })

    it('returns empty when all steps are done', async () => {
      const llm = createMockLlm({
        hasPlan: true,
        goal: 'Done plan',
        steps: [{ description: 'Only' }],
        priority: 0.5,
      })

      const planner = new Planner(store, llm)
      const plan = await planner.detectAndCreate('user1', 'Done plan')
      await planner.completeStep(plan!.id, plan!.steps[0]!.id)

      const actions = await planner.getNextActions('user1')
      expect(actions).toHaveLength(0)
    })
  })

  describe('getContext', () => {
    it('returns formatted context with active plans', async () => {
      const llm = createMockLlm({
        hasPlan: true,
        goal: 'Build a house',
        steps: [
          { description: 'Foundation' },
          { description: 'Walls' },
        ],
        priority: 0.8,
      })

      const planner = new Planner(store, llm)
      await planner.detectAndCreate('user1', 'Build a house')

      const ctx = await planner.getContext('user1')

      expect(ctx.activePlans).toHaveLength(1)
      expect(ctx.nextActions).toHaveLength(1)
      expect(ctx.formattedContext).toContain('Build a house')
      expect(ctx.formattedContext).toContain('0/2 steps done')
      expect(ctx.formattedContext).toContain('Foundation')
    })

    it('returns empty context when no plans exist', async () => {
      const planner = new Planner(store, noopLlm)
      const ctx = await planner.getContext('user1')

      expect(ctx.activePlans).toHaveLength(0)
      expect(ctx.nextActions).toHaveLength(0)
      expect(ctx.formattedContext).toBe('')
    })
  })
})
