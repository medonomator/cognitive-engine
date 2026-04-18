# @cognitive-engine/orchestrator

Master cognitive pipeline: wires all modules together and runs the full cognitive cycle per message.

## Install

```bash
npm install @cognitive-engine/orchestrator
```

## Quick Start

```typescript
import { CognitiveOrchestrator } from '@cognitive-engine/orchestrator'
import { OpenAiLlmProvider, OpenAiEmbeddingProvider } from '@cognitive-engine/provider-openai'
import { MemoryStore } from '@cognitive-engine/store-memory'

const agent = new CognitiveOrchestrator({
  engine: {
    llm: new OpenAiLlmProvider({ model: 'gpt-4o-mini' }),
    embedding: new OpenAiEmbeddingProvider(),
    store: new MemoryStore(),
  },
  modules: {
    perception: true,
    episodicMemory: true,
    semanticMemory: true,
    reasoning: true,
    metacognition: true,
    mind: true,
    emotional: true,
    social: true,
    temporal: true,
    planning: true,
  },
})

const response = await agent.process('user-123', 'I want to learn TypeScript')
// response.suggestedResponse — text to send back
// response.systemPrompt — enriched system prompt with all context
```

## Module Selection

Enable only what you need. Disabled modules are skipped — zero overhead.

```typescript
// Minimal: just perception + reasoning (fast, cheap)
const minimal = new CognitiveOrchestrator({
  engine: { llm, embedding, store },
  modules: {
    perception: true,
    reasoning: true,
  },
})

// Full cognitive stack (richer but more LLM calls)
const full = new CognitiveOrchestrator({
  engine: { llm, embedding, store },
  modules: {
    perception: true,
    episodicMemory: true,
    semanticMemory: true,
    reasoning: true,
    metacognition: true,
    mind: true,
    emotional: true,
    social: true,
    temporal: true,
    planning: true,
  },
})
```

## Public API

### `process(userId, message)`

Runs the full cognitive cycle and returns enriched context.

```typescript
const response = await agent.process('user-123', 'I feel stuck on my project')

response.suggestedResponse  // AI-generated response text
response.systemPrompt       // System prompt with all context layers injected
response.perception         // Percept: intent, emotion, urgency
response.episodicContext    // Recent relevant episodes
response.semanticContext    // Relevant facts
response.emotionalContext   // Current emotional state + trajectory
response.socialContext      // Rapport, boundaries, preferences
response.planningContext    // Active plans and next actions
```

### `analyzeTemporalPatterns(userId)`

Runs temporal analysis — pattern detection, causal chains, predictions. Call periodically (e.g., daily), not per-message.

```typescript
await agent.analyzeTemporalPatterns('user-123')
```

### `recordFeedback(actionId, context, reward)`

Feed reward signals back to the Thompson Sampling bandit.

```typescript
await agent.recordFeedback('response-style-warm', [1, 0, 0.5], 1.0)
```

### Events

Subscribe to cognitive events for logging, analytics, or custom integrations.

```typescript
agent.on('perception', (data) => {
  console.log('Intent:', data.percept.requestType)
})

agent.on('episodeCreated', (data) => {
  console.log('New episode:', data.episode.summary)
})
```

## Accessing Modules

All modules are public properties for direct access when needed.

```typescript
agent.perception       // PerceptionService
agent.reasoning        // Reasoner
agent.episodicMemory   // EpisodicMemory | null
agent.semanticMemory   // SemanticMemory | null
agent.emotional        // EmotionalModel | null
agent.social           // SocialModel | null
agent.temporal         // TemporalEngine | null
agent.planner          // Planner | null
agent.metacognition    // MetacognitionService | null
agent.bandit           // ThompsonBandit | null
agent.mind             // MindService | null
```
