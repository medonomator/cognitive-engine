# @cognitive-engine/temporal

## 0.3.1

### Patch Changes

- Pin internal package references to the exact version they were published with. They were shipped as the `*` range, so a consumer installing the umbrella package could resolve stale copies of the sub-packages and lose the newest API.

- Updated dependencies []:
  - @cognitive-engine/core@0.4.1
  - @cognitive-engine/math@0.2.1

## 0.3.0

### Minor Changes

- Propagate observability context through every LLM call.

  `CognitiveOrchestrator.process()` now accepts an optional `LlmTraceContext` and passes it
  down to perception, memory extraction, mind, social, planning and response generation.
  Each component stamps its own `userId`, `generationName` and tags on top of the inherited
  context via the new `mergeTrace` helper, so a single conversation turn shows up as one
  trace in Langfuse or any other tracing backend.

### Patch Changes

- Updated dependencies []:
  - @cognitive-engine/core@0.4.0
