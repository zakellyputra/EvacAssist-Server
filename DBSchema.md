# Evacuation System - Database Schema (MongoDB)

This document defines the shared backend schema used by both:
- Mobile App (evacuees + drivers)
- Web Admin Dashboard (coordination + monitoring)

The schema is designed for MongoDB and can be implemented with Mongoose.

---

# Core Principles

- Single shared backend for both app and web
- Use ObjectId references for major entities
- Embed small structures (e.g., location)
- Keep MVP simple, extend later

---

# Collections Overview

## MVP (build first)
- users
- drivers
- vehicles
- evacuation_requests
- trips
- zones
- incidents
- shelters

## Extended (add later)
- user_profiles
- extraction_passes
- routes
- notifications
- audit_logs

---

# 1. users

```js
{
  _id: ObjectId,
  fullName: String,
  phone: String,
  email: String,
  passwordHash: String,
  role: "evacuee" | "driver" | "admin",

  isVerified: Boolean,
  isActive: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

---

# 2. user_profiles

```js
{
  _id: ObjectId,
  userId: ObjectId, // ref: users._id

  preferredLanguage: String,
  emergencyContactName: String,
  emergencyContactPhone: String,

  medicalNotes: String,
  mobilityNeeds: String,
  notes: String,

  createdAt: Date,
  updatedAt: Date
}
```

---

# 3. drivers

```js
{
  _id: ObjectId,
  userId: ObjectId, // ref: users._id
  vehicleId: ObjectId, // ref: vehicles._id

  licenseVerified: Boolean,

  status: "offline" | "available" | "assigned" | "en_route_pickup" | "transporting" | "unavailable",

  currentLocation: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    timestamp: Date
  },

  lastHeartbeatAt: Date,
  capacityOverride: Number,
  notes: String,

  createdAt: Date,
  updatedAt: Date
}
```

---

# 4. vehicles

```js
{
  _id: ObjectId,
  driverUserId: ObjectId, // ref: users._id

  type: "car" | "van" | "bus" | "truck" | "other",
  label: String,
  plateNumber: String,

  seatCapacity: Number,
  wheelchairAccessible: Boolean,
  fuelLevelPercent: Number,

  isActive: Boolean,

  currentLocation: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    timestamp: Date
  },

  createdAt: Date,
  updatedAt: Date
}
```

---

# 5. evacuation_requests

```js
{
  _id: ObjectId,
  requesterUserId: ObjectId, // ref: users._id

  pickupLocation: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    timestamp: Date
  },

  destinationZoneId: ObjectId, // ref: zones._id

  peopleCount: Number,

  priorityLevel: "low" | "medium" | "high" | "critical",

  hasChildren: Boolean,
  hasElderly: Boolean,
  hasInjured: Boolean,
  hasDisabilitySupportNeeds: Boolean,

  notes: String,

  status: "pending" | "reviewing" | "approved" | "assigned" | "en_route" | "picked_up" | "completed" | "cancelled" | "failed",

  assignedTripId: ObjectId, // ref: trips._id
  assignedVehicleId: ObjectId, // ref: vehicles._id
  assignedDriverUserId: ObjectId, // ref: users._id

  createdAt: Date,
  updatedAt: Date
}
```

---

# 6. extraction_passes

```js
{
  _id: ObjectId,
  requestId: ObjectId, // ref: evacuation_requests._id
  passengerUserId: ObjectId, // ref: users._id

  qrCodeValue: String,
  shortCode: String,

  status: "active" | "used" | "expired" | "cancelled",

  issuedAt: Date,
  expiresAt: Date,
  usedAt: Date,

  createdAt: Date,
  updatedAt: Date
}
```

---

# 7. trips

```js
{
  _id: ObjectId,
  requestId: ObjectId, // ref: evacuation_requests._id
  driverUserId: ObjectId, // ref: users._id
  vehicleId: ObjectId, // ref: vehicles._id

  pickupLocation: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    timestamp: Date
  },

  dropoffLocation: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    timestamp: Date
  },

  plannedRouteId: ObjectId, // ref: routes._id
  activeRouteId: ObjectId, // ref: routes._id

  status: "planned" | "driver_assigned" | "driver_en_route" | "arrived_pickup" | "passenger_verified" | "in_transit" | "completed" | "cancelled" | "failed" | "rerouted",

  estimatedDistanceKm: Number,
  estimatedDurationMin: Number,

  startedAt: Date,
  completedAt: Date,

  createdAt: Date,
  updatedAt: Date
}
```

---

# 8. routes

```js
{
  _id: ObjectId,
  tripId: ObjectId, // ref: trips._id

  start: { lat: Number, lng: Number },
  end: { lat: Number, lng: Number },

  polyline: String,

  waypoints: [
    { lat: Number, lng: Number }
  ],

  distanceKm: Number,
  durationMin: Number,
  riskScore: Number,

  blockedRoadIds: [String],
  zoneIdsCrossed: [ObjectId], // ref: zones._id

  status: "suggested" | "active" | "blocked" | "completed" | "invalid",

  createdAt: Date,
  updatedAt: Date
}
```

---

# 9. zones

```js
{
  _id: ObjectId,
  name: String,

  status: "safe" | "warning" | "danger" | "blocked" | "evacuated",

  center: {
    lat: Number,
    lng: Number
  },

  polygon: [
    { lat: Number, lng: Number }
  ],

  capacity: Number,
  currentOccupancy: Number,

  notes: String,
  updatedByUserId: ObjectId, // ref: users._id

  updatedAt: Date,
  createdAt: Date
}
```

---

# 10. incidents

```js
{
  _id: ObjectId,

  type: "conflict" | "road_block" | "fire" | "flood" | "medical" | "security_threat" | "other",
  severity: "low" | "medium" | "high" | "critical",

  title: String,
  description: String,

  location: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    timestamp: Date
  },

  zoneId: ObjectId, // ref: zones._id
  reportedByUserId: ObjectId, // ref: users._id

  source: "admin" | "driver" | "user" | "ai" | "system",

  isActive: Boolean,

  createdAt: Date,
  resolvedAt: Date,
  updatedAt: Date
}
```

---

# 11. shelters

```js
{
  _id: ObjectId,
  name: String,

  location: {
    lat: Number,
    lng: Number
  },

  zoneId: ObjectId, // ref: zones._id

  capacity: Number,
  currentOccupancy: Number,

  hasMedicalSupport: Boolean,
  hasFoodSupport: Boolean,
  hasPower: Boolean,

  contactInfo: String,
  isActive: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

---

# 12. notifications

```js
{
  _id: ObjectId,
  userId: ObjectId, // ref: users._id

  type: "request_update" | "trip_update" | "incident_alert" | "zone_update" | "system_alert",

  title: String,
  message: String,

  relatedEntityType: "request" | "trip" | "incident" | "zone",
  relatedEntityId: ObjectId,

  isRead: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

---

# 13. audit_logs

```js
{
  _id: ObjectId,
  actorUserId: ObjectId, // ref: users._id

  action: String,
  entityType: String,
  entityId: ObjectId,

  metadata: Object,

  createdAt: Date
}
```

---

# Relationships

```txt
users
 ├── user_profiles (1:1)
 ├── evacuation_requests (1:N)
 ├── notifications (1:N)
 └── drivers (1:1 if role = driver)

drivers
 └── vehicles (1:1)

evacuation_requests
 ├── belongs to users
 ├── may create extraction_pass
 └── may create trip

trips
 ├── belongs to evacuation_requests
 ├── belongs to users (driver)
 ├── belongs to vehicles
 └── may reference routes

zones
 ├── have incidents
 └── have shelters
```

---

# Required Indexes

## users

```js
{ email: 1 } // unique
{ phone: 1 }
{ role: 1 }
```

## drivers

```js
{ userId: 1 }
{ status: 1 }
```

## evacuation_requests

```js
{ requesterUserId: 1 }
{ status: 1 }
{ createdAt: -1 }
```

## trips

```js
{ requestId: 1 }
{ driverUserId: 1 }
{ status: 1 }
```

## incidents

```js
{ zoneId: 1 }
{ isActive: 1 }
{ severity: 1 }
```

## notifications

```js
{ userId: 1, isRead: 1 }
```

---

# Notes for Implementation

- Use GeoJSON + 2dsphere indexes later for advanced map queries
- Keep routes optional for MVP (can compute on the fly)
- Extraction passes can be added after core flow works
- Notifications can be polling-based first, real-time later

---

# MVP API Needs (minimal)

- create user
- login
- create evacuation request
- assign driver to request
- create trip
- update driver location
- update request/trip status
- create incident
- update zone status

---

# Summary

Single shared schema:

- Mobile app uses: requests, trips, passes
- Web dashboard uses: requests, trips, zones, incidents, drivers

Keep it simple -> get flow working -> expand later
