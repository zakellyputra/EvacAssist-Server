import { Model } from '@nozbe/watermelondb'
import { field, readonly, date } from '@nozbe/watermelondb/decorators'

export class RawReport extends Model {
  static table = 'raw_reports'

  @field('server_id') serverId!: string
  @field('type') type!: 'text' | 'image'
  @field('content') content!: string // text content or image URL
  @field('image_url') imageUrl?: string
  @field('submitted_by') submittedBy!: string
  @field('processed') processed!: boolean

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  // Relations - using string-based to avoid circular imports
  // @relation('users', 'submitted_by') submitter!: any
  // @children('incidents', 'raw_report_id') incidents!: any[]
}