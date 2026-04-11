import type { WorkingMemoryItem, Percept } from '@cognitive-engine/core'

const DEFAULT_MAX_ITEMS = 50
const RELEVANCE_CURRENT = 10
const RELEVANCE_RECENT = 6

/**
 * Short-term working memory that holds the current focus.
 * Items are sorted by relevance, oldest get evicted.
 */
export class WorkingMemory {
  private items: WorkingMemoryItem[] = []
  private readonly maxItems: number

  constructor(maxItems = DEFAULT_MAX_ITEMS) {
    this.maxItems = maxItems
  }

  /** Get current working memory contents. */
  getItems(): WorkingMemoryItem[] {
    return this.items.slice()
  }

  /** Update working memory from a new percept. */
  update(percept: Percept): WorkingMemoryItem[] {
    const now = new Date()
    const newItems: WorkingMemoryItem[] = []

    // Add current message
    newItems.push({
      content: percept.rawText,
      type: 'context',
      relevance: RELEVANCE_CURRENT,
      timestamp: now,
    })

    // Add entities as facts
    for (const entity of percept.entities) {
      newItems.push({
        content: `${entity.type}: ${entity.value}`,
        type: 'fact',
        relevance: entity.confidence * RELEVANCE_CURRENT,
        timestamp: now,
      })
    }

    // Add implicit needs as hypotheses
    for (const need of percept.implicitNeeds) {
      newItems.push({
        content: need,
        type: 'hypothesis',
        relevance: RELEVANCE_RECENT,
        timestamp: now,
      })
    }

    // Merge, sort by relevance, keep top N
    this.items = [...this.items, ...newItems]
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, this.maxItems)

    return this.items
  }

  /** Add a specific item. */
  add(item: WorkingMemoryItem): void {
    this.items.push(item)
    this.items.sort((a, b) => b.relevance - a.relevance)
    if (this.items.length > this.maxItems) {
      this.items = this.items.slice(0, this.maxItems)
    }
  }

  /** Clear all items. */
  clear(): void {
    this.items = []
  }

  get size(): number {
    return this.items.length
  }
}
