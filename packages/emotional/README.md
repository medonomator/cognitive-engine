# @cognitive-engine/emotional

[![npm](https://img.shields.io/npm/v/@cognitive-engine/emotional)](https://www.npmjs.com/package/@cognitive-engine/emotional)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Emotional model with VAD tracking and volatility detection for [cognitive-engine](https://github.com/medonomator/cognitive-engine).

## Install

```bash
npm install @cognitive-engine/emotional
```

## What It Does

Tracks emotional states using the **VAD model** (Valence-Arousal-Dominance):

- **Valence** — positive vs. negative (happy ↔ sad)
- **Arousal** — calm vs. excited (relaxed ↔ agitated)
- **Dominance** — in control vs. overwhelmed (confident ↔ helpless)

Detects emotional trajectories and volatility to adapt agent behavior.

## Usage

```typescript
import { EmotionalModel } from '@cognitive-engine/emotional'

const emotional = new EmotionalModel()

// Update from perception results
emotional.update({
  valence: -0.3,   // Slightly negative
  arousal: 0.7,    // High arousal
  dominance: -0.2, // Slightly overwhelmed
})

// Get current state
const state = emotional.getState()
state.valence      // -0.3
state.arousal      // 0.7
state.dominance    // -0.2
state.label        // 'anxious'

// Track trajectory over time
emotional.update({ valence: -0.5, arousal: 0.8, dominance: -0.4 })
emotional.update({ valence: -0.6, arousal: 0.9, dominance: -0.5 })

const trajectory = emotional.getTrajectory()
trajectory.trend     // 'deteriorating'
trajectory.volatile  // true — rapid changes detected
```

## Why It Matters

An agent that tracks emotional state can:
- **Adapt tone** — be gentler when user is frustrated
- **Detect escalation** — flag when emotions are trending negative
- **Avoid triggers** — learn what topics cause distress
- **Time responses** — delay complex tasks when arousal is too high

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
