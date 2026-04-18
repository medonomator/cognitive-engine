# @cognitive-engine/planning

Goal decomposition, multi-step plan management, and execution tracking with dependency resolution.

## Install

```bash
npm install @cognitive-engine/planning
```

## Quick Start

```typescript
import { Planner } from '@cognitive-engine/planning'
import { MemoryStore } from '@cognitive-engine/store-memory'

const planner = new Planner(store, llm)

// Detect goal in user message and create a plan
const plan = await planner.detectAndCreate('user-123', 'I want to learn TypeScript')
// plan.goal: 'Learn TypeScript'
// plan.steps: [{ description: 'Read the handbook' }, ...]
// plan.priority: 0.7
// plan.status: 'active'
```

## Configuration

```typescript
const planner = new Planner(store, llm, {
  maxActivePlans: 5,   // Max concurrent plans per user (default: 5)
  maxStepsPerPlan: 10,  // Max steps per plan (default: 10)
})
```

When `maxActivePlans` is exceeded, the lowest-priority plan is automatically abandoned.

## API

### `detectAndCreate(userId, message)`

Uses the LLM to detect if a message contains a goal. If yes, creates a structured plan. Returns `null` if no goal detected. Deduplicates against existing plans.

```typescript
const plan = await planner.detectAndCreate('user-123', 'Build a REST API')
if (plan) {
  console.log(plan.goal)     // 'Build a REST API'
  console.log(plan.steps)    // PlanStep[] with order, status, dependencies
  console.log(plan.priority) // 0-1, clamped
}
```

### `getActive(userId)`

Returns all active plans for a user.

```typescript
const plans = await planner.getActive('user-123')
// Plans sorted by priority
```

### `getNextActions(userId)`

Returns the first actionable step from each active plan — steps whose dependencies are met.

```typescript
const actions = await planner.getNextActions('user-123')
// [{ description: 'Set up project', planId: '...' }]
```

### `completeStep(planId, stepId)`

Marks a step as completed. If all steps are done, the plan auto-completes.

```typescript
await planner.completeStep(plan.id, plan.steps[0].id)
```

### `abandon(planId)`

Marks a plan as abandoned and removes it from active plans.

```typescript
await planner.abandon(plan.id)
```

### `getContext(userId)`

Builds a `PlanningContext` for the reasoning layer — active plans, next actions, and a formatted text summary.

```typescript
const ctx = await planner.getContext('user-123')
ctx.activePlans   // Plan[]
ctx.nextActions   // PlanStep[]
ctx.formattedContext // 'Goal: Learn TypeScript (0/3 steps done)\n  Next: Read the handbook'
```
