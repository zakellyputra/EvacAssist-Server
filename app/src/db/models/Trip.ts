import { Model } from '@nozbe/watermelondb'
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators'

export class Trip extends Model {
  static table = 'trips'

  @field('server_id') serverId!: string
  @field('rider_id') riderId!: string
  @field('driver_id') driverId?: string
  @field('status') status!: string // pending, accepted, in_progress, completed
  @field('pickup_loc') pickupLoc!: string // GeoJSON Point as string
  @field('dropoff_loc') dropoffLoc?: string // GeoJSON Point as string
  @field('qr_token_hash') qrTokenHash?: string
  @field('passengers') passengers!: number
  @field('accessibility_needs') accessibilityNeeds?: string
  @field('notes') notes?: string

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
  @date('accepted_at') acceptedAt?: Date
  @date('completed_at') completedAt?: Date

  // Relations
  @relation('users', 'rider_id') rider!: User
  @relation('users', 'driver_id') driver?: User
}