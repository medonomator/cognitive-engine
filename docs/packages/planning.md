# @cognitive-engine/planning

Goal decomposition, action planning, and plan execution tracking.

## Install

```bash
npm install @cognitive-engine/planning
```

## Exports

### Planner

Decomposes goals into multi-step plans with dependencies.

```typescript
import { Planner } from '@cognitive-engine/planning'

const planner = new Planner(engine)
const context = await planner.plan(cognitiveState)
// Returns: PlanningContext with active plans and next steps
```

Plans consist of `PlanStep` objects, each with:
- **action** - what to do
- **dependencies** - which steps must complete first
- **status** - pending, in-progress, completed, failed
- **estimated effort** - how complex the step is
