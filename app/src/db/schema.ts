import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const mySchema = appSchema({
  version: 1,
  tables: [
    // Users table - cached user profiles
    tableSchema({
      name: 'users',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // MongoDB _id
        { name: 'phone_hash', type: 'string', isIndexed: true },
        { name: 'role', type: 'string' }, // rider, driver, coordinator, admin
        { name: 'vehicle', type: 'string' }, // vehicle description for drivers
        { name: 'wallet_address', type: 'string' }, // Solana wallet for payments
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Trips table - active and recent trips
    tableSchema({
      name: 'trips',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // MongoDB _id
        { name: 'rider_id', type: 'string', isIndexed: true },
        { name: 'driver_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string', isIndexed: true }, // pending, accepted, in_progress, completed
        { name: 'pickup_loc', type: 'string' }, // GeoJSON Point as string
        { name: 'dropoff_loc', type: 'string' }, // GeoJSON Point as string
        { name: 'qr_token_hash', type: 'string' }, // SHA-256 hash of QR token
        { name: 'passengers', type: 'number' },
        { name: 'accessibility_needs', type: 'string' },
        { name: 'notes', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'accepted_at', type: 'number' },
        { name: 'completed_at', type: 'number' },
      ],
    }),

    // Risk zones table - cached hazard polygons
    tableSchema({
      name: 'risk_zones',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // MongoDB _id
        { name: 'name', type: 'string' },
        { name: 'geometry', type: 'string' }, // GeoJSON Polygon as string
        { name: 'risk_level', type: 'string', isIndexed: true }, // critical, high, moderate, low
        { name: 'source', type: 'string' }, // gdacs, hdx_acled, manual
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Road segments table - OSM road data for routing
    tableSchema({
      name: 'road_segments',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // MongoDB _id
        { name: 'osm_way_id', type: 'string', isIndexed: true },
        { name: 'start_node', type: 'string' },
        { name: 'end_node', type: 'string' },
        { name: 'geometry', type: 'string' }, // GeoJSON LineString as string
        { name: 'distance_m', type: 'number' },
        { name: 'travel_time_s', type: 'number' },
        { name: 'road_type', type: 'string', isIndexed: true }, // motorway, primary, secondary, residential, path
        { name: 'base_cost', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Edge risks table - dynamic risk scores per road segment
    tableSchema({
      name: 'edge_risks',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // MongoDB _id
        { name: 'segment_id', type: 'string', isIndexed: true },
        { name: 'conflict_risk', type: 'number' }, // [0, 1]
        { name: 'blockage_risk', type: 'number' }, // [0, 1]
        { name: 'infra_risk', type: 'number' }, // [0, 1]
        { name: 'crowd_risk', type: 'number' }, // [0, 1]
        { name: 'weather_risk', type: 'number' }, // [0, 1]
        { name: 'uncertainty', type: 'number' }, // [0, 1]
        { name: 'confidence', type: 'number' }, // [0, 1]
        { name: 'is_hard_blocked', type: 'boolean', isIndexed: true },
        { name: 'last_updated', type: 'number', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Incidents table - AI-parsed hazard events
    tableSchema({
      name: 'incidents',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // MongoDB _id
        { name: 'source_type', type: 'string', isIndexed: true }, // text, image, umap
        { name: 'event_type', type: 'string', isIndexed: true }, // infrastructure_damage, armed_clash, fire, flood, road_block, crowd, checkpoint
        { name: 'location', type: 'string' }, // GeoJSON Point as string
        { name: 'radius_m', type: 'number' },
        { name: 'severity', type: 'number' }, // [0, 1]
        { name: 'confidence', type: 'number' }, // [0, 1]
        { name: 'freshness_decay_hours', type: 'number' },
        { name: 'source_weight', type: 'number' },
        { name: 'raw_report_id', type: 'string', isIndexed: true },
        { name: 'expires_at', type: 'number', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Raw reports table - unprocessed user submissions
    tableSchema({
      name: 'raw_reports',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // MongoDB _id
        { name: 'type', type: 'string', isIndexed: true }, // text, image
        { name: 'content', type: 'string' }, // text content or image URL
        { name: 'image_url', type: 'string' },
        { name: 'submitted_by', type: 'string', isIndexed: true },
        { name: 'processed', type: 'boolean', isIndexed: true },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Sync queue table - offline operations pending sync
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true }, // MongoDB _id
        { name: 'device_id', type: 'string', isIndexed: true },
        { name: 'operation', type: 'string', isIndexed: true }, // create, update, delete
        { name: 'collection', type: 'string', isIndexed: true },
        { name: 'document', type: 'string' }, // JSON string of document data
        { name: 'queued_at', type: 'number', isIndexed: true },
        { name: 'synced_at', type: 'number' },
        { name: 'retry_count', type: 'number' },
        { name: 'last_error', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Cached tiles table - map tile snapshots for offline viewing
    tableSchema({
      name: 'cached_tiles',
      columns: [
        { name: 'tile_key', type: 'string', isIndexed: true }, // z/x/y format
        { name: 'tile_data', type: 'string' }, // base64 encoded tile data
        { name: 'cached_at', type: 'number', isIndexed: true },
        { name: 'expires_at', type: 'number', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
})