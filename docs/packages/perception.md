# @cognitive-engine/perception

Message perception: emotion, intent, urgency analysis with dual-mode processing.

## Install

```bash
npm install @cognitive-engine/perception
```

## Exports

### PerceptionService

Full perception pipeline that uses LLM for deep analysis.

```typescript
import { PerceptionService } from '@cognitive-engine/perception'

const perception = new PerceptionService(engine)
const result = await perception.perceive(input, history)
```

### quickAnalyze

Lightweight analysis without LLM calls - pattern matching and heuristics.

```typescript
import { quickAnalyze } from '@cognitive-engine/perception'

const quick = quickAnalyze(text)
// Returns: QuickAnalysisResult { entities, patterns, questionType }
```

### deepAnalyze

Thorough LLM-based analysis for complex inputs.

```typescript
import { deepAnalyze } from '@cognitive-engine/perception'

const deep = await deepAnalyze(text, llm)
// Returns: DeepAnalysisResult
```

### extractBeliefCandidates

Extracts potential beliefs from user input.

```typescript
import { extractBeliefCandidates } from '@cognitive-engine/perception'
```
