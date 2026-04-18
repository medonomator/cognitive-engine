# Cognitive Pipeline

The cognitive pipeline is the core processing loop that runs on every input.

## Overview

Unlike simple LLM wrappers that send a prompt and get a response, cognitive-engine runs a multi-stage pipeline that mimics how cognition works:

```
Input
  |
  v
Perception -----> Extract entities, intent, emotional tone
  |                Identify what's new vs. already known
  v
Working Memory -> Pull relevant episodic memories
  |                Pull relevant semantic facts
  |                Rank by relevance, keep top N
  v
Reasoning ------> Update world model with new information
  |                Form beliefs from evidence
  |                Generate intentions
  v
Metacognition --> Check for contradictions
  |                Assess cognitive load
  |                Adjust strategy if needed
  v
Response -------> Generate output with full context
  |
  v
Memory Store ---> Save this interaction as episode
                   Update semantic facts if learned something new
```

## Perception

Perception is the first stage. It takes raw input and produces structured understanding:

```typescript
import { PerceptionService } from '@cognitive-engine/perception'

const perception = new PerceptionService(engine)
const result = await perception.perceive(input, history)

// result.entities    - extracted entities
// result.intent      - detected intent
// result.phase       - conversation phase (opening, exploring, closing)
// result.beliefs     - candidate beliefs from this input
```

## Memory Types

### Episodic Memory
Stores experiences - what happened, when, what was the outcome.

```typescript
import { EpisodicMemory } from '@cognitive-engine/memory'

const episodic = new EpisodicMemory(engine)
await episodic.store(episode)
const relevant = await episodic.recall(query)
```

### Semantic Memory
Stores facts - what the agent knows about the world.

```typescript
import { SemanticMemory } from '@cognitive-engine/memory'

const semantic = new SemanticMemory(engine)
await semantic.storeFact(fact)
const facts = await semantic.query(topic)
```

### Working Memory
Temporary buffer that combines relevant items from both memory types.

```typescript
import { WorkingMemory } from '@cognitive-engine/reasoning'

const working = new WorkingMemory({ maxItems: 20 })
working.load(episodicResults, semanticResults)
const context = working.getRelevant(currentInput)
```
