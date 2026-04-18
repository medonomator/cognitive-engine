# What is cognitive-engine?

cognitive-engine is a TypeScript library that gives AI agents actual cognitive capabilities - not just prompt engineering.

## The Problem

Most AI agent frameworks are wrappers around LLM API calls. They have no memory between sessions, no ability to learn from mistakes, and no self-awareness.

```typescript
// This is what most "agents" look like
const response = await llm.complete([
  { role: 'system', content: prompt },
  { role: 'user', content: input }
])
```

## The Solution

cognitive-engine provides a full cognitive pipeline:

- **Perception** - understands context, not just text
- **Episodic Memory** - remembers what happened (conversations, outcomes, mistakes)
- **Semantic Memory** - stores what it knows (facts, patterns, domain knowledge)
- **Working Memory** - keeps relevant context active
- **Reasoning** - forms beliefs from evidence, generates intentions
- **Metacognition** - monitors its own thinking, catches biases

## Architecture

```
Input -> Perception -> Working Memory -> Reasoning -> Response
              |              ^
              v              |
         Episodic        Semantic
         Memory          Memory
```

Each module is a separate npm package. Use all of them together via the orchestrator, or pick individual modules.

## Key Design Decisions

- **Provider agnostic** - any LLM, any storage. Implement `LlmProvider` and `Store` interfaces.
- **Zero casts** - strict TypeScript with no type assertions anywhere in the codebase.
- **Modular** - use the full pipeline or just the parts you need.
- **Tested** - 320 tests across 23 test files.
