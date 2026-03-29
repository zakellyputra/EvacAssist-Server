import { Model } from '@nozbe/watermelondb'
import { field, readonly, date } from '@nozbe/watermelondb/decorators'

export class RoadSegment extends Model {
  static table = 'road_segments'

  @field('server_id') serverId!: string
  @field('osm_way_id') osmWayId!: string
  @field('start_node') startNode!: string
  @field('end_node') endNode!: string
  @field('geometry') geometry!: string // GeoJSON LineString as string
  @field('distance_m') distanceM!: number
  @field('travel_time_s') travelTimeS!: number
  @field('road_type') roadType!: string // motorway, primary, secondary, residential, path
  @field('base_cost') baseCost!: number

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  // Relations - using string-based to avoid circular imports
  // @children('edge_risks', 'segment_id') edgeRisks!: any[]

  // Helper methods
  get geometryParsed() {
    return JSON.parse(this.geometry)
  }

  get currentRisk() {
    // This would need to be implemented with a query
    return null
  }
}