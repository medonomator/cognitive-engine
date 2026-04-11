// ═══════════════════════════════════════════
// Store — persistence abstraction
// ═══════════════════════════════════════════

export interface StoreFilter {
  where?: Record<string, unknown>
  orderBy?: Record<string, 'asc' | 'desc'>
  limit?: number
  offset?: number
}

export interface VectorSearchOptions {
  /** Number of results to return */
  topK: number
  /** Minimum similarity threshold (0-1). Default: 0.7 */
  threshold?: number
  /** Additional filter conditions */
  filter?: Record<string, unknown>
}

export interface VectorSearchResult {
  id: string
  similarity: number
  data: Record<string, unknown>
}

export interface Store {
  /** Get a single record by ID */
  get<T>(collection: string, id: string): Promise<T | null>

  /** Create or overwrite a record */
  set<T>(collection: string, id: string, data: T): Promise<void>

  /** Delete a record */
  delete(collection: string, id: string): Promise<void>

  /** Find records matching filter */
  find<T>(collection: string, filter: StoreFilter): Promise<T[]>

  /** Create or update a record */
  upsert<T>(collection: string, id: string, data: T): Promise<void>

  /**
   * Vector similarity search.
   * Optional capability — not all stores support this.
   * Use `supportsVectorSearch()` to check.
   */
  vectorSearch?(
    collection: string,
    vector: number[],
    options: VectorSearchOptions,
  ): Promise<VectorSearchResult[]>
}

/** Type guard: does this store support vector search? */
export function supportsVectorSearch(
  store: Store,
): store is Store & Required<Pick<Store, 'vectorSearch'>> {
  return typeof store.vectorSearch === 'function'
}
