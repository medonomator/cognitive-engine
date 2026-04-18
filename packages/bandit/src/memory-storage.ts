import type { BanditParams } from '@cognitive-engine/core'
import type { BanditStorage } from './bandit.js'

/**
 * In-memory BanditStorage for testing and prototyping.
 */
export class MemoryBanditStorage implements BanditStorage {
  private readonly params = new Map<string, BanditParams>()

  async getParams(actionId: string): Promise<BanditParams | null> {
    return this.params.get(actionId) ?? null
  }

  async saveParams(params: BanditParams): Promise<void> {
    this.params.set(params.actionId, { ...params })
  }

  async listActionIds(): Promise<string[]> {
    return Array.from(this.params.keys())
  }

  clear(): void {
    this.params.clear()
  }
}
