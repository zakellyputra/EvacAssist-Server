import { Model } from '@nozbe/watermelondb'
import { field, readonly, date } from '@nozbe/watermelondb/decorators'

export class EdgeRisk extends Model {
  static table = 'edge_risks'

  @field('server_id') serverId!: string
  @field('segment_id') segmentId!: string
  @field('conflict_risk') conflictRisk!: number // [0, 1]
  @field('blockage_risk') blockageRisk!: number // [0, 1]
  @field('infra_risk') infraRisk!: number // [0, 1]
  @field('crowd_risk') crowdRisk!: number // [0, 1]
  @field('weather_risk') weatherRisk!: number // [0, 1]
  @field('uncertainty') uncertainty!: number // [0, 1]
  @field('confidence') confidence!: number // [0, 1]
  @field('is_hard_blocked') isHardBlocked!: boolean

  @readonly @date('last_updated') lastUpdated!: Date
  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  // Relations - using string-based to avoid circular imports
  // @relation('road_segments', 'segment_id') roadSegment!: any

  // Computed properties
  get riskMultiplier() {
    if (this.isHardBlocked) return Infinity

    return (
      0.35 * this.conflictRisk +
      0.25 * this.blockageRisk +
      0.20 * this.infraRisk +
      0.10 * this.crowdRisk +
      0.05 * this.weatherRisk +
      0.05 * this.uncertainty
    )
  }

  get effectiveCost() {
    // This would need the road segment base cost
    return this.riskMultiplier
  }

  get isStale() {
    const hoursSinceUpdate = (Date.now() - this.lastUpdated.getTime()) / (1000 * 60 * 60)
    return hoursSinceUpdate > 24 // Consider stale after 24 hours
  }
}