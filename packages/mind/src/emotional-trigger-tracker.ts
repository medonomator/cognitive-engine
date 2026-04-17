import type {
  Store,
  EmotionalTrigger,
  Percept,
} from '@cognitive-engine/core'
import { uid } from '@cognitive-engine/core'
import { clamp } from '@cognitive-engine/math'

const COLLECTION = 'emotional_triggers'
const INTENSITY_SMOOTHING = 0.3

/**
 * Tracks recurring emotional triggers - topics or situations that
 * consistently evoke strong emotions in the user.
 *
 * Does NOT use LLM - works from perception data already extracted.
 */
export class EmotionalTriggerTracker {
  constructor(private readonly store: Store) {}

  /** Update triggers based on a percept. */
  async track(userId: string, percept: Percept): Promise<EmotionalTrigger[]> {
    if (
      percept.emotionalTone === 'neutral' ||
      percept.confidence < 0.5
    ) {
      return []
    }

    const updated: EmotionalTrigger[] = []

    for (const entity of percept.entities) {
      if (entity.confidence < 0.5) continue

      const existing = await this.findTrigger(
        userId,
        entity.value,
        percept.emotionalTone,
      )
      const now = new Date()

      if (existing) {
        // Update existing trigger
        const newIntensity =
          existing.intensity * (1 - INTENSITY_SMOOTHING) +
          percept.urgency * INTENSITY_SMOOTHING

        const trigger: EmotionalTrigger = {
          ...existing,
          intensity: clamp(newIntensity, 0, 1),
          occurrenceCount: existing.occurrenceCount + 1,
          lastTriggered: now,
        }
        await this.store.set(COLLECTION, existing.id, trigger)
        updated.push(trigger)
      } else {
        // New trigger
        const trigger: EmotionalTrigger = {
          id: uid('trig'),
          userId,
          trigger: entity.value,
          category: entity.type,
          emotion: percept.emotionalTone,
          intensity: clamp(percept.urgency, 0, 1),
          occurrenceCount: 1,
          lastTriggered: now,
          createdAt: now,
        }
        await this.store.set(COLLECTION, trigger.id, trigger)
        updated.push(trigger)
      }
    }

    return updated
  }

  /** Get all emotional triggers for a user, sorted by occurrence count. */
  async getAll(userId: string): Promise<EmotionalTrigger[]> {
    const all = await this.store.find<EmotionalTrigger>(COLLECTION, {
      where: { userId },
    })

    all.sort((a, b) => b.occurrenceCount - a.occurrenceCount)
    return all
  }

  /** Get triggers that are particularly strong (high intensity + frequent). */
  async getStrong(
    userId: string,
    minOccurrences: number = 2,
    minIntensity: number = 0.5,
  ): Promise<EmotionalTrigger[]> {
    const all = await this.getAll(userId)

    return all.filter(
      (t) =>
        t.occurrenceCount >= minOccurrences && t.intensity >= minIntensity,
    )
  }

  /** Get triggers for a specific emotion. */
  async getByEmotion(
    userId: string,
    emotion: string,
  ): Promise<EmotionalTrigger[]> {
    const all = await this.store.find<EmotionalTrigger>(COLLECTION, {
      where: { userId },
    })

    return all.filter(
      (t) => t.emotion.toLowerCase() === emotion.toLowerCase(),
    )
  }

  private async findTrigger(
    userId: string,
    trigger: string,
    emotion: string,
  ): Promise<EmotionalTrigger | null> {
    const all = await this.store.find<EmotionalTrigger>(COLLECTION, {
      where: { userId },
    })

    const t = trigger.toLowerCase()
    const e = emotion.toLowerCase()

    return (
      all.find(
        (item) =>
          item.trigger.toLowerCase() === t &&
          item.emotion.toLowerCase() === e,
      ) ?? null
    )
  }
}
