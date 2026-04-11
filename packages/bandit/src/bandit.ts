import type { BanditChoice, BanditParams, BanditConfig } from '@cognitive-engine/core'
import { sampleDiagonalMVN, dotProduct } from '@cognitive-engine/math'

const DEFAULT_EXPLORATION_RATE = 0.1
const DEFAULT_NOISE_VARIANCE = 1.0
const DEFAULT_INITIAL_VARIANCE = 1000

export interface BanditStorage {
  /** Load params for an action. Returns null if not found. */
  getParams(actionId: string): Promise<BanditParams | null>
  /** Save/update params for an action. */
  saveParams(params: BanditParams): Promise<void>
  /** List all known action IDs. */
  listActionIds(): Promise<string[]>
}

/**
 * Contextual Thompson Sampling bandit with diagonal covariance.
 *
 * Uses Bayesian linear regression with diagonal approximation:
 * - O(n) per selection and update (vs O(n³) with full covariance)
 * - Ideal for high-dimensional contexts (embeddings + features)
 */
export class ThompsonBandit {
  private readonly explorationRate: number
  private readonly noiseVariance: number
  private readonly initialVariance: number
  private readonly storage: BanditStorage

  constructor(storage: BanditStorage, config: BanditConfig = {}) {
    this.storage = storage
    this.explorationRate = config.explorationRate ?? DEFAULT_EXPLORATION_RATE
    this.noiseVariance = config.noiseVariance ?? DEFAULT_NOISE_VARIANCE
    this.initialVariance = config.initialVariance ?? DEFAULT_INITIAL_VARIANCE
  }

  /**
   * Select the best action given a context vector.
   *
   * @param context - Feature vector (e.g., user embedding + context features)
   * @param actionIds - Available actions to choose from. If empty, uses all known actions.
   */
  async select(
    context: number[],
    actionIds?: string[],
  ): Promise<BanditChoice> {
    const ids = actionIds ?? await this.storage.listActionIds()
    if (ids.length === 0) {
      throw new Error('No actions available for bandit selection')
    }

    // Epsilon-greedy exploration
    if (Math.random() < this.explorationRate) {
      const randomId = ids[Math.floor(Math.random() * ids.length)]!
      return {
        actionId: randomId,
        expectedReward: 0,
        wasExploration: true,
      }
    }

    // Thompson Sampling: sample from posterior and pick best
    let bestAction = ids[0]!
    let bestScore = -Infinity

    for (const actionId of ids) {
      const params = await this.storage.getParams(actionId)
      const { mu, sigma } = params ?? this.initParams(context.length)

      // Sample θ ~ N(μ, diag(σ²))
      const theta = sampleDiagonalMVN(mu, sigma)
      // Expected reward = context · θ
      const score = dotProduct(context, theta)

      if (score > bestScore) {
        bestScore = score
        bestAction = actionId
      }
    }

    return {
      actionId: bestAction,
      expectedReward: bestScore,
      wasExploration: false,
    }
  }

  /**
   * Update posterior after observing a reward.
   *
   * Diagonal Bayesian update for linear regression:
   *   precision_new[i] = precision[i] + x[i]² / σ²_noise
   *   σ_new[i] = 1 / precision_new[i]
   *   μ_new[i] = σ_new[i] * (μ[i] / σ[i] + x[i] * reward / σ²_noise)
   */
  async update(
    actionId: string,
    context: number[],
    reward: number,
  ): Promise<void> {
    const params = await this.storage.getParams(actionId)
    const { mu, sigma } = params ?? this.initParams(context.length)

    const dim = Math.min(mu.length, context.length)
    const muNew: number[] = new Array(mu.length) as number[]
    const sigmaNew: number[] = new Array(sigma.length) as number[]

    for (let i = 0; i < dim; i++) {
      const oldSigma = Math.max(sigma[i] ?? 1, 1e-9)
      const oldPrecision = 1 / oldSigma
      const xi = context[i] ?? 0

      const newPrecision = oldPrecision + (xi * xi) / this.noiseVariance
      const newSigma = 1 / newPrecision

      muNew[i] = newSigma * ((mu[i] ?? 0) * oldPrecision + (xi * reward) / this.noiseVariance)
      sigmaNew[i] = newSigma
    }

    // Dimensions beyond context keep their current values
    for (let i = dim; i < mu.length; i++) {
      muNew[i] = mu[i] ?? 0
      sigmaNew[i] = sigma[i] ?? this.initialVariance
    }

    await this.storage.saveParams({
      actionId,
      mu: muNew,
      sigma: sigmaNew,
      updatedAt: new Date(),
    })
  }

  /**
   * Initialize an action with flat priors.
   */
  async initAction(actionId: string, contextDim: number): Promise<void> {
    const { mu, sigma } = this.initParams(contextDim)
    await this.storage.saveParams({
      actionId,
      mu,
      sigma,
      updatedAt: new Date(),
    })
  }

  private initParams(dim: number): { mu: number[]; sigma: number[] } {
    return {
      mu: new Array(dim).fill(0) as number[],
      sigma: new Array(dim).fill(this.initialVariance) as number[],
    }
  }
}
