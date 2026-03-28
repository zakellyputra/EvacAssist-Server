# EvacAssist — Security Reference

## Architecture Overview

```
Mobile / Web Client
        │ HTTPS only (TLS 1.2+)
        ▼
Express API (JWT-authenticated)
        │
        ├── Incident Pipeline ──► incidentEncryption.js ──► MongoDB (encrypted at rest)
        ├── Driver Verification ──► Claude Vision prescreen ──► Human review
        ├── QR Handshake ──────────────────────────────────► Trip state machine
        ├── Socket.io ──────────────────────────────────────► socketAuth.js
        └── Audit Logger ───────────────────────────────────► HMAC chain → MongoDB
                │
Flask Dashboard (coordinator/admin, session-auth)
```

---

## Layer 1 — JWT + Socket.io

Files: `middleware/auth.js`, `socket/socketAuth.js`, `models/TokenBlacklist.js`

- Access tokens: 15-min TTL, signed with `JWT_SECRET`, carry `jti` for revocation
- Refresh tokens: 7-day TTL, separate `JWT_REFRESH_SECRET`, rotated on every use
- Reuse detection: consuming a blacklisted refresh token revokes the entire session
- Socket.io: JWT verified on handshake (never query params); per-event role guards
- TokenBlacklist: MongoDB TTL index auto-purges after 7 days

---

## Layer 2 — E2E Encryption

File: `shared/crypto.js` (libsodium — X25519 + XSalsa20-Poly1305 + Ed25519)

| Scenario | Scheme |
|---|---|
| Driver ↔ coordinator messages | `crypto_box` (both identities bound) |
| Anonymous guest incident reports | `crypto_box_seal` (no sender identity) |
| Driver credential attestation | Ed25519 `sign_detached` |

Private keys never leave the device. Server stores public keys and ciphertext only.

---

## Layer 3 — Incident Data Security

Files: `services/incidentEncryption.js`, `middleware/dbAccessControl.js`

### Encryption at rest (envelope encryption)

```
PII fields (raw_text, reporter_notes, image_storage_key, reporter_ip, reporter_user_id)
    ↓  AES-256-GCM  with per-incident DEK
enc_* fields stored in MongoDB

DEK
    ↓  AES-256-GCM  with KEK (from env / KMS)
encryptedDek stored alongside the document
```

**Plaintext fields** (no PII, required by geo-fusion at query time):
`event_type`, `severity`, `confidence`, `coordinates`, `radius_m`, `road_block_prob`

**Access tiers:**
- Risk signals (plaintext): verified drivers, coordinators, admins, backend services
- Raw decrypted PII: coordinators and admins only
- Image storage keys: coordinators and admins only

---

## Layer 4 — MongoDB Collection Access Control

File: `middleware/dbAccessControl.js`

| Collection | anon | rider | driver (unverified) | driver (verified) | coordinator | admin |
|---|---|---|---|---|---|---|
| users | — | own | own | own | read-all | full |
| trips | — | own | — | assigned | read-all | full |
| risk_zones | read | read | read | read | full | full |
| road_segments | read | read | read | read | read | full |
| edge_risks | read | read | read | read | read | full |
| incidents (risk signals) | — | — | — | read | read | full |
| incidents (raw PII) | — | — | — | — | read | full |
| raw_reports | — | own | own | own | read | full |
| **audit_log** | — | — | — | — | read | read-only |
| driver_verifications | — | — | own | own | full | full |
| sync_queue | — | own | own | own | — | full |

`risk_zones` and road data are intentionally public — guests must always see hazards.
`audit_log` is write-protected at policy layer; only `auditLogger.log()` can append.

---

## Layer 5 — Flask Dashboard Security

File: `web/app/routes/auth.py`

- Sessions: tokens stored server-side in Flask session (not localStorage)
- Cookie flags: `HttpOnly`, `Secure` (prod), `SameSite=Strict`, 8-hour idle timeout
- CSRF: Flask-WTF `CSRFProtect` globally; all forms include `{{ csrf_token() }}`
- Login rate limit: 10 attempts/minute per IP via Flask-Limiter (Redis-backed in prod)
- Tokens silently refreshed before expiry to avoid mid-session logouts
- Post-login `next=` validated to reject absolute URLs (open redirect prevention)
- Logout is a `POST` with CSRF token — not a link

---

## Layer 6 — Tamper-Evident Audit Log

File: `services/auditLogger.js`

Each entry stores:
- `entryHash`: HMAC-SHA256 of entry content, keyed with `AUDIT_HMAC_SECRET`
- `prevHash`: hash of the previous entry (genesis = `'0'.repeat(64)`)
- `sequence`: monotonically increasing integer

Tampering or deleting any entry breaks the chain from that point forward.

```js
// Verify integrity (run as cron + on demand)
const broken = await auditLogger.verifyChain();
// [] = intact  |  [{ sequence, reason }] = tamper detected
```

**Append-only enforcement:** Mongoose `pre('save')` rejects updates; `dbAccessControl` sets `canWrite: () => false`; no route handler writes directly.

**Events logged:** auth (login/logout/revoke/reuse), driver lifecycle (submit/approve/reject/suspend), trips (create/accept/QR-verify/complete), incidents (submit/process/hard-block), admin actions (zones, umap sync), audit chain checks.

---

## Secrets Reference

```env
# backend/.env
JWT_SECRET=<64-char hex>
JWT_REFRESH_SECRET=<64-char hex>
QR_HMAC_SECRET=<64-char hex>
INCIDENT_KEK=<64-char hex>         # incident field encryption master key
AUDIT_HMAC_SECRET=<64-char hex>    # audit log HMAC chain key
ANTHROPIC_API_KEY=<key>

# web/.env
FLASK_SECRET_KEY=<64-char hex>
REDIS_URL=redis://...              # rate limiter (production)
```

Generate any secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**KMS recommendation:** `INCIDENT_KEK` should be stored in AWS KMS, GCP KMS, or HashiCorp Vault in production. `incidentEncryption.js` can be adapted to call KMS for DEK wrap/unwrap.

---

## New Dependencies

```bash
# Backend
npm install jsonwebtoken bcryptjs qrcode multer libsodium-wrappers

# Web (Flask)
pip install flask-wtf flask-limiter redis
```

---

## Wire-Up Checklist

### Initial implementation
- [ ] Mount verification routes: `app.use('/api/verification', require('./routes/verification.routes'))`
- [ ] Apply socket auth: `io.use(socketAuthMiddleware)`
- [ ] Register Flask blueprints: `auth_bp`, `verification_bp`
- [ ] Implement object storage in `uploadDocuments()` and `fetchDocumentAsBase64()`
- [ ] Add `verificationStatus`, `encryptionPublicKey` to User schema
- [ ] Add `qrTokenHash`, `qrTokenExpiry`, `qrConsumed`, `pickupVerifiedAt` to Trip schema
- [ ] Emit QR data URL to rider socket room in trip-accept handler

### Gap closures (this pass)
- [ ] Set `INCIDENT_KEK`, `AUDIT_HMAC_SECRET`, `FLASK_SECRET_KEY` in env
- [ ] Call `encryptIncident()` before saving to `incidents` collection
- [ ] Call `decryptIncident()` in coordinator-only incident detail routes
- [ ] Apply `canReadCollection('incidents_risk')` middleware to incident list routes
- [ ] Apply `canReadCollection('incidents_raw')` to raw content routes (coordinator+)
- [ ] Call `init_security(app)` in Flask application factory
- [ ] Register `auth_bp` in Flask app
- [ ] Wire `auditLogger.log()` into: auth routes, trip accept/complete, driver approve/reject/suspend
- [ ] Schedule `verifyChain()` as a daily cron job
- [ ] Set `REDIS_URL` in Flask env for production rate limiting
