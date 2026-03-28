# EvacAssist — CLAUDE.md

## Core Concept

The map is a road graph. AI systems decide which roads become dangerous, uncertain, or blocked — and change the route score. The routing engine finds the lowest-risk viable path, not the shortest path.

```
[Live Data Sources]
  ├─ text alerts / news / incident reports
  ├─ images (drone, satellite, user-uploaded)
  ├─ UMap operator overlays (GeoJSON)
  └─ weather feeds

        ↓

[AI Interpretation Layer]
  ├─ LLM (Claude text) → structured incidents { location, severity, confidence, type }
  └─ VLM (Claude vision) → passability signals { flood, debris, damage, confidence }

        ↓

[Geo-Fusion Engine]
  ├─ match incidents to nearby road segments (Turf.js spatial ops)
  ├─ polygon overlays → penalize roads inside
  ├─ decay stale reports (exponential time decay)
  └─ fuse duplicate evidence (raise confidence)

        ↓

[Edge Scoring Engine]
  ├─ compute effective_edge_cost per road segment
  ├─ apply hard blocks for confirmed impassable roads
  └─ write scores to edge_risks collection

        ↓

[Route Engine (A* on OSM graph)]
  ├─ find lowest-cost path using scored edges
  └─ return ranked route options with plain-language explanations

        ↓

[Map UI (MapLibre GL — no Google, no Mapbox)]
  ├─ display current route
  ├─ show hazard overlays with confidence badges
  └─ offline fallback (cached tiles + last-known graph)
```

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile App | React Native (Expo ~52), expo-router ~4 | |
| Web Dashboard | Flask (Python) | Admin/coordinator; proxies to Node.js API |
| Backend | Node.js + Express 5.x, Socket.io 4.x | |
| Database | MongoDB Atlas | Mongoose 8.x, 2dsphere indexes |
| Road Graph | OpenStreetMap (OSM) + OSRM | Open-source routing, no Google/Mapbox dependency |
| Map Rendering | MapLibre GL (web + mobile) | Open-source fork of Mapbox GL — no proprietary lock-in |
| Map Tiles | OSM raster tiles / MapTiler (optional) | Free OSM tiles for dev; MapTiler for vector tiles if needed |
| Operator Overlay | umap.openstreetmap.fr | Human-editable tactical hazard overlays synced via GeoJSON |
| LLM (text) | Anthropic Claude API (`@anthropic-ai/sdk`) | Parses incident text → structured risk objects |
| VLM (images) | Anthropic Claude Vision (same SDK) | Parses images → passability/damage signals |
| Geo-Fusion | `@turf/turf`, custom Node.js service | Spatial matching of incidents to road segments |
| Route Engine | Custom A* on OSM graph (`ngraph.path`) | Runs on Geo-Fused edge scores, not raw distance |
| Offline Cache | WatermelonDB (SQLite) on mobile | Queues ops + caches road graph + tile snapshots |
| Payments | Solana Pay (optional, non-custodial) | Peer-to-peer driver tips |

## Repository Structure

```
evac-assist/
├── backend/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── trips.js
│   │   ├── zones.js           # risk zone CRUD (admin)
│   │   ├── incidents.js       # text + image report ingestion
│   │   ├── routes.js          # route suggestion endpoint
│   │   ├── edges.js           # edge risk score queries
│   │   ├── sync.js
│   │   └── payment.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Trip.js
│   │   ├── RiskZone.js
│   │   ├── RoadSegment.js     # OSM edge (base cost)
│   │   ├── EdgeRisk.js        # dynamic risk per segment
│   │   ├── Incident.js        # structured AI-parsed events
│   │   ├── RawReport.js       # unprocessed incoming text/images
│   │   ├── AuditLog.js
│   │   └── SyncQueue.js
│   ├── services/
│   │   ├── llmParser.js       # text → structured incident
│   │   ├── vlmParser.js       # image → passability signal
│   │   ├── geoFusion.js       # match incidents to road segments
│   │   ├── edgeScorer.js      # compute final edge costs
│   │   ├── routeEngine.js     # A* pathfinding on scored graph
│   │   ├── osmLoader.js       # load/refresh OSM road graph
│   │   ├── umapSync.js        # pull GeoJSON from UMap overlays
│   │   ├── qrService.js
│   │   └── solanaService.js
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   └── adminGuard.js
│   ├── socket/
│   │   └── events.js          # Socket.io real-time handlers
│   ├── .env
│   └── server.js
├── mobile/
│   ├── src/
│   │   ├── app/               # expo-router file-based navigation
│   │   ├── components/
│   │   │   ├── MapView.tsx    # MapLibre GL map component
│   │   │   ├── RouteOverlay.tsx
│   │   │   ├── HazardLayer.tsx
│   │   │   └── ConfidenceBadge.tsx
│   │   ├── hooks/
│   │   ├── db/                # WatermelonDB offline schema + sync
│   │   └── store/
│   └── app.json
├── web/                       # Flask coordinator/admin dashboard
│   ├── app/
│   │   ├── routes/
│   │   │   ├── dashboard.py
│   │   │   ├── incidents.py
│   │   │   └── zones.py
│   │   ├── templates/
│   │   └── static/
│   ├── requirements.txt
│   └── run.py
└── shared/
    ├── constants.js           # risk weights, thresholds, status enums
    ├── types.js
    └── solana/
```

## MongoDB Collections

| Collection | Key Fields | Indexes |
|---|---|---|
| `users` | `_id`, `phone_hash`, `role`, `vehicle`, `wallet_address` | `phone_hash` unique |
| `trips` | `_id`, `rider_id`, `driver_id`, `status`, `pickup_loc`, `dropoff_loc`, `qr_token_hash` | `pickup_loc` 2dsphere |
| `risk_zones` | `_id`, `name`, `geometry` (GeoJSON Polygon), `risk_level`, `source` | `geometry` 2dsphere |
| `road_segments` | `_id`, `osm_way_id`, `start_node`, `end_node`, `geometry` (LineString), `distance_m`, `travel_time_s`, `road_type`, `base_cost` | `geometry` 2dsphere |
| `edge_risks` | `_id`, `segment_id`, `conflict_risk`, `blockage_risk`, `infra_risk`, `crowd_risk`, `weather_risk`, `uncertainty`, `confidence`, `is_hard_blocked`, `last_updated` | `segment_id` unique, `last_updated` |
| `incidents` | `_id`, `source_type` (text\|image\|umap), `event_type`, `location` (GeoJSON Point), `radius_m`, `severity`, `confidence`, `freshness_decay_hours`, `source_weight`, `raw_report_id`, `expires_at` | `location` 2dsphere, `expires_at` TTL |
| `raw_reports` | `_id`, `type` (text\|image), `content`, `image_url`, `submitted_by`, `processed`, `created_at` | `processed`, `created_at` |
| `audit_log` | `_id`, `event_type`, `actor_id`, `trip_id`, `payload`, `timestamp` | `event_type`, `timestamp` |
| `sync_queue` | `_id`, `device_id`, `operation`, `collection`, `document`, `queued_at` | `device_id`, `synced_at` |

## Edge Scoring Model

### Data Structures

```js
// Road segment (static, loaded from OSM)
RoadSegment = {
  osm_way_id,
  start_node, end_node,
  geometry,        // GeoJSON LineString
  distance_m,
  travel_time_s,
  road_type,       // motorway | primary | secondary | residential | path
  base_cost        // travel_time_s normalized
}

// Dynamic risk scores (updated by Geo-Fusion Engine)
EdgeRisk = {
  segment_id,
  conflict_risk,        // [0, 1]
  blockage_risk,        // [0, 1]
  infra_risk,           // [0, 1]
  crowd_risk,           // [0, 1]
  weather_risk,         // [0, 1]
  uncertainty,          // [0, 1] — low confidence = higher uncertainty
  confidence,           // [0, 1] — overall evidence confidence
  is_hard_blocked,      // bool — INF cost if true
  last_updated
}
```

### Scoring Formula

```
effective_component = severity × confidence × freshness × source_weight

freshness = e^(-0.1 × hours_since_report)    // halves every ~7 hours

source_weight:
  anonymous_text  = 0.30
  user_report     = 0.50
  ngo_alert       = 0.80
  image_confirmed = 0.95
  umap_operator   = 0.90

risk_multiplier =
  0.35 × conflict_risk   +
  0.25 × blockage_risk   +
  0.20 × infra_risk      +
  0.10 × crowd_risk      +
  0.05 × weather_risk    +
  0.05 × uncertainty

final_edge_cost = base_travel_time × (1 + risk_multiplier)

HARD BLOCK: if any single component effective_severity > 0.85
  → final_edge_cost = Infinity
```

### Hard Block Triggers
- Confirmed bridge destruction
- Active combat at an intersection (multiple high-confidence sources)
- Flood fully impassable (VLM confirmed, depth > passable threshold)
- Military checkpoint denial (operator-marked on UMap)

### Soft Penalty Examples
- Unverified smoke/fire report near road: blockage_risk += 0.3 × 0.5 (low source weight)
- NGO alert about civil unrest 500m from segment: conflict_risk += 0.6 × 0.8
- VLM detects moderate flooding but vehicle_passable = "maybe": weather_risk += 0.5 × 0.77

## AI Interpretation Layer

### LLM Parser (`services/llmParser.js`)

Input: raw text (news article, SMS alert, user report, NGO notice)

Output:
```js
{
  event_type: "infrastructure_damage" | "armed_clash" | "fire" | "flood" | "road_block" | "crowd" | "checkpoint",
  location_text: "Sector 4 checkpoint",
  coordinates: { lat, lng },     // geocoded from location_text
  radius_m: 1500,
  severity: 0.86,
  road_block_prob: 0.78,
  directional_effect: "northbound blocked",
  time_decay_hours: 6,
  confidence: 0.82,
  affected_infrastructure: ["bridge", "road_junction"],
  expires_at: "ISO 8601"
}
```

Prompt strategy: structured extraction with explicit JSON schema in system prompt. Do not ask Claude to choose routes — only extract structured risk signals.

### VLM Parser (`services/vlmParser.js`)

Input: image (drone frame, satellite tile, user upload, street photo)

Output:
```js
{
  flood_detected: true,
  fire_detected: false,
  smoke_detected: false,
  crowd_density: "low" | "medium" | "high",
  road_debris: false,
  bridge_damage: false,
  building_collapse: false,
  military_vehicles: false,
  vehicle_passable: true | false | "maybe",
  pedestrian_passable: true | false | "maybe",
  estimated_flood_depth: "none" | "shallow" | "moderate" | "deep",
  confidence: 0.77
}
```

Both LLM and VLM use the same `@anthropic-ai/sdk`. VLM calls use the vision capability by passing `image` content blocks.

**Key rule:** AI creates structured risk signals. The route engine does the pathfinding. Never let the LLM choose the route directly.

## Route Engine (`services/routeEngine.js`)

- Uses `ngraph.graph` to build an in-memory weighted directed graph from `road_segments` + current `edge_risks`
- Uses `ngraph.path` (A*) to find lowest-cost path
- On each route request:
  1. Load road segments for the bounding box of origin → destination
  2. Fetch current `edge_risks` for those segments
  3. Compute `final_edge_cost` per segment
  4. Run A* from origin to destination
  5. Return top 3 paths (vary heuristic weights: fastest / safest / balanced)
  6. Call LLM to generate one plain-language explanation per path

## UMap Integration (`services/umapSync.js`)

umap.openstreetmap.fr acts as the human-editable tactical overlay layer. Operators draw:
- Red polygons = conflict zones
- Orange polygons = fire/hazard zones
- Black lines = confirmed blocked roads
- Blue markers = safe pickup / shelter points

Sync flow:
- `GET /api/umap/sync` triggers a fetch of the UMap GeoJSON export URL
- Each feature is converted to either a `risk_zone` document or a `hard_block` flag on nearby segments
- Polygon features → roads inside get `conflict_risk` or `blockage_risk` penalty
- Line features tagged `blocked` → roads intersecting get `is_hard_blocked = true`

## Geo-Fusion Engine (`services/geoFusion.js`)

1. For each new `Incident`, use Turf.js `buffer()` to create an influence radius
2. Query `road_segments` with `$geoIntersects` for segments within that buffer
3. Apply the incident's risk type to the matching `EdgeRisk` fields
4. Multiple incidents on same segment: take `max()` per component (conservative)
5. Run time decay: hourly cron job applies `freshness = e^(-0.1t)` to all active incidents, removes expired ones
6. If ≥ 3 independent sources agree on same location + type: raise confidence cap to 0.95

## API Endpoints

### Auth
- `POST /api/auth/register` — no auth
- `POST /api/auth/login` — returns JWT pair
- `POST /api/auth/refresh`

### Trips
- `POST /api/trips` — create evacuation request (JWT)
- `GET /api/trips/available` — nearby open requests for driver (JWT)
- `PATCH /api/trips/:id/accept` (JWT)
- `PATCH /api/trips/:id/release` (JWT)
- `POST /api/trips/:id/verify` — QR pickup (JWT)
- `PATCH /api/trips/:id/complete` (JWT)
- `GET /api/trips/my` (JWT)

### Risk Zones (admin overlays)
- `GET /api/zones` (JWT)
- `GET /api/zones/check?lat=X&lng=Y` — **public, no auth** (guest mode safety)
- `POST /api/zones` (JWT + admin)
- `DELETE /api/zones/:id` (JWT + admin)

### Incidents (AI pipeline input)
- `POST /api/incidents/text` — submit text report → LLM parsing queue (JWT)
- `POST /api/incidents/image` — submit image → VLM parsing queue (JWT)
- `GET /api/incidents` — list active incidents (JWT)
- `GET /api/incidents/:id` (JWT)

### Edge Scores
- `GET /api/edges/scores?bbox=minLng,minLat,maxLng,maxLat` — current edge risk scores for map rendering (JWT)
- `GET /api/edges/:segment_id` — single segment risk detail (JWT)

### Route Suggestions
- `POST /api/routes/suggest` — origin + destination → top 3 scored paths with explanations (JWT)
- `GET /api/routes/:trip_id` — saved route for active trip (JWT)

### UMap Sync
- `POST /api/umap/sync` — pull latest GeoJSON from UMap and fuse into edge scores (JWT + admin)

### Sync (Offline)
- `POST /api/sync/push` (JWT)
- `GET /api/sync/pull?since=<timestamp>` (JWT)

### Payments
- `GET /api/payment/:trip_id/qr` (JWT)
- `POST /api/payment/:trip_id/confirm` (JWT)

## Key npm Packages

### Backend
| Package | Purpose |
|---|---|
| `express` 5.x | HTTP framework |
| `socket.io` 4.x | WebSocket real-time events |
| `mongoose` 8.x | MongoDB Atlas ODM |
| `@anthropic-ai/sdk` | LLM text parsing + VLM image analysis |
| `@turf/turf` | Spatial ops: buffer, point-in-polygon, line intersection |
| `ngraph.graph` + `ngraph.path` | In-memory graph + A* pathfinding |
| `osmtogeojson` | Convert OSM XML/JSON to GeoJSON for MongoDB |
| `axios` | HTTP calls to OSRM routing API |
| `multer` | Multipart image upload handling |
| `jsonwebtoken` 9.x | JWT |
| `zod` 3.x | Request/response validation |
| `bcryptjs` 2.x | Phone number hashing |
| `node-cron` | Scheduled freshness decay + UMap sync |
| `@solana/web3.js` 1.x | Solana Pay URL + signature verification |
| `pm2` | Production process manager |

### Mobile
| Package | Purpose |
|---|---|
| `@maplibre/maplibre-react-native` | Map rendering — replaces react-native-maps (no Google dependency) |
| `expo-camera` ~16 | QR scanning |
| `expo-location` ~18 | GPS |
| `socket.io-client` 4.x | WebSocket connection |
| `@nozbe/watermelondb` | Local SQLite offline queue + sync |
| `@react-native-community/netinfo` | Offline detection |
| `react-native-qrcode-svg` | Rider QR display |
| `react-native-paper` 5.x | UI components |

### Web (Flask)
| Package | Purpose |
|---|---|
| `flask` | Web framework |
| `requests` | HTTP calls to Node.js backend |
| `flask-cors` | CORS for API proxying |
| `python-dotenv` | Environment config |

## Environment Variables

```bash
# api/.env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/evacassist
JWT_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<long-random-string>
ANTHROPIC_API_KEY=sk-ant-...
OSRM_URL=https://router.project-osrm.org   # public demo; self-host for production
MAPTILER_API_KEY=<optional-for-vector-tiles>
UMAP_GEOJSON_URL=https://umap.openstreetmap.fr/en/map/<id>/geojson
PORT=3000

# app/.env
EXPO_PUBLIC_API_URL=https://<server-ip>:3000
EXPO_PUBLIC_MAPTILER_KEY=<optional>   # public key; if omitted, use OSM raster tiles

# web/.env
API_URL=http://<server-ip>:3000
SECRET_KEY=<flask-secret>
```

No Mapbox tokens required anywhere.

## Trip Status Flow

```
pending → accepted → in_progress → completed
                   ↘ (released) → pending
```

## QR Verification Protocol

1. Trip created → `crypto.randomBytes(32)` → Base64-encode → store SHA-256 hash only
2. Plaintext token returned to rider's device only
3. QR payload: `{ trip_id, token, timestamp }`
4. Driver scans → `POST /api/trips/:id/verify` → server hashes token, compares, checks 5-min window
5. Success → `in_progress` + Socket.io `confirmation` event to both parties

## Socket.io Auth

Always pass JWT in `auth` object, never query params:

```js
// Client
const socket = io(URL, { auth: { token: jwt } });
// Server
io.use((socket, next) => {
  const token = socket.handshake.auth.token; // verify then next()
});
```

## Offline Sync

- `@react-native-community/netinfo` detects connectivity loss
- Actions queued to WatermelonDB `local_queue`
- On reconnect: `POST /api/sync/push` → `GET /api/sync/pull`
- Conflict resolution: last-write-wins per document (`updated_at`)

## Development Guidelines

- AI only produces structured signals; the route engine does pathfinding — never route via raw LLM output
- All `edge_risks` must carry a `confidence` field — low-confidence events should not hard-block roads
- `GET /api/zones/check` is intentionally public (no auth) so guest users can always see hazards
- All geospatial fields use GeoJSON with 2dsphere indexes
- Use `zod` for all request validation
- Use `bcryptjs` for hashing phone numbers at rest in MongoDB
- Never store plaintext QR tokens — only SHA-256 hashes in the DB
- Use `node-cron` for hourly freshness decay on incidents
- Repeat evidence from multiple independent sources raises `confidence`, not just `severity`
- Use `pm2` for backend process management in production
- Flask web dashboard communicates with Node.js via HTTP REST only — never direct MongoDB access

## Risk Zone Data Sources

Risk zones in the `risk_zones` collection can be seeded manually (hackathon) or ingested automatically (post-hackathon) from two complementary open data sources. No API keys or registration required for either.

### GDACS — Natural Disasters

[GDACS](https://www.gdacs.org) (Global Disaster Alert and Coordination System) is run by the EU Joint Research Centre. Covers: Floods (FL), Earthquakes (EQ), Tropical Cyclones (TC), Volcanoes (VO), Wildfires (WF), Droughts (DR).

```js
// Pull current red-alert flood zones — no auth required
GET https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH
  ?eventlist=FL
  &alertlevel=red
  &fromdate=2026-01-01
  &todate=2026-12-31

// Alert levels: red → critical, orange → high, green → moderate
// Returns GeoJSON-compatible geometry — maps directly to risk_zones schema
```

### HDX HAPI — Conflict Zones

[HDX](https://data.humdata.org) (Humanitarian Data Exchange) is run by UN OCHA. Hosts aggregated ACLED conflict datasets (country-month level) under open license — no researcher registration needed, unlike the full ACLED API.

```js
// Search for conflict datasets by country — no auth required
GET https://data.humdata.org/api/search/datasets/?q=acled+{countryISO}&rows=5

// Download dataset resource directly
GET https://data.humdata.org/api/datasets/{dataset_id}/resources/
```

**HDX event_type → risk_level mapping:**

| HDX/ACLED Event Type | risk_level |
|---|---|
| Battles, Explosions | `critical` |
| Violence against civilians | `high` |
| Riots | `moderate` |
| Protests | `low` |

**Limitation:** HDX aggregated data is country-month level, not point-level coordinates. Use it to seed regional GeoJSON polygons by country bounding box. Full point-level conflict events require ACLED researcher access (post-hackathon).

### Ingestion Service (Post-Hackathon)

Add `backend/services/zoneIngestion.js` with scheduled jobs for both sources:

```js
async function ingestGDACS() {
  // Pull red/orange natural disaster events → upsert into risk_zones
  // geometry: GeoJSON Polygon from GDACS response
  // risk_level: red → "critical", orange → "high"
  // source: "gdacs"
}

async function ingestHDX(countryISO) {
  // Pull latest ACLED aggregate dataset for country from HDX
  // geometry: country bounding box polygon (approximation)
  // risk_level: derived from event_type mapping above
  // source: "hdx_acled"
}
```

For the **hackathon demo**, manually seed 4–5 `risk_zones` documents in MongoDB Atlas. The ingestion service is a post-hackathon extension.

## Running the Project

```bash
# Backend
cd api && npm install && npm run dev

# Mobile
cd app && npm install && npx expo start

# Web (Flask)
cd web && pip install -r requirements.txt && flask run
```