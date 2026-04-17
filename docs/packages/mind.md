# @cognitive-engine/mind

Living mind: reflections, open loops, relationship graph, emotional triggers.

## Install

```bash
npm install @cognitive-engine/mind
```

## Exports

### MindService

Orchestrates all mind sub-modules into a unified context.

```typescript
import { MindService } from '@cognitive-engine/mind'

const mind = new MindService(engine)
const context = await mind.think(cognitiveState)
```

### ReflectionService

Generates reflections about past interactions and outcomes.

```typescript
import { ReflectionService } from '@cognitive-engine/mind'
```

### RelationshipTracker

Tracks relationships between the agent and users over time.

```typescript
import { RelationshipTracker } from '@cognitive-engine/mind'
```

### OpenLoopDetector

Detects unresolved topics and questions that need follow-up.

```typescript
import { OpenLoopDetector } from '@cognitive-engine/mind'
```

### EmotionalTriggerTracker

Tracks patterns that trigger emotional responses in users.

```typescript
import { EmotionalTriggerTracker } from '@cognitive-engine/mind'
```
