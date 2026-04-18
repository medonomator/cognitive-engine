# @cognitive-engine/social

Social intelligence: rapport tracking, boundary detection, and communication preference learning.

## Install

```bash
npm install @cognitive-engine/social
```

## Quick Start

```typescript
import { SocialModel } from '@cognitive-engine/social'

const social = new SocialModel(store, llm, {
  initialTrust: 0.3,     // Starting rapport (default: 0.3)
  trustIncrement: 0.05,  // Per-interaction trust growth (default: 0.05)
})

// Process a message through all social components
await social.process('user-123', 'Can you help me?', percept)

// Get social context for reasoning
const ctx = await social.getContext('user-123')
```

## Sub-Modules

### RapportTracker

Tracks trust, familiarity, comfort, and engagement over time.

```typescript
import { RapportTracker } from '@cognitive-engine/social'

const rapport = new RapportTracker(store, { initialTrust: 0.3 })

const state = await rapport.update('user-123', percept, messageLength)
state.trust       // 0.0-1.0 — grows with positive interactions
state.familiarity // 0.0-1.0 — grows with interaction count
state.comfort     // 0.0-1.0 — grows when user opens up
state.engagement  // 0.0-1.0 — based on message length and frequency
```

### BoundaryDetector

Uses LLM to detect topics the user doesn't want to discuss.

```typescript
import { BoundaryDetector } from '@cognitive-engine/social'

const detector = new BoundaryDetector(store, llm, 20) // max 20 boundaries

// Detect boundaries from a message
const boundaries = await detector.detect('user-123', "I don't want to talk about work")
// [{ topic: 'work', sensitivity: 0.8, reason: 'explicit request' }]

// Check before responding
const sensitive = await detector.isSensitive('user-123', 'career advice', 0.5)
if (sensitive) {
  // Avoid this topic
}

// List all boundaries
const all = await detector.getAll('user-123')
```

### PreferenceLearner

Learns how the user prefers to communicate — extracted from their messages via LLM.

```typescript
import { PreferenceLearner } from '@cognitive-engine/social'

const learner = new PreferenceLearner(store, llm, 10) // max 10 preferences

// Learn from message patterns
const prefs = await learner.learn('user-123', 'Just give me the answer, no fluff')
// [{ dimension: 'directness', value: 0.9, confidence: 0.7 }]

// Query specific dimension
const detail = await learner.getPreference('user-123', 'detail_level')
// { dimension: 'detail_level', value: 0.3, confidence: 0.8 }
```

**Preference dimensions:** formality, detail_level, emotional_support, humor, directness, structure, challenge_tolerance.

## Social Context

The `getContext()` method returns everything the reasoning layer needs:

```typescript
const ctx = await social.getContext('user-123')
ctx.rapport       // RapportState — trust, familiarity, comfort, engagement
ctx.boundaries    // SocialBoundary[] — topics to avoid
ctx.preferences   // CommunicationPreference[] — how user likes to communicate
ctx.formattedContext // Text summary for system prompt
```
