import type {
  Store,
  RapportState,
  Percept,
  SocialModelConfig,
} from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'
import type { ResolvedRapportConfig } from './types.js'

const COLLECTION = 'rapport'

const FAMILIARITY_BOOST = 0.02
const COMFORT_SMOOTHING_RETAIN = 0.9
const COMFORT_SMOOTHING_NEW = 0.1
const ENGAGEMENT_SMOOTHING_RETAIN = 0.7
const ENGAGEMENT_SMOOTHING_NEW = 0.3

const RAPPORT_WEIGHT_TRUST = 0.35
const RAPPORT_WEIGHT_FAMILIARITY = 0.2
const RAPPORT_WEIGHT_COMFORT = 0.2
const RAPPORT_WEIGHT_ENGAGEMENT = 0.25

const INITIAL_FAMILIARITY = 0.1
const INITIAL_COMFORT = 0.3

const ENGAGEMENT_BASE = 0.3
const ENGAGEMENT_LONG_MSG_BOOST = 0.2
const ENGAGEMENT_MEDIUM_MSG_BOOST = 0.1
const ENGAGEMENT_EMOTIONAL_BOOST = 0.15
const ENGAGEMENT_DEEP_DIVE_BOOST = 0.2
const ENGAGEMENT_QUESTION_BOOST = 0.1
const MSG_LENGTH_LONG = 100
const MSG_LENGTH_MEDIUM = 50

const TRUST_HIGH_ENGAGEMENT_THRESHOLD = 0.6
const TRUST_HIGH_ENGAGEMENT_BOOST = 0.02
const TRUST_EMOTIONAL_BOOST = 0.01
const TRUST_DEEP_DIVE_BOOST = 0.02

const COMFORT_BASE = 0.5
const COMFORT_LOW_URGENCY_THRESHOLD = 0.3
const COMFORT_HIGH_URGENCY_THRESHOLD = 0.7
const COMFORT_URGENCY_DELTA = 0.2
const COMFORT_EXPLORATION_BOOST = 0.1
const COMFORT_DEEP_DIVE_BOOST = 0.15

const DEFAULT_CONFIG: ResolvedRapportConfig = {
  initialTrust: 0.3,
  trustIncrement: 0.05,
}

/**
 * Tracks rapport (trust, familiarity, comfort, engagement) between
 * the agent and each user.
 *
 * Rapport grows naturally through positive interactions and
 * declines from negative signals.
 */
export class RapportTracker {
  private readonly store: Store
  private readonly config: ResolvedRapportConfig

  constructor(store: Store, config: SocialModelConfig = {}) {
    this.store = store
    this.config = {
      initialTrust: config.initialTrust ?? DEFAULT_CONFIG.initialTrust,
      trustIncrement:
        config.trustIncrement ?? DEFAULT_CONFIG.trustIncrement,
    }
  }

  /** Update rapport based on interaction signals. */
  async update(
    userId: string,
    percept: Percept,
    messageLength: number,
  ): Promise<RapportState> {
    const existing = await this.getState(userId)
    const now = new Date()

    const state = existing
      ? this.evolveState(existing, percept, messageLength, now)
      : this.createInitialState(userId, percept, messageLength, now)

    await this.store.set(COLLECTION, userId, state)
    return state
  }

  /** Get current rapport state. */
  async getState(userId: string): Promise<RapportState | null> {
    return this.store.get<RapportState>(COLLECTION, userId)
  }

  // ── Private ──

  private createInitialState(
    userId: string,
    percept: Percept,
    messageLength: number,
    now: Date,
  ): RapportState {
    return {
      id: uid('rap'),
      userId,
      trust: this.config.initialTrust,
      familiarity: INITIAL_FAMILIARITY,
      comfort: INITIAL_COMFORT,
      engagement: this.estimateEngagement(percept, messageLength),
      overallRapport: this.config.initialTrust,
      conversationCount: 1,
      lastInteraction: now,
      createdAt: now,
      updatedAt: now,
    }
  }

  private evolveState(
    existing: RapportState,
    percept: Percept,
    messageLength: number,
    now: Date,
  ): RapportState {
    const engagement = this.estimateEngagement(percept, messageLength)
    const trustDelta = this.calculateTrustDelta(percept, engagement)

    const newTrust = clamp(existing.trust + trustDelta, 0, 1)
    const newFamiliarity = clamp(existing.familiarity + FAMILIARITY_BOOST, 0, 1)
    const newComfort = clamp(
      existing.comfort * COMFORT_SMOOTHING_RETAIN +
        this.estimateComfort(percept) * COMFORT_SMOOTHING_NEW,
      0,
      1,
    )
    const newEngagement = clamp(
      existing.engagement * ENGAGEMENT_SMOOTHING_RETAIN +
        engagement * ENGAGEMENT_SMOOTHING_NEW,
      0,
      1,
    )

    const overallRapport = this.calculateOverallRapport(
      newTrust,
      newFamiliarity,
      newComfort,
      newEngagement,
    )

    return {
      ...existing,
      trust: newTrust,
      familiarity: newFamiliarity,
      comfort: newComfort,
      engagement: newEngagement,
      overallRapport,
      conversationCount: existing.conversationCount + 1,
      lastInteraction: now,
      updatedAt: now,
    }
  }

  private calculateOverallRapport(
    trust: number,
    familiarity: number,
    comfort: number,
    engagement: number,
  ): number {
    return (
      trust * RAPPORT_WEIGHT_TRUST +
      familiarity * RAPPORT_WEIGHT_FAMILIARITY +
      comfort * RAPPORT_WEIGHT_COMFORT +
      engagement * RAPPORT_WEIGHT_ENGAGEMENT
    )
  }

  private estimateEngagement(
    percept: Percept,
    messageLength: number,
  ): number {
    let score = ENGAGEMENT_BASE

    if (messageLength > MSG_LENGTH_LONG) score += ENGAGEMENT_LONG_MSG_BOOST
    else if (messageLength > MSG_LENGTH_MEDIUM) score += ENGAGEMENT_MEDIUM_MSG_BOOST

    if (percept.emotionalTone !== 'neutral') score += ENGAGEMENT_EMOTIONAL_BOOST
    if (percept.conversationPhase === 'deep_dive') score += ENGAGEMENT_DEEP_DIVE_BOOST
    if (percept.requestType === 'question') score += ENGAGEMENT_QUESTION_BOOST

    return clamp(score, 0, 1)
  }

  private calculateTrustDelta(
    percept: Percept,
    engagement: number,
  ): number {
    let delta = this.config.trustIncrement

    if (engagement > TRUST_HIGH_ENGAGEMENT_THRESHOLD) delta += TRUST_HIGH_ENGAGEMENT_BOOST
    if (percept.emotionalTone !== 'neutral') delta += TRUST_EMOTIONAL_BOOST
    if (percept.conversationPhase === 'deep_dive') delta += TRUST_DEEP_DIVE_BOOST

    return delta
  }

  private estimateComfort(percept: Percept): number {
    let comfort = COMFORT_BASE

    if (percept.urgency < COMFORT_LOW_URGENCY_THRESHOLD) comfort += COMFORT_URGENCY_DELTA
    if (percept.urgency > COMFORT_HIGH_URGENCY_THRESHOLD) comfort -= COMFORT_URGENCY_DELTA

    if (percept.conversationPhase === 'exploration') comfort += COMFORT_EXPLORATION_BOOST
    if (percept.conversationPhase === 'deep_dive') comfort += COMFORT_DEEP_DIVE_BOOST

    return clamp(comfort, 0, 1)
  }
}
