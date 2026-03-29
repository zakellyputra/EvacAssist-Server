import { Model } from '@nozbe/watermelondb'
import { field, readonly, date } from '@nozbe/watermelondb/decorators'

export class CachedTile extends Model {
  static table = 'cached_tiles'

  @field('tile_key') tileKey!: string // z/x/y format
  @field('tile_data') tileData!: string // base64 encoded tile data

  @readonly @date('cached_at') cachedAt!: Date
  @readonly @date('expires_at') expiresAt!: Date
  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  // Helper methods
  get isExpired() {
    return new Date() > this.expiresAt
  }

  get cacheAgeHours() {
    return (Date.now() - this.cachedAt.getTime()) / (1000 * 60 * 60)
  }

  // Parse tile coordinates from key
  get coordinates() {
    const [z, x, y] = this.tileKey.split('/').map(Number)
    return { z, x, y }
  }
}