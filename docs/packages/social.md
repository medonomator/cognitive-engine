# @cognitive-engine/social

Social model: rapport tracking, boundaries, communication preferences.

## Install

```bash
npm install @cognitive-engine/social
```

## Exports

### SocialModel

Orchestrates social awareness sub-modules.

```typescript
import { SocialModel } from '@cognitive-engine/social'

const social = new SocialModel(engine)
const context = await social.assess(cognitiveState)
```

### RapportTracker

Tracks the level of rapport between agent and user over time.

```typescript
import { RapportTracker } from '@cognitive-engine/social'
```

### BoundaryDetector

Detects social boundaries - topics the user doesn't want to discuss, interaction limits.

```typescript
import { BoundaryDetector } from '@cognitive-engine/social'
```

### PreferenceLearner

Learns communication preferences: verbosity, formality, use of examples, etc.

```typescript
import { PreferenceLearner } from '@cognitive-engine/social'
```
