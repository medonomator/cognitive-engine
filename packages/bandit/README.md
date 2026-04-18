# @cognitive-engine/bandit

[![npm](https://img.shields.io/npm/v/@cognitive-engine/bandit)](https://www.npmjs.com/package/@cognitive-engine/bandit)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)

Contextual Thompson Sampling bandit for [cognitive-engine](https://github.com/medonomator/cognitive-engine). Learns what works per user, per context — adapts over time without explicit rules.

## Install

```bash
npm install @cognitive-engine/bandit
```

## How It Works

Thompson Sampling is a Bayesian approach to the multi-armed bandit problem. Instead of hardcoding rules ("if frustrated, use empathy"), the bandit **learns** from feedback which strategies work in which contexts.

Each arm (strategy) maintains a posterior distribution. On each selection, the bandit:
1. Samples from each arm's posterior
2. Picks the arm with the highest sample
3. Observes the reward
4. Updates the posterior

Over time, it converges on the best strategy per context with **provable regret bounds**.

## Usage

```typescript
import { ThompsonBandit, MemoryBanditStorage } from '@cognitive-engine/bandit'

const bandit = new ThompsonBandit(new MemoryBanditStorage())

// Context vector encodes the current situation
// (e.g., emotional state, topic, time of day)
const context = [0.8, -0.3, 0.5, 0.1]

// Available strategies
const arms = ['empathetic', 'direct', 'curious', 'actionable']

// Select the best strategy for this context
const choice = await bandit.select(context, arms)
console.log(choice.action)         // 'empathetic'
console.log(choice.expectedReward) // 0.73

// After observing user reaction, update
await bandit.update(choice.action, context, 1.0)  // reward = 1.0 (positive)

// Next time in a similar context, 'empathetic' will be preferred
```

### Persistent Storage

```typescript
import { ThompsonBandit, BanditStorage } from '@cognitive-engine/bandit'

// Implement for any backend
class PostgresBanditStorage implements BanditStorage {
  async load(key: string) { /* SELECT ... */ }
  async save(key: string, data: unknown) { /* UPSERT ... */ }
}

const bandit = new ThompsonBandit(new PostgresBanditStorage())
// Bandit state persists across sessions — it remembers what works
```

## Why Not Simple Rules?

| Approach | Problem |
|----------|---------|
| If-else rules | Doesn't scale, misses nuance, requires manual tuning |
| A/B testing | Requires large sample, doesn't personalize |
| Reinforcement learning | Needs environment model, slow to converge |
| **Thompson Sampling** | Contextual, fast convergence, regret bounds, zero infrastructure |

## License

[Apache-2.0](https://github.com/medonomator/cognitive-engine/blob/main/LICENSE)
