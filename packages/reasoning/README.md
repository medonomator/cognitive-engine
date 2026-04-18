# @cognitive-engine/reasoning

[![npm](https://img.shields.io/npm/v/@cognitive-engine/reasoning)](https://www.npmjs.com/package/@cognitive-engine/reasoning)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

BDI (Beliefs-Desires-Intentions) reasoning engine for [cognitive-engine](https://github.com/medonomator/cognitive-engine).

## Install

```bash
npm install @cognitive-engine/reasoning
```

## What It Does

Implements a formal BDI reasoning cycle:
1. **Beliefs** — what the agent knows (updated via perception and inference)
2. **Desires** — goals derived from beliefs and context
3. **Intentions** — concrete actions to take, with priority and justification

## Usage

### Reasoner

```typescript
import { Reasoner } from '@cognitive-engine/reasoning'

const reasoner = new Reasoner(llmProvider)
const result = reasoner.reason(percept, currentBeliefs)

result.intentions
// [
//   { type: 'empathize', priority: 10, reason: 'User is stressed' },
//   { type: 'explore', priority: 5, reason: 'Need more context about workload' }
// ]

result.updatedBeliefs
// Beliefs updated with new evidence from perception
```

### World Model

```typescript
import { WorldModel } from '@cognitive-engine/reasoning'

const world = new WorldModel()
world.addBelief({ content: 'User prefers concise answers', confidence: 0.8, source: 'observation' })
world.addBelief({ content: 'User is a senior engineer', confidence: 0.9, source: 'inference' })

const relevant = world.query('communication style')
```

### Working Memory

```typescript
import { WorkingMemory } from '@cognitive-engine/reasoning'

const wm = new WorkingMemory({ capacity: 7 })
wm.add({ content: 'Current task: debug auth flow', salience: 0.9 })
wm.add({ content: 'Previous topic: deployment', salience: 0.3 })

// Low-salience items get displaced as capacity fills
```

### Standalone Functions

```typescript
import { generateIntentions, applyInferenceRules } from '@cognitive-engine/reasoning'

const intentions = generateIntentions(percept, beliefs)
const newBeliefs = applyInferenceRules(beliefs, rules)
```

## Intention Types

| Type | When |
|------|------|
| `empathize` | Emotional content detected |
| `explore` | Need more information |
| `teach` | User asking how/why |
| `act` | Clear actionable request |
| `clarify` | Ambiguous input |
| `redirect` | Off-topic or boundary issue |

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
