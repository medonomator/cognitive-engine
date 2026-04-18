# @cognitive-engine/emotional

Emotional state tracking using the VAD (Valence-Arousal-Dominance) dimensional model. Tracks trajectory, detects volatility, and provides emotional context for reasoning.

## Install

```bash
npm install @cognitive-engine/emotional
```

## Quick Start

```typescript
import { EmotionalModel } from '@cognitive-engine/emotional'

const emotional = new EmotionalModel(store, {
  maxHistory: 20,          // Track last N states (default: 20)
  smoothingFactor: 0.3,    // EMA smoothing (default: 0.3)
  volatilityThreshold: 0.5 // Flag rapid shifts (default: 0.5)
})

// Update state from a perception result
const state = await emotional.update('user-123', percept)
state.emotion     // 'anxious'
state.valence     // -0.4
state.arousal     // 0.7
state.dominance   // 0.2
```

## API

### `update(userId, percept)`

Updates emotional state based on a perception result. Returns the new `EmotionalState`.

```typescript
const state = await emotional.update('user-123', percept)
```

### `getState(userId)`

Returns the current emotional state, or `null` if no history.

```typescript
const state = await emotional.getState('user-123')
if (state) {
  console.log(state.emotion)   // 'happy'
  console.log(state.valence)   // 0.8
  console.log(state.arousal)   // 0.5
  console.log(state.dominance) // 0.7
}
```

### `getContext(userId)`

Builds `EmotionalContext` for the reasoning layer — current state, trajectory, dominant emotion, volatility flag.

```typescript
const ctx = await emotional.getContext('user-123')
ctx.currentState    // EmotionalState
ctx.trajectory      // 'improving' | 'declining' | 'stable'
ctx.dominantEmotion // 'stressed'
ctx.isVolatile      // true if rapid emotional shifts detected
ctx.formattedContext // Text summary for system prompt injection
```

### `emotionToVAD(emotion)`

Maps an emotion label to VAD coordinates. Supports 26 emotions:

```typescript
emotional.emotionToVAD('happy')    // { valence: 0.8, arousal: 0.5, dominance: 0.7 }
emotional.emotionToVAD('anxious')  // { valence: -0.4, arousal: 0.7, dominance: 0.2 }
emotional.emotionToVAD('calm')     // { valence: 0.5, arousal: -0.5, dominance: 0.6 }
```

**Supported emotions:** happy, excited, content, calm, grateful, proud, hopeful, amused, loving, neutral, sad, anxious, stressed, angry, frustrated, fearful, disappointed, lonely, bored, confused, overwhelmed, guilty, ashamed, jealous, nostalgic, surprised.

## How It Works

The model maintains a sliding window of emotional states per user. Each new perception triggers:

1. **Emotion detection** from the percept's emotional tone
2. **VAD mapping** to continuous coordinates
3. **EMA smoothing** to avoid noise from single messages
4. **Volatility check** comparing recent variance against threshold
5. **Trajectory calculation** from the smoothed history
