# @cognitive-engine/perception

[![npm](https://img.shields.io/npm/v/@cognitive-engine/perception)](https://www.npmjs.com/package/@cognitive-engine/perception)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Dual-mode message perception for [cognitive-engine](https://github.com/medonomator/cognitive-engine). Analyzes incoming messages for emotion, intent, urgency, and entities.

## Install

```bash
npm install @cognitive-engine/perception
```

## How It Works

Two analysis modes, used together:

1. **Quick Analysis** (regex + heuristics) — instant, zero API calls. Detects greetings, questions, emotional markers, code blocks.
2. **Deep Analysis** (LLM) — full semantic understanding. Emotional tone, implicit needs, response strategy.

The `PerceptionService` combines both and extracts belief candidates for the reasoning module.

## Usage

### Full Perception (with LLM)

```typescript
import { PerceptionService } from '@cognitive-engine/perception'

const perception = new PerceptionService(llmProvider)

const { percept, beliefCandidates } = await perception.perceive(
  "I've been stressed about the deadline, my manager keeps adding tasks"
)

percept.emotionalTone    // 'anxious'
percept.urgency          // 7
percept.responseMode     // 'listening'
percept.implicitNeeds    // ['emotional_support', 'validation']
percept.entities         // [{ type: 'person', value: 'manager' }]
percept.requestType      // 'venting'

// Belief candidates for reasoning module
beliefCandidates
// [{ content: 'User is stressed about deadlines', source: 'perception', confidence: 0.9 }]
```

### Quick Analysis Only (no LLM)

```typescript
import { quickAnalyze } from '@cognitive-engine/perception'

const result = quickAnalyze('Can you help me fix this bug?')

result.isQuestion       // true
result.hasCodeBlock     // false
result.isGreeting       // false
result.estimatedUrgency // 5
```

### Deep Analysis Only

```typescript
import { deepAnalyze } from '@cognitive-engine/perception'

const result = await deepAnalyze(llmProvider, 'I love this new feature!')

result.emotionalTone    // 'enthusiastic'
result.urgency          // 2
result.sentiment        // 'positive'
```

## Percept Fields

| Field | Type | Description |
|-------|------|-------------|
| `emotionalTone` | string | Primary emotional tone detected |
| `urgency` | number (1-10) | How urgent the message is |
| `requestType` | string | question, request, venting, information, greeting |
| `responseMode` | string | listening, helping, teaching, chatting |
| `implicitNeeds` | string[] | Unstated needs inferred from context |
| `entities` | Entity[] | Named entities (people, projects, dates) |
| `sentiment` | string | positive, negative, neutral, mixed |

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
