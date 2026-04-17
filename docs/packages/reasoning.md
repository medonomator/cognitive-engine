# @cognitive-engine/reasoning

BDI reasoning engine: beliefs, intentions, inference rules, working memory.

## Install

```bash
npm install @cognitive-engine/reasoning
```

## Exports

### Reasoner

Main reasoning service that coordinates belief updates and intention generation.

```typescript
import { Reasoner } from '@cognitive-engine/reasoning'

const reasoner = new Reasoner(engine)
```

### WorldModel

Maintains the agent's model of the world - beliefs, their confidence, and sources.

```typescript
import { WorldModel } from '@cognitive-engine/reasoning'

const world = new WorldModel()
world.updateBelief({ content: '...', confidence: 0.8, source })
```

### WorkingMemory

Temporary buffer holding currently relevant context from episodic and semantic memory.

```typescript
import { WorkingMemory } from '@cognitive-engine/reasoning'

const working = new WorkingMemory({ maxItems: 20 })
```

### generateIntentions

Generates action intentions based on beliefs and context.

```typescript
import { generateIntentions } from '@cognitive-engine/reasoning'
```

### applyInferenceRules

Derives new beliefs from existing ones using logical rules.

```typescript
import { applyInferenceRules } from '@cognitive-engine/reasoning'
```
