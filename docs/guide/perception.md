# Perception

The perception module analyzes raw input and produces structured understanding.

## What It Does

- Extracts entities (people, topics, technologies mentioned)
- Detects intent (question, request, feedback, complaint)
- Identifies conversation phase (opening, exploring, problem-solving, closing)
- Generates belief candidates from the input
- Determines response mode (concise, detailed, exploratory)

## Usage

```typescript
import { PerceptionService } from '@cognitive-engine/perception'

const perception = new PerceptionService(engine)
const result = await perception.perceive(userInput, conversationHistory)
```

## Quick Analysis

For lightweight analysis without full LLM calls:

```typescript
import { quickAnalyze } from '@cognitive-engine/perception'

const quick = quickAnalyze(text)
// quick.entities, quick.patterns, quick.questionType
```

## Deep Analysis

For thorough analysis with LLM:

```typescript
import { deepAnalyze } from '@cognitive-engine/perception'

const deep = await deepAnalyze(text, engine.llm)
```
