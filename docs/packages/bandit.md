# @cognitive-engine/bandit

Contextual Thompson Sampling bandit for adaptive personalization. Learns which actions work best in which contexts through Bayesian posterior updates.

## Install

```bash
npm install @cognitive-engine/bandit
```

## Quick Start

```typescript
import { ThompsonBandit, MemoryBanditStorage } from '@cognitive-engine/bandit'

const bandit = new ThompsonBandit(new MemoryBanditStorage(), {
  explorationRate: 0.1,    // 10% random exploration (default: 0.1)
  noiseVariance: 1.0,      // Observation noise (default: 1.0)
  initialVariance: 1000,   // Flat prior — high uncertainty (default: 1000)
})

// Initialize actions with context dimensions
await bandit.initAction('style-warm', 3)
await bandit.initAction('style-direct', 3)
await bandit.initAction('style-playful', 3)

// Select best action given context
const context = [0.8, 0.2, 0.5] // [engagement, urgency, familiarity]
const choice = await bandit.select(context, ['style-warm', 'style-direct', 'style-playful'])
choice.actionId        // 'style-warm'
choice.expectedReward  // 0.73
choice.wasExploration  // false

// Feed back the reward
await bandit.update('style-warm', context, 1.0) // positive outcome
```

## How Thompson Sampling Works

Each action maintains a Bayesian posterior over reward parameters. On each selection:

1. **Sample** from each action's posterior distribution
2. **Pick** the action with highest sampled value (exploitation)
3. With `explorationRate` probability, pick randomly instead (exploration)
4. After observing the outcome, **update** the posterior with the new data point

Over time, the bandit converges on the best action per context while still exploring alternatives.

## API

### `initAction(actionId, contextDim)`

Initialize an action with flat priors. Call once per action before first use.

```typescript
await bandit.initAction('tone-encouraging', 4) // 4-dimensional context
```

### `select(context, actionIds?)`

Select the best action. Optionally restrict to a subset of actions.

```typescript
const choice = await bandit.select(
  [1, 0, 0.5, 0.8],  // context vector
  ['a', 'b', 'c']     // optional: only consider these actions
)
```

### `update(actionId, context, reward)`

Update posterior after observing reward. Uses diagonal Bayesian linear regression.

```typescript
// Reward: 1.0 = great outcome, 0.0 = bad outcome
await bandit.update('tone-encouraging', [1, 0, 0.5, 0.8], 1.0)
```

## Storage

### BanditStorage Interface

Implement this to persist bandit parameters in your storage backend.

```typescript
import type { BanditStorage } from '@cognitive-engine/bandit'

class MyBanditStorage implements BanditStorage {
  async getParams(actionId: string): Promise<BanditParams | null> { ... }
  async saveParams(params: BanditParams): Promise<void> { ... }
  async listActionIds(): Promise<string[]> { ... }
}
```

### MemoryBanditStorage

In-memory implementation for testing. Data is lost on process exit.

```typescript
import { MemoryBanditStorage } from '@cognitive-engine/bandit'

const storage = new MemoryBanditStorage()
storage.clear() // Reset all params
```

## Use Cases

- **Response style** — learn which tone (warm, direct, playful) works best per user intent
- **Notification timing** — learn optimal send times per user behavior pattern
- **Content selection** — learn which insight types drive the most engagement
- **Feature gating** — gradually roll out features to users most likely to engage
