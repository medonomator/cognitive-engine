# @cognitive-engine/bandit

Contextual Thompson Sampling bandit for adaptive personalization.

## Install

```bash
npm install @cognitive-engine/bandit
```

## Exports

### ThompsonBandit

Multi-armed bandit using Thompson Sampling to select the best strategy based on context and past rewards.

```typescript
import { ThompsonBandit } from '@cognitive-engine/bandit'

const bandit = new ThompsonBandit(storage, config)
const choice = await bandit.choose(arms, context)
await bandit.reward(choice.arm, rewardValue)
```

### BanditStorage

Interface for persisting bandit parameters.

```typescript
import type { BanditStorage } from '@cognitive-engine/bandit'
```

### MemoryBanditStorage

In-memory implementation of BanditStorage for testing.

```typescript
import { MemoryBanditStorage } from '@cognitive-engine/bandit'
```
