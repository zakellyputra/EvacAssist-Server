import { Model } from '@nozbe/watermelondb'
import { field, readonly, date } from '@nozbe/watermelondb/decorators'

export class SyncQueue extends Model {
  static table = 'sync_queue'

  @field('server_id') serverId!: string
  @field('device_id') deviceId!: string
  @field('operation') operation!: string // create, update, delete
  @field('collection') collection!: string
  @field('document') document!: string // JSON string of document data

  @readonly @date('queued_at') queuedAt!: Date
  @date('synced_at') syncedAt?: Date
  @field('retry_count') retryCount!: number
  @field('last_error') lastError?: string

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  // Helper methods
  get documentParsed() {
    try {
      return JSON.parse(this.document)
    } catch {
      return null
    }
  }

  get isSynced() {
    return this.syncedAt !== null
  }

  get shouldRetry() {
    return !this.isSynced && this.retryCount < 3
  }

  async markSynced() {
    await this.update(syncItem => {
      syncItem.syncedAt = new Date()
    })
  }

  async incrementRetry(error?: string) {
    await this.update(syncItem => {
      syncItem.retryCount = this.retryCount + 1
      if (error) syncItem.lastError = error
    })
  }
}