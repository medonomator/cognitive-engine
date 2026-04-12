import type {
  Store,
  StoreFilter,
  VectorSearchOptions,
  VectorSearchResult,
} from '@cognitive-engine/core'
import { cosineSimilarity } from '@cognitive-engine/math'

interface StoredRecord {
  id: string
  data: Record<string, unknown>
  vector?: number[]
}

/**
 * In-memory Store implementation for testing and prototyping.
 * Supports vector search via brute-force cosine similarity.
 *
 * Data is lost when the process exits.
 */
export class MemoryStore implements Store {
  private collections = new Map<string, Map<string, StoredRecord>>()

  private getCollection(name: string): Map<string, StoredRecord> {
    let col = this.collections.get(name)
    if (!col) {
      col = new Map()
      this.collections.set(name, col)
    }
    return col
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const record = this.getCollection(collection).get(id)
    // Generic store returns untyped data — caller provides T based on their schema knowledge
    return record ? (record.data as T) : null
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    const col = this.getCollection(collection)
    const storeData = isRecord(data) ? data : { value: data }
    const record: StoredRecord = {
      id,
      data: storeData,
      vector: extractVector(data),
    }
    col.set(id, record)
  }

  async delete(collection: string, id: string): Promise<void> {
    this.getCollection(collection).delete(id)
  }

  async find<T>(collection: string, filter: StoreFilter): Promise<T[]> {
    const col = this.getCollection(collection)
    let results = Array.from(col.values())

    // Apply WHERE filters
    if (filter.where) {
      results = results.filter((record) =>
        matchesWhere(record.data, filter.where!),
      )
    }

    // Apply ORDER BY
    if (filter.orderBy) {
      const entries = Object.entries(filter.orderBy)
      if (entries.length > 0) {
        const [field, direction] = entries[0]!
        results.sort((a, b) => {
          const va = getNestedValue(a.data, field)
          const vb = getNestedValue(b.data, field)
          if (va === vb) return 0
          if (va === undefined || va === null) return 1
          if (vb === undefined || vb === null) return -1
          const cmp = va < vb ? -1 : 1
          return direction === 'desc' ? -cmp : cmp
        })
      }
    }

    // Apply OFFSET
    if (filter.offset) {
      results = results.slice(filter.offset)
    }

    // Apply LIMIT
    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit)
    }

    // Generic store returns untyped data — caller provides T based on their schema knowledge
    return results.map((r) => r.data as T)
  }

  async upsert<T>(collection: string, id: string, data: T): Promise<void> {
    await this.set(collection, id, data)
  }

  async vectorSearch(
    collection: string,
    vector: number[],
    options: VectorSearchOptions,
  ): Promise<VectorSearchResult[]> {
    const col = this.getCollection(collection)
    const threshold = options.threshold ?? 0.7
    const results: VectorSearchResult[] = []

    for (const record of col.values()) {
      if (!record.vector || record.vector.length === 0) continue

      // Apply additional filters
      if (options.filter && !matchesWhere(record.data, options.filter)) {
        continue
      }

      const similarity = cosineSimilarity(vector, record.vector)
      if (similarity >= threshold) {
        results.push({
          id: record.id,
          similarity,
          data: record.data,
        })
      }
    }

    results.sort((a, b) => b.similarity - a.similarity)
    return results.slice(0, options.topK)
  }

  /** Clear all data (useful in tests) */
  clear(): void {
    this.collections.clear()
  }

  /** Clear a specific collection */
  clearCollection(name: string): void {
    this.collections.delete(name)
  }

  /** Get total record count across all collections */
  get size(): number {
    let total = 0
    for (const col of this.collections.values()) {
      total += col.size
    }
    return total
  }
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function matchesWhere(
  data: Record<string, unknown>,
  where: Record<string, unknown>,
): boolean {
  for (const [key, expected] of Object.entries(where)) {
    const actual = getNestedValue(data, key)
    if (actual !== expected) return false
  }
  return true
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (!isRecord(current)) return undefined
    current = current[part]
  }
  return current
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'number')
}

function extractVector(data: unknown): number[] | undefined {
  if (!isRecord(data)) return undefined
  const embedding = data['embedding']
  if (isNumberArray(embedding)) return embedding
  const vector = data['vector']
  if (isNumberArray(vector)) return vector
  return undefined
}
