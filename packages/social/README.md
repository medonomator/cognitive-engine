# @cognitive-engine/social

[![npm](https://img.shields.io/npm/v/@cognitive-engine/social)](https://www.npmjs.com/package/@cognitive-engine/social)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Social model for [cognitive-engine](https://github.com/medonomator/cognitive-engine). Tracks rapport, detects boundaries, and learns communication preferences.

## Install

```bash
npm install @cognitive-engine/social
```

## Components

### SocialModel

Top-level coordinator that combines rapport, boundaries, and preferences into a social context.

```typescript
import { SocialModel } from '@cognitive-engine/social'

const social = new SocialModel()
const context = social.analyze(percept, history)

context.rapport        // 0.72
context.formality      // 'casual'
context.boundaries     // ['no_personal_advice']
context.preferences    // { responseLength: 'concise', tone: 'direct' }
```

### RapportTracker

Tracks relationship quality over time based on interaction patterns.

```typescript
import { RapportTracker } from '@cognitive-engine/social'

const rapport = new RapportTracker()
rapport.update({ positive: true, engagement: 0.8 })
rapport.getScore()  // 0.65
```

### BoundaryDetector

Detects when the user sets or implies boundaries.

```typescript
import { BoundaryDetector } from '@cognitive-engine/social'

const detector = new BoundaryDetector()
const boundaries = detector.detect("I don't want to talk about that")
// ['topic_avoidance']
```

### PreferenceLearner

Learns communication preferences from interaction history.

```typescript
import { PreferenceLearner } from '@cognitive-engine/social'

const learner = new PreferenceLearner()
learner.observe({ responseLength: 150, wasHelpful: true })
learner.observe({ responseLength: 500, wasHelpful: false })

learner.getPreferences()
// { responseLength: 'concise', ... }
```

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
