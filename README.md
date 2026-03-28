# EvacAssist

**Emergency Evacuation Coordination Platform** — a stacked routing brain that turns live hazard intelligence into the safest path out.

## The Core Idea

The map is just the road graph. The intelligence is what scores it.

```
Live text reports + images + operator overlays
        ↓
LLM (text) + VLM (images) → structured risk signals
        ↓
Geo-Fusion Engine → road segment penalties
        ↓
Route Engine (A* on OSM graph) → lowest-risk viable path
        ↓
MapLibre map → route + hazard overlays + confidence badges
```

Routes are scored — not just shortest path. Every road edge carries a cost derived from conflict risk, blockage, infrastructure damage, crowd density, weather, and evidence uncertainty. Confirmed impassable roads become hard blocks (infinite cost). Unverified reports become soft penalties that decay over time.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo), expo-router |
| Web Dashboard | Flask (Python) — admin/coordinator |
| Backend | Node.js + Express + Socket.io |
| Database | MongoDB Atlas |
| Road Graph | OpenStreetMap + OSRM |
| Map Rendering | **MapLibre GL** (open-source, no Google, no Mapbox) |
| Map Tiles | OSM raster tiles (free) / MapTiler optional |
| Operator Overlay | umap.openstreetmap.fr — human-editable tactical hazard layer |
| LLM (text) | Anthropic Claude API — parses incident text → risk signals |
| VLM (images) | Anthropic Claude Vision — parses photos/drone frames → passability |
| Geo-Fusion | Turf.js + custom Node.js service |
| Route Engine | A* on scored graph (`ngraph.path`) |
| Offline Cache | WatermelonDB (SQLite) |
| Payments | Solana Pay (optional, non-custodial driver tips) |

## Repository Structure

```
evac-assist/
├── backend/
│   ├── routes/          # Express route handlers
│   ├── models/          # Mongoose schemas (incl. RoadSegment, EdgeRisk, Incident)
│   ├── services/
│   │   ├── llmParser.js     # text → structured incident
│   │   ├── vlmParser.js     # image → passability signal
│   │   ├── geoFusion.js     # match incidents to road segments
│   │   ├── edgeScorer.js    # compute final_edge_cost per segment
│   │   ├── routeEngine.js   # A* pathfinding on scored graph
│   │   ├── osmLoader.js     # load/refresh OSM road data
│   │   └── umapSync.js      # pull GeoJSON from UMap overlays
│   ├── socket/
│   └── server.js
├── mobile/              # React Native (Expo) — iOS/Android
│   └── src/
│       ├── app/             # expo-router navigation
│       ├── components/
│       │   ├── MapView.tsx      # MapLibre GL
│       │   ├── HazardLayer.tsx  # risk zone + edge score overlays
│       │   └── ConfidenceBadge.tsx
│       └── db/              # WatermelonDB offline schema
├── web/                 # Flask coordinator dashboard
│   └── app/
│       ├── routes/
│       ├── templates/
│       └── static/
└── shared/
    ├── constants.js     # risk weights, thresholds
    └── solana/
```

## How It Routes

### Road Edge Model

Every road segment from OSM becomes a scored edge:

```
final_edge_cost = base_travel_time × (1 + risk_multiplier)

risk_multiplier =
  0.35 × conflict_risk   +
  0.25 × blockage_risk   +
  0.20 × infrastructure_damage +
  0.10 × crowd_density   +
  0.05 × weather_risk    +
  0.05 × uncertainty
```

Each risk component is weighted by evidence quality:

```
effective_risk = severity × confidence × freshness × source_weight

freshness        = e^(-0.1 × hours_since_report)
source_weight:
  anonymous text  = 0.30
  user report     = 0.50
  NGO alert       = 0.80
  image confirmed = 0.95
  UMap operator   = 0.90
```

**Hard block** (cost = ∞): triggered when any single component effective severity > 0.85 — confirmed bridge destruction, active combat at intersection, VLM-confirmed impassable flooding, operator-marked checkpoint denial.

**Soft penalty**: unverified smoke, possible unrest, moderate traffic, old reports. Keeps options open instead of overreacting.

### What Each AI Model Does

**LLM (Claude text):**
- Reads: news, SMS alerts, user reports, NGO notices, government bulletins
- Outputs: `{ event_type, coordinates, severity, confidence, radius_m, time_decay_hours }`
- Example: *"Bridge near Sector 4 hit"* → `{ event_type: "infrastructure_damage", road_block_prob: 0.78, severity: 0.86 }`

**VLM (Claude vision):**
- Reads: drone frames, satellite tiles, user-uploaded photos, street images
- Outputs: `{ flood_detected, vehicle_passable, pedestrian_passable, confidence }`
- Example: road photo → `{ flood_detected: true, vehicle_passable: false, confidence: 0.77 }`

**Rule:** AI produces structured risk signals. The route engine does the pathfinding. LLM never picks the route directly.

### UMap Operator Layer

Coordinators draw on [umap.openstreetmap.fr](https://umap.openstreetmap.fr):
- Red polygons → conflict zones (roads inside get `conflict_risk` penalty)
- Black lines → confirmed blocked roads (roads intersecting get `is_hard_blocked = true`)
- Blue markers → safe pickup points and shelters

The backend syncs GeoJSON from UMap and fuses it into edge scores automatically.

## Getting Started

### Prerequisites
- Node.js 18+, Python 3.10+, Expo CLI
- MongoDB Atlas account
- Anthropic API key (covers both LLM + VLM)
- No Google Maps or Mapbox account needed

### Backend

```bash
cd api
npm install
cp .env .env
# Set: MONGODB_URI, JWT_SECRET, ANTHROPIC_API_KEY, OSRM_URL
npm run dev
```

### Mobile

```bash
cd app
npm install
cp .env .env
# Set: EXPO_PUBLIC_API_URL
npx expo start
```

### Web (Flask)

```bash
cd web
pip install -r requirements.txt
cp .env .env
# Set: API_URL, SECRET_KEY
flask run
```

## Map Stack (No Google, No Mapbox)

- **Rendering:** [MapLibre GL](https://maplibre.org) — open-source fork of Mapbox GL JS. Same API, no licensing fees.
- **Mobile:** `@maplibre/maplibre-react-native` replaces `react-native-maps`
- **Road data:** OpenStreetMap — free, globally available, offline-capable
- **Routing backbone:** OSRM — open-source routing on OSM data. Public demo server for dev; self-host for production.
- **Tiles:** OSM raster tiles (free, no key) or MapTiler vector tiles (optional, affordable)

## Key Features

### Evacuation Request Flow
1. Rider submits request (guest or registered) with GPS location + passenger count
2. Broadcast via Socket.io to nearby drivers
3. Driver accepts → navigates to pickup using AI-scored route
4. QR handshake verifies identity at pickup → trip `in_progress`
5. On arrival, trip `completed`; rider optionally tips driver via Solana Pay

### Guest Emergency Mode
No login needed to view hazard overlays, cached risk zones, and saved route snapshots. Auth only required for posting a ride request, driving, or saving a profile.

### Offline Mode
- Connectivity loss detected → persistent offline banner
- Actions queue to local SQLite (WatermelonDB)
- Cached road graph + map tiles remain active
- On reconnect: ops replay against API (last-write-wins conflict resolution)

## MongoDB Collections

| Collection | Purpose |
|---|---|
| `users` | Rider/driver profiles, wallet addresses |
| `trips` | Full trip lifecycle with geospatial pickup |
| `risk_zones` | Admin-managed GeoJSON polygons |
| `road_segments` | OSM edges with base travel costs |
| `edge_risks` | Live risk scores per road segment |
| `incidents` | Structured events from LLM/VLM processing |
| `raw_reports` | Unprocessed incoming text/images |
| `audit_log` | Immutable event log |
| `sync_queue` | Offline operation queue |

## API Overview

| Category | Key Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/refresh` |
| Trips | `POST /api/trips`, `GET /available`, `PATCH /:id/accept`, `/:id/complete`, `POST /:id/verify` |
| Zones | `GET /api/zones`, `GET /zones/check` (public), `POST` / `DELETE` (admin) |
| **Incidents** | `POST /api/incidents/text`, `POST /api/incidents/image`, `GET /api/incidents` |
| **Edges** | `GET /api/edges/scores?bbox=...`, `GET /api/edges/:segment_id` |
| Routes | `POST /api/routes/suggest`, `GET /api/routes/:trip_id` |
| UMap | `POST /api/umap/sync` (admin) |
| Sync | `POST /api/sync/push`, `GET /api/sync/pull` |
| Payments | `GET /api/payment/:trip_id/qr`, `POST /api/payment/:trip_id/confirm` |

## Security Notes

- QR tokens: SHA-256 hash stored only; plaintext on rider's device only
- JWT in Socket.io `auth` object, never query params
- Phone numbers stored as `bcryptjs` hashes
- Solana Pay non-custodial — no private keys ever stored
- `GET /api/zones/check` intentionally unauthenticated — guests must always see hazards

---

HackIndy 2026
