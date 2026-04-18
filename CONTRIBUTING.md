# Contributing to cognitive-engine

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/medonomator/cognitive-engine.git
cd cognitive-engine

# Install dependencies (requires Node.js >= 20)
npm install

# Build all packages
npm run build

# Run all tests
npm run test

# Lint
npm run lint
```

## Project Structure

This is a monorepo using npm workspaces and Turborepo:

```
packages/
  core/             # Types, interfaces, event emitter, uid
  math/             # Vector ops, matrix ops, sampling, temporal utilities
  perception/       # Intent detection, emotion analysis, belief extraction
  reasoning/        # BDI reasoning, world model, working memory
  memory/           # Episodic and semantic memory with extraction
  mind/             # Living mind: reflections, relationships, open loops
  emotional/        # VAD emotional model with trajectory tracking
  social/           # Rapport, boundaries, communication preferences
  temporal/         # Behavior patterns, causal chains, predictions
  planning/         # Goal decomposition and plan execution
  metacognition/    # Self-monitoring, contradiction detection, strategy
  orchestrator/     # CognitiveOrchestrator — wires all modules together
  bandit/           # Thompson Sampling for adaptive personalization
  store-memory/     # In-memory Store implementation (testing)
  provider-openai/  # OpenAI LLM and embedding adapters
  cognitive-engine/ # Umbrella package re-exporting all modules
```

## Making Changes

1. Create a feature branch from `main`
2. Make your changes in the relevant package(s)
3. Add or update tests — all packages use [Vitest](https://vitest.dev/)
4. Ensure `npm run build` and `npm run test` pass
5. Submit a pull request

## Code Style

- TypeScript strict mode — no `any` casts
- Follow existing patterns (GRASP/SOLID principles)
- No TODO/FIXME/HACK comments — fix it or file an issue
- Tests live alongside source as `*.test.ts`
- Keep methods under 30 lines — decompose if larger
- Guard clauses over nested if/else

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new cognitive module
fix: resolve memory leak in episodic store
docs: update orchestrator API reference
refactor: extract shared utilities
test: add edge case coverage for planner
chore: update dependencies
```

## Reporting Issues

- Use [GitHub Issues](https://github.com/medonomator/cognitive-engine/issues)
- Include reproduction steps, expected vs actual behavior
- For bugs: include Node.js version and relevant package versions

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
