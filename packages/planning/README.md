# @cognitive-engine/planning

[![npm](https://img.shields.io/npm/v/@cognitive-engine/planning)](https://www.npmjs.com/package/@cognitive-engine/planning)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Goal decomposition and plan execution tracking for [cognitive-engine](https://github.com/medonomator/cognitive-engine).

## Install

```bash
npm install @cognitive-engine/planning
```

## Usage

```typescript
import { Planner } from '@cognitive-engine/planning'

const planner = new Planner(llmProvider)

// Decompose a goal into actionable steps
const plan = await planner.plan({
  goal: 'Help user debug authentication flow',
  context: cognitiveState,
})

plan.steps
// [
//   { id: 1, action: 'identify_error', status: 'pending' },
//   { id: 2, action: 'analyze_auth_config', status: 'pending', dependsOn: [1] },
//   { id: 3, action: 'suggest_fix', status: 'pending', dependsOn: [2] },
// ]

// Track execution
planner.markComplete(1, { result: 'TokenExpiredError at line 42' })
planner.markComplete(2, { result: 'JWT secret not set in env' })

const status = planner.getStatus()
status.progress    // 0.67
status.nextStep    // { id: 3, action: 'suggest_fix' }
status.blockers    // []
```

## Plan Structure

| Field | Description |
|-------|-------------|
| `goal` | Top-level objective |
| `steps[]` | Ordered actions with dependencies |
| `steps[].dependsOn` | IDs of steps that must complete first |
| `steps[].status` | pending, in_progress, completed, failed |
| `progress` | 0.0 to 1.0 completion ratio |

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
