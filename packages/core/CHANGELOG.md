# @cognitive-engine/core

## 0.3.0

### Minor Changes

- Add `LlmTraceContext` and `LlmOptions.trace` so callers can pass observability
  context (traceId, traceName, generationName, userId, sessionId, tags, metadata)
  down to a provider's tracing backend. Vendor-neutral: providers without tracing
  ignore the field.
