# Architecture

cognitive-engine is a monorepo with 14 packages, each handling one cognitive module.

## Package Map

| Layer | Package | Role |
|-------|---------|------|
| Core | `@cognitive-engine/core` | Types, interfaces, events, config |
| Core | `@cognitive-engine/math` | Linear algebra, sampling, temporal math |
| Perception | `@cognitive-engine/perception` | Input analysis, entity extraction, belief candidates |
| Memory | `@cognitive-engine/memory` | Episodic and semantic memory |
| Reasoning | `@cognitive-engine/reasoning` | World model, working memory, intention generation |
| Mind | `@cognitive-engine/mind` | Reflection, relationships, open loops, emotional triggers |
| Emotional | `@cognitive-engine/emotional` | Emotional state modeling |
| Social | `@cognitive-engine/social` | Rapport, boundaries, communication preferences |
| Temporal | `@cognitive-engine/temporal` | Patterns, causal chains, predictions |
| Planning | `@cognitive-engine/planning` | Multi-step plan generation |
| Metacognition | `@cognitive-engine/metacognition` | Contradiction detection, strategy tracking, cognitive load |
| Orchestrator | `@cognitive-engine/orchestrator` | Full pipeline orchestration |
| Bandit | `@cognitive-engine/bandit` | Thompson Sampling for strategy selection |
| Storage | `@cognitive-engine/store-memory` | In-memory store implementation |
| Provider | `@cognitive-engine/provider-openai` | OpenAI LLM and embedding provider |

## Data Flow

The orchestrator runs a cognitive cycle on each input:

```
1. Perceive     - analyze input, extract entities and intent
2. Remember     - query episodic + semantic memory for context
3. Reason       - form beliefs, generate intentions
4. Plan         - create multi-step plan if needed
5. Metacognize  - check for contradictions, adjust strategy
6. Respond      - generate output with full cognitive context
7. Store        - save episode to memory for future recall
```

## Provider Interface

All LLM calls go through the `LlmProvider` interface:

```typescript
interface LlmProvider {
  complete(messages: LlmMessage[], options?: LlmOptions): Promise<LlmResponse>
  completeJson<T>(messages: LlmMessage[], options?: LlmOptions): Promise<LlmResponse & { parsed: T }>
}
```

Implement this interface to use any LLM. The `@cognitive-engine/provider-openai` package provides a ready-made OpenAI implementation.
