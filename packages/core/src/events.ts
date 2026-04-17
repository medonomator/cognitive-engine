import type {
  Percept,
  Belief,
  Episode,
  BehaviorPattern,
  FuturePrediction,
  Reflection,
  OpenLoop,
} from './types.js'
import { defaultErrorHandler } from './config.js'
import type { ErrorHandler } from './config.js'

export interface BeliefUpdateEvent {
  current: Belief
  previous: Belief
}

export interface PredictionResolvedEvent {
  prediction: FuturePrediction
  correct: boolean
}

export interface BanditChoiceEvent {
  actionId: string
  category: string
  wasExploration: boolean
}

export interface BanditRewardEvent {
  actionId: string
  reward: number
}

export interface CognitiveEventMap {
  'perception:complete': Percept
  'belief:added': Belief
  'belief:updated': BeliefUpdateEvent
  'episode:created': Episode
  'episode:decayed': Episode
  'pattern:detected': BehaviorPattern
  'prediction:created': FuturePrediction
  'prediction:resolved': PredictionResolvedEvent
  'bandit:choice': BanditChoiceEvent
  'bandit:reward': BanditRewardEvent
  'mind:reflection': Reflection
  'mind:openLoop': OpenLoop
}

type EventHandler<T> = (data: T) => void

export class CognitiveEventEmitter {
  private handlers = new Map<string, Set<EventHandler<unknown>>>()
  private readonly onError: ErrorHandler

  constructor(onError?: ErrorHandler) {
    this.onError = onError ?? defaultErrorHandler
  }

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
        } catch (error: unknown) {
          this.onError(error, `event.${String(event)}`)
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
