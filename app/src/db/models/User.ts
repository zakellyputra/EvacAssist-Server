import { Model } from '@nozbe/watermelondb'
import { field, readonly, date, children, relation } from '@nozbe/watermelondb/decorators'

export class User extends Model {
  static table = 'users'

  @field('server_id') serverId!: string
  @field('phone_hash') phoneHash!: string
  @field('role') role!: string // rider, driver, coordinator, admin
  @field('vehicle') vehicle?: string
  @field('wallet_address') walletAddress?: string

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  // Relations
  @children('trips', 'rider_id') riderTrips!: Trip[]
  @children('trips', 'driver_id') driverTrips!: Trip[]
  @children('raw_reports', 'submitted_by') rawReports!: RawReport[]
}