import { Model } from '@nozbe/watermelondb'
import { field, readonly, date } from '@nozbe/watermelondb/decorators'

export class RiskZone extends Model {
  static table = 'risk_zones'

  @field('server_id') serverId!: string
  @field('name') name!: string
  @field('geometry') geometry!: string // GeoJSON Polygon as string
  @field('risk_level') riskLevel!: string // critical, high, moderate, low
  @field('source') source!: string // gdacs, hdx_acled, manual

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  // Helper methods
  get geometryParsed() {
    return JSON.parse(this.geometry)
  }
}