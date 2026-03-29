import { Model } from '@nozbe/watermelondb'
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators'

export class Incident extends Model {
  static table = 'incidents'

  @field('server_id') serverId!: string
  @field('source_type') sourceType!: 'text' | 'image' | 'umap'
  @field('event_type') eventType!: string
  @field('radius_m') radiusM!: number
  @field('severity') severity!: number
  @field('confidence') confidence!: number
  @field('freshness_decay_hours') freshnessDecayHours!: number
  @field('source_weight') sourceWeight!: number
  @field('raw_report_id') rawReportId?: string

  @json('location', (raw: any) => raw) location!: { lat: number; lng: number }
  @json('affected_infrastructure', (raw: any) => raw) affectedInfrastructure!: string[]

  @readonly @date('expires_at') expiresAt!: Date
  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  // Relations - using string-based to avoid circular imports
  // @relation('raw_reports', 'raw_report_id') rawReport?: any

  // Helper methods
  get isExpired() {
    return new Date() > this.expiresAt
  }

  get freshness() {
    const hoursSinceReport = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60)
    return Math.exp(-0.1 * hoursSinceReport)
  }

  get effectiveSeverity() {
    return this.severity * this.confidence * this.freshness * this.sourceWeight
  }

  get isHighConfidence() {
    return this.confidence > 0.8
  }
}