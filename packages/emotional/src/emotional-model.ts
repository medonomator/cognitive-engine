import type {
  Store,
  Percept,
  EmotionalState,
  EmotionSnapshot,
  EmotionalContext,
  EmotionalModelConfig,
} from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import type { ResolvedEmotionalConfig } from './types.js'

const COLLECTION = 'emotional_states'

const DEFAULT_CONFIG: ResolvedEmotionalConfig = {
  maxHistory: 20,
  smoothingFactor: 0.3,
  volatilityThreshold: 0.5,
}

/**
 * Emotion-to-VAD (Valence-Arousal-Dominance) mapping.
 * Based on Russell's circumplex model + Mehrabian's PAD.
 */
const EMOTION_VAD: Record<string, { valence: number; arousal: number; dominance: number }> = {
  happy: { valence: 0.8, arousal: 0.5, dominance: 0.6 },
  excited: { valence: 0.7, arousal: 0.9, dominance: 0.6 },
  content: { valence: 0.7, arousal: 0.2, dominance: 0.5 },
  calm: { valence: 0.5, arousal: 0.1, dominance: 0.5 },
  grateful: { valence: 0.8, arousal: 0.3, dominance: 0.4 },
  proud: { valence: 0.7, arousal: 0.5, dominance: 0.8 },
  hopeful: { valence: 0.6, arousal: 0.4, dominance: 0.5 },
  amused: { valence: 0.7, arousal: 0.6, dominance: 0.5 },
  loving: { valence: 0.9, arousal: 0.4, dominance: 0.4 },
  neutral: { valence: 0.0, arousal: 0.2, dominance: 0.5 },
  sad: { valence: -0.7, arousal: 0.2, dominance: 0.2 },
  anxious: { valence: -0.5, arousal: 0.8, dominance: 0.2 },
  stressed: { valence: -0.6, arousal: 0.7, dominance: 0.3 },
  angry: { valence: -0.6, arousal: 0.8, dominance: 0.7 },
  frustrated: { valence: -0.5, arousal: 0.6, dominance: 0.4 },
  fearful: { valence: -0.7, arousal: 0.8, dominance: 0.1 },
  disappointed: { valence: -0.5, arousal: 0.3, dominance: 0.3 },
  lonely: { valence: -0.6, arousal: 0.2, dominance: 0.2 },
  bored: { valence: -0.3, arousal: 0.1, dominance: 0.3 },
  confused: { valence: -0.3, arousal: 0.5, dominance: 0.2 },
  overwhelmed: { valence: -0.6, arousal: 0.8, dominance: 0.1 },
  guilty: { valence: -0.6, arousal: 0.4, dominance: 0.2 },
  ashamed: { valence: -0.7, arousal: 0.4, dominance: 0.1 },
  jealous: { valence: -0.5, arousal: 0.6, dominance: 0.3 },
  nostalgic: { valence: 0.2, arousal: 0.3, dominance: 0.3 },
  surprised: { valence: 0.1, arousal: 0.8, dominance: 0.3 },
}

const DEFAULT_VAD = { valence: 0.0, arousal: 0.3, dominance: 0.5 }

const TREND_THRESHOLD = 0.15
const TREND_MIN_HISTORY = 3
const VOLATILITY_WINDOW = 10
const RECENT_TRAJECTORY_SIZE = 5
const DOMINANT_EMOTION_WINDOW = 5

/**
 * Tracks the user's emotional state over time using a VAD
 * (Valence-Arousal-Dominance) model.
 *
 * Features:
 * - Maps emotions to VAD coordinates
 * - Smooth state transitions (EMA)
 * - Trend detection (improving/stable/declining)
 * - Volatility measurement
 * - Emotion history tracking
 */
export class EmotionalModel {
  private readonly store: Store
  private readonly config: ResolvedEmotionalConfig

  constructor(store: Store, config: EmotionalModelConfig = {}) {
    this.store = store
    this.config = {
      maxHistory: config.maxHistory ?? DEFAULT_CONFIG.maxHistory,
      smoothingFactor:
        config.smoothingFactor ?? DEFAULT_CONFIG.smoothingFactor,
      volatilityThreshold:
        config.volatilityThreshold ?? DEFAULT_CONFIG.volatilityThreshold,
    }
  }

  /** Update emotional state from a percept. */
  async update(userId: string, percept: Percept): Promise<EmotionalState> {
    const existing = await this.getState(userId)
    const now = new Date()

    const vad = this.emotionToVAD(percept.emotionalTone)
    const intensity = percept.urgency

    const snapshot: EmotionSnapshot = {
      emotion: percept.emotionalTone,
      valence: vad.valence,
      arousal: vad.arousal,
      intensity,
      timestamp: now,
    }

    const state = existing
      ? this.evolveState(existing, percept.emotionalTone, vad, intensity, snapshot, now)
      : this.createInitialState(userId, percept.emotionalTone, vad, intensity, snapshot, now)

    await this.store.set(COLLECTION, userId, state)
    return state
  }

  /** Get current emotional state. */
  async getState(userId: string): Promise<EmotionalState | null> {
    return this.store.get<EmotionalState>(COLLECTION, userId)
  }

  /** Build emotional context for the reasoning layer. */
  async getContext(userId: string): Promise<EmotionalContext> {
    const state = await this.getState(userId)

    if (!state) {
      return {
        currentState: null,
        recentTrajectory: [],
        dominantEmotion: 'neutral',
        volatility: 0,
        formattedContext: '',
      }
    }

    const recentTrajectory = state.history.slice(-RECENT_TRAJECTORY_SIZE)
    const volatility = this.calculateVolatility(state.history)
    const dominantEmotion = this.findDominantEmotion(state.history)

    const formattedContext = this.formatContext(
      state,
      volatility,
      dominantEmotion,
    )

    return {
      currentState: state,
      recentTrajectory,
      dominantEmotion,
      volatility,
      formattedContext,
    }
  }

  /** Map an emotion label to VAD coordinates. */
  emotionToVAD(emotion: string): {
    valence: number
    arousal: number
    dominance: number
  } {
    return EMOTION_VAD[emotion.toLowerCase()] ?? DEFAULT_VAD
  }

  // ── Private ──

  private createInitialState(
    userId: string,
    emotion: string,
    vad: { valence: number; arousal: number; dominance: number },
    intensity: number,
    snapshot: EmotionSnapshot,
    now: Date,
  ): EmotionalState {
    return {
      id: uid('emo'),
      userId,
      currentEmotion: emotion,
      valence: vad.valence,
      arousal: vad.arousal,
      dominance: vad.dominance,
      intensity,
      trend: 'stable',
      history: [snapshot],
      updatedAt: now,
    }
  }

  private evolveState(
    existing: EmotionalState,
    emotion: string,
    vad: { valence: number; arousal: number; dominance: number },
    intensity: number,
    snapshot: EmotionSnapshot,
    now: Date,
  ): EmotionalState {
    const alpha = this.config.smoothingFactor
    const history = [...existing.history, snapshot].slice(
      -this.config.maxHistory,
    )

    return {
      ...existing,
      currentEmotion: emotion,
      valence: this.ema(existing.valence, vad.valence, alpha),
      arousal: this.ema(existing.arousal, vad.arousal, alpha),
      dominance: this.ema(existing.dominance, vad.dominance, alpha),
      intensity: this.ema(existing.intensity, intensity, alpha),
      trend: this.detectTrend(history),
      history,
      updatedAt: now,
    }
  }

  private ema(previous: number, current: number, alpha: number): number {
    return previous * (1 - alpha) + current * alpha
  }

  private detectTrend(
    history: EmotionSnapshot[],
  ): EmotionalState['trend'] {
    if (history.length < TREND_MIN_HISTORY) return 'stable'

    const recent = history.slice(-TREND_MIN_HISTORY)
    const valences = recent.map((s) => s.valence)

    const firstAvg = (valences[0]! + valences[1]!) / 2
    const lastVal = valences[2]!

    const diff = lastVal - firstAvg
    if (diff > TREND_THRESHOLD) return 'improving'
    if (diff < -TREND_THRESHOLD) return 'declining'
    return 'stable'
  }

  private calculateVolatility(history: EmotionSnapshot[]): number {
    if (history.length < 2) return 0

    const recent = history.slice(-VOLATILITY_WINDOW)
    let totalDiff = 0

    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1]!
      const curr = recent[i]!
      totalDiff += Math.abs(curr.valence - prev.valence)
    }

    return totalDiff / (recent.length - 1)
  }

  private findDominantEmotion(history: EmotionSnapshot[]): string {
    if (history.length === 0) return 'neutral'

    const recent = history.slice(-DOMINANT_EMOTION_WINDOW)
    const counts = new Map<string, number>()

    for (const s of recent) {
      counts.set(s.emotion, (counts.get(s.emotion) ?? 0) + 1)
    }

    let dominant = 'neutral'
    let maxCount = 0

    for (const [emotion, count] of counts) {
      if (count > maxCount) {
        maxCount = count
        dominant = emotion
      }
    }

    return dominant
  }

  private formatContext(
    state: EmotionalState,
    volatility: number,
    dominantEmotion: string,
  ): string {
    const lines: string[] = ['Emotional state:']
    lines.push(
      `  Current: ${state.currentEmotion} (valence: ${state.valence.toFixed(2)}, arousal: ${state.arousal.toFixed(2)})`,
    )
    lines.push(`  Trend: ${state.trend}`)
    lines.push(`  Dominant recently: ${dominantEmotion}`)

    if (volatility > this.config.volatilityThreshold) {
      lines.push('  ⚠ High emotional volatility detected')
    }

    return lines.join('\n')
  }
}
