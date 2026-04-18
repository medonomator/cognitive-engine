# Reasoning

The reasoning module forms beliefs from evidence, generates intentions, and maintains a world model.

## World Model

The agent maintains a model of what it believes to be true:

```typescript
import { WorldModel } from '@cognitive-engine/reasoning'

const world = new WorldModel()
world.updateBelief({
  content: 'User prefers concise responses',
  confidence: 0.8,
  source: { type: 'inferred', context: 'user said "keep it short"' }
})
```

## Intention Generation

Based on beliefs and context, the agent generates intentions:

```typescript
import { generateIntentions } from '@cognitive-engine/reasoning'

const intentions = await generateIntentions(engine.llm, {
  beliefs: world.getBeliefs(),
  workingMemory: working.getRelevant(input),
  percept: perceptionResult
})
// intentions: [{ type: 'respond', confidence: 0.9, reasoning: '...' }]
```

## Inference Rules

Apply logical rules to derive new beliefs from existing ones:

```typescript
import { applyInferenceRules } from '@cognitive-engine/reasoning'

const derived = applyInferenceRules(beliefs, rules)
```
