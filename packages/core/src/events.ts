import type {
  Percept,
  Belief,
  Episode,
  BehaviorPattern,
  FuturePrediction,
  Reflection,
  OpenLoop,
} from './types.js'

// ═══════════════════════════════════════════
// Event system for extensibility
// ═══════════════════════════════════════════

export interface CognitiveEventMap {
  'perception:complete': Percept
  'belief:added': Belief
  'belief:updated': { current: Belief; previous: Belief }
  'episode:created': Episode
  'episode:decayed': Episode
  'pattern:detected': BehaviorPattern
  'prediction:created': FuturePrediction
  'prediction:resolved': { prediction: FuturePrediction; correct: boolean }
  'bandit:choice': { actionId: string; category: string; wasExploration: boolean }
  'bandit:reward': { actionId: string; reward: number }
  'mind:reflection': Reflection
  'mind:openLoop': OpenLoop
}

type EventHandler<T> = (data: T) => void

export class CognitiveEventEmitter {
  private handlers = new Map<string, Set<EventHandler<unknown>>>()

  on<K extends keyof CognitiveEventMap>(
    event: K,
    handler: EventHandler<CognitiveEventMap[K]>,
  ): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>)
  }

  off<K extends keyof CognitiveEventMap>(
    event: K,
    handler: EventHandler<CognitiveEventMap[K]>,
  ): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>)
  }

  emit<K extends keyof CognitiveEventMap>(
    event: K,
    data: CognitiveEventMap[K],
  ): void {
    const set = this.handlers.get(event)
    if (set) {
      for (const handler of set) {
        try {
          handler(data)
        } catch {
          // Event handlers should not throw — swallow silently
        }
      }
    }
  }

  removeAllListeners(event?: keyof CognitiveEventMap): void {
    if (event) {
      this.handlers.delete(event)
    } else {
      this.handlers.clear()
    }
  }
}
