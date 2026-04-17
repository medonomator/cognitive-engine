# @cognitive-engine/emotional

Emotional model: VAD (Valence-Arousal-Dominance) tracking, trajectory, volatility detection.

## Install

```bash
npm install @cognitive-engine/emotional
```

## Exports

### EmotionalModel

Models emotional state using the VAD dimensional model.

```typescript
import { EmotionalModel } from '@cognitive-engine/emotional'

const emotional = new EmotionalModel(config)
const context = await emotional.assess(cognitiveState)
// Returns: EmotionalContext with current state, trajectory, volatility
```

The emotional model tracks:
- **Valence** - positive vs. negative affect
- **Arousal** - calm vs. excited
- **Dominance** - feeling in control vs. overwhelmed
- **Trajectory** - how emotions are changing over time
- **Volatility** - how rapidly emotions shift
