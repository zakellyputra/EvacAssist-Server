import { database } from './database'
import { SyncQueue, RiskZone, RoadSegment, EdgeRisk, Incident, Trip } from './models'
import { API_URL } from '../constants'
import NetInfo from '@react-native-community/netinfo'

export class SyncService {
  private static instance: SyncService
  private isOnline = false
  private syncInProgress = false

  private constructor() {
    this.setupNetworkListener()
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline
      this.isOnline = state.isConnected ?? false

      // Trigger sync when coming back online
      if (!wasOnline && this.isOnline) {
        this.performFullSync()
      }
    })
  }

  // Queue an operation for offline sync
  async queueOperation(operation: 'create' | 'update' | 'delete', collection: string, document: any, serverId?: string) {
    const deviceId = 'mobile-device-1' // TODO: Generate unique device ID

    await database.write(async () => {
      await database.get<SyncQueue>('sync_queue').create(syncItem => {
        syncItem.serverId = serverId || ''
        syncItem.deviceId = deviceId
        syncItem.operation = operation
        syncItem.collection = collection
        syncItem.document = JSON.stringify(document)
        syncItem.queuedAt = new Date()
        syncItem.retryCount = 0
      })
    })

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncQueuedOperations()
    }
  }

  // Sync all queued operations
  async syncQueuedOperations() {
    if (this.syncInProgress || !this.isOnline) return

    this.syncInProgress = true

    try {
      const pendingItems = await database.get<SyncQueue>('sync_queue')
        .query()
        .where('synced_at', null)
        .fetch()

      for (const item of pendingItems) {
        if (!item.shouldRetry) continue

        try {
          await this.syncSingleOperation(item)
          await item.markSynced()
        } catch (error) {
          await item.incrementRetry(error instanceof Error ? error.message : 'Unknown error')
        }
      }
    } finally {
      this.syncInProgress = false
    }
  }

  private async syncSingleOperation(syncItem: SyncQueue) {
    const document = syncItem.documentParsed
    if (!document) throw new Error('Invalid document data')

    const endpoint = `${API_URL}/api/${syncItem.collection}`
    const token = '' // TODO: Get auth token

    let response: Response

    switch (syncItem.operation) {
      case 'create':
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(document),
        })
        break

      case 'update':
        response = await fetch(`${endpoint}/${syncItem.serverId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(document),
        })
        break

      case 'delete':
        response = await fetch(`${endpoint}/${syncItem.serverId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        break

      default:
        throw new Error(`Unknown operation: ${syncItem.operation}`)
    }

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`)
    }
  }

  // Perform full sync of critical data
  async performFullSync() {
    if (!this.isOnline) return

    try {
      await Promise.all([
        this.syncRiskZones(),
        this.syncRoadSegments(),
        this.syncEdgeRisks(),
        this.syncIncidents(),
        this.syncActiveTrips(),
      ])

      // Clean up expired data
      await this.cleanupExpiredData()

    } catch (error) {
      console.error('Full sync failed:', error)
    }
  }

  private async syncRiskZones() {
    try {
      const token = '' // TODO: Get auth token
      const response = await fetch(`${API_URL}/api/zones`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) return

      const zones = await response.json()

      await database.write(async () => {
        const existingZones = await database.get<RiskZone>('risk_zones').query().fetch()
        const existingIds = new Set(existingZones.map(z => z.serverId))

        // Update existing and create new
        for (const zone of zones) {
          if (existingIds.has(zone._id)) {
            const existing = existingZones.find(z => z.serverId === zone._id)
            if (existing) {
              await existing.update(existingZone => {
                existingZone.name = zone.name
                existingZone.geometry = JSON.stringify(zone.geometry)
                existingZone.riskLevel = zone.risk_level
                existingZone.source = zone.source
                existingZone.updatedAt = new Date()
              })
            }
          } else {
            await database.get<RiskZone>('risk_zones').create(newZone => {
              newZone.serverId = zone._id
              newZone.name = zone.name
              newZone.geometry = JSON.stringify(zone.geometry)
              newZone.riskLevel = zone.risk_level
              newZone.source = zone.source
              newZone.createdAt = new Date()
              newZone.updatedAt = new Date()
            })
          }
        }
      })
    } catch (error) {
      console.error('Risk zones sync failed:', error)
    }
  }

  private async syncRoadSegments() {
    // TODO: Implement road segments sync with bounding box
    // This would be called when user moves to new area
  }

  private async syncEdgeRisks() {
    // TODO: Implement edge risks sync with bounding box
  }

  private async syncIncidents() {
    try {
      const token = '' // TODO: Get auth token
      const response = await fetch(`${API_URL}/api/incidents`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) return

      const incidents = await response.json()

      await database.write(async () => {
        for (const incident of incidents) {
          const existing = await database.get<Incident>('incidents')
            .query('server_id', incident._id)
            .fetchCount()

          if (existing === 0) {
            await database.get<Incident>('incidents').create(newIncident => {
              newIncident.serverId = incident._id
              newIncident.sourceType = incident.source_type
              newIncident.eventType = incident.event_type
              newIncident.location = JSON.stringify(incident.location)
              newIncident.radiusM = incident.radius_m
              newIncident.severity = incident.severity
              newIncident.confidence = incident.confidence
              newIncident.freshnessDecayHours = incident.freshness_decay_hours
              newIncident.sourceWeight = incident.source_weight
              newIncident.rawReportId = incident.raw_report_id
              newIncident.expiresAt = new Date(incident.expires_at)
              newIncident.createdAt = new Date()
              newIncident.updatedAt = new Date()
            })
          }
        }
      })
    } catch (error) {
      console.error('Incidents sync failed:', error)
    }
  }

  private async syncActiveTrips() {
    try {
      const token = '' // TODO: Get auth token
      const response = await fetch(`${API_URL}/api/trips/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) return

      const trips = await response.json()

      await database.write(async () => {
        for (const trip of trips) {
          const existing = await database.get<Trip>('trips')
            .query('server_id', trip._id)
            .fetchCount()

          if (existing === 0) {
            await database.get<Trip>('trips').create(newTrip => {
              newTrip.serverId = trip._id
              newTrip.riderId = trip.rider_id
              newTrip.driverId = trip.driver_id
              newTrip.status = trip.status
              newTrip.pickupLoc = JSON.stringify(trip.pickup_loc)
              newTrip.dropoffLoc = trip.dropoff_loc ? JSON.stringify(trip.dropoff_loc) : undefined
              newTrip.qrTokenHash = trip.qr_token_hash
              newTrip.passengers = trip.passengers
              newTrip.accessibilityNeeds = trip.accessibility_needs
              newTrip.notes = trip.notes
              newTrip.createdAt = new Date(trip.created_at)
              newTrip.updatedAt = new Date()
              if (trip.accepted_at) newTrip.acceptedAt = new Date(trip.accepted_at)
              if (trip.completed_at) newTrip.completedAt = new Date(trip.completed_at)
            })
          }
        }
      })
    } catch (error) {
      console.error('Active trips sync failed:', error)
    }
  }

  private async cleanupExpiredData() {
    await database.write(async () => {
      // Remove expired incidents
      const expiredIncidents = await database.get<Incident>('incidents')
        .query()
        .where('expires_at', '<', new Date())
        .fetch()

      for (const incident of expiredIncidents) {
        await incident.destroyPermanently()
      }

      // Remove old cached tiles (older than 7 days)
      const oldTiles = await database.get<CachedTile>('cached_tiles')
        .query()
        .where('cached_at', '<', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .fetch()

      for (const tile of oldTiles) {
        await tile.destroyPermanently()
      }

      // Remove completed trips older than 30 days
      const oldTrips = await database.get<Trip>('trips')
        .query('status', 'completed')
        .where('completed_at', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .fetch()

      for (const trip of oldTrips) {
        await trip.destroyPermanently()
      }
    })
  }

  // Cache map tiles for offline viewing
  async cacheTile(z: number, x: number, y: number, tileData: string) {
    const tileKey = `${z}/${x}/${y}`

    await database.write(async () => {
      const existing = await database.get<CachedTile>('cached_tiles')
        .query('tile_key', tileKey)
        .fetchCount()

      if (existing === 0) {
        await database.get<CachedTile>('cached_tiles').create(tile => {
          tile.tileKey = tileKey
          tile.tileData = tileData
          tile.cachedAt = new Date()
          tile.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          tile.createdAt = new Date()
          tile.updatedAt = new Date()
        })
      }
    })
  }

  // Get cached tile data
  async getCachedTile(z: number, x: number, y: number): Promise<string | null> {
    const tileKey = `${z}/${x}/${y}`

    const tiles = await database.get<CachedTile>('cached_tiles')
      .query('tile_key', tileKey)
      .fetch()

    if (tiles.length === 0) return null

    const tile = tiles[0]
    if (tile.isExpired) {
      await database.write(async () => {
        await tile.destroyPermanently()
      })
      return null
    }

    return tile.tileData
  }
}

export const syncService = SyncService.getInstance()