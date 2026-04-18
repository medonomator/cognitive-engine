# @cognitive-engine/mind

[![npm](https://img.shields.io/npm/v/@cognitive-engine/mind)](https://www.npmjs.com/package/@cognitive-engine/mind)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Living mind module for [cognitive-engine](https://github.com/medonomator/cognitive-engine). Self-reflection, relationship tracking, open-loop detection, and emotional trigger identification.

## Install

```bash
npm install @cognitive-engine/mind
```

## Components

### MindService

Top-level coordinator for all "living mind" capabilities.

```typescript
import { MindService } from '@cognitive-engine/mind'

const mind = new MindService(llmProvider, store)
const state = await mind.process(cognitiveState)

state.reflections        // Self-generated insights
state.openLoops          // Unresolved threads needing attention
state.relationships      // Active relationship graph
state.emotionalTriggers  // Known triggers for this user
```

### ReflectionService

Generates self-reflections about the agent's own behavior and performance.

```typescript
import { ReflectionService } from '@cognitive-engine/mind'

const reflector = new ReflectionService(llmProvider)
const reflection = await reflector.reflect(recentInteractions)
// "I've been giving overly detailed responses — user seems to prefer brevity"
```

### RelationshipTracker

Maintains a graph of relationships between entities mentioned in conversation.

```typescript
import { RelationshipTracker } from '@cognitive-engine/mind'

const tracker = new RelationshipTracker()
tracker.observe('user', 'manager', 'reports_to')
tracker.observe('user', 'project-x', 'works_on')

const graph = tracker.getGraph('user')
```

### OpenLoopDetector

Detects unresolved conversational threads — questions asked but not answered, promises made but not followed up.

```typescript
import { OpenLoopDetector } from '@cognitive-engine/mind'

const detector = new OpenLoopDetector()
detector.track("Let me look into that for you")
detector.getOpenLoops()
// [{ content: "Let me look into that for you", age: 3, resolved: false }]
```

### EmotionalTriggerTracker

Identifies patterns in what topics or situations trigger emotional responses.

```typescript
import { EmotionalTriggerTracker } from '@cognitive-engine/mind'

const triggers = new EmotionalTriggerTracker()
triggers.record({ topic: 'deadlines', emotion: 'anxious', intensity: 0.8 })
triggers.record({ topic: 'deadlines', emotion: 'anxious', intensity: 0.7 })

triggers.getKnownTriggers()
// [{ topic: 'deadlines', emotion: 'anxious', avgIntensity: 0.75, occurrences: 2 }]
```

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
