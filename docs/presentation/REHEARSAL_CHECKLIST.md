# ResQPH Demonstration Rehearsal Checklist & Evidence Log

**Document Version:** 1.0.0  
**Rehearsal Date:** 2026-10-06 (Asia/Manila)  
**Git Baseline:** `df5a29d` (accepted `main` after merged Issue #64 gate)  
**Rehearsal Lead:** Clarence (UI/UX and Frontend Contributor)  
**Participants & Observers:**
- Ranee Mikaella Gutierrez (Project Lead & Gate Owner)
- Jared Noel (Backend & Integration Observer)
- Elle (Frontend & Map Presentation Observer)
- Matthew Trinitaria (Geospatial & ML Observer)
- Clarence (Demo Execution Lead)

---

## 1. Pre-Rehearsal Environment & Clean-Slate Checklist

Before executing the live rehearsal, the environment must be verified against the following criteria:

| Check | Requirement | Verification Method | Status |
|---|---|---|---|
| **Git Baseline** | Clean working tree on `df5a29d` | `git status` -> clean | PASS |
| **No Real Data** | Zero personal or real citizen details | Inspect `data/samples/` and seed scripts | PASS |
| **No Secrets** | Zero API keys, passwords, or tokens | Codebase scan; `.env.example` only | PASS |
| **MongoDB Replica Set** | Running and healthy on `localhost:27017` | `docker compose ps` | PASS |
| **FastAPI Backend** | Running on `http://127.0.0.1:8000` | `curl http://127.0.0.1:8000/api/v1/health` | PASS |
| **Frontend Production Build** | Compiled without errors | `npm run build` in `frontend/` | PASS |
| **Preview Server** | Running on `http://localhost:5189` | `npm run preview -- --port 5189` | PASS |
| **Browser Clean Slate** | Chrome Incognito window; clean storage | Open DevTools -> Clear site data (IndexedDB, Service Workers, Cache) | PASS |

---

## 2. Step-by-Step Rehearsal Execution Log

*All steps executed sequentially in accordance with [`docs/presentation/DEMO_SCRIPT.md`](DEMO_SCRIPT.md).*

| # | Demonstration Step | Expected Outcome | Actual Observed Behavior | Status | Evidence Reference |
|---|---|---|---|---|---|
| **1** | **Citizen Login & Simulation Header** | User logs in as `citizen@example.com`. UI shows prototype disclaimer banner. | `/dashboard` loads in citizen view; disclaimer banner visible; request headers contain `X-Demo-Role: citizen`. | **PASS** | `screenshot_01_citizen_view.png` |
| **2** | **Citizen Assistance Request** | Submit request at Jhocson St (`14.6042, 120.9946`) with low flood level. | Backend returns `201 Created` with opaque ID `req-synth-001`. Card displays `Pending Coordinator Review`. | **PASS** | API log: `POST /api/v1/requests 201` |
| **3** | **Coordinator Review & Triage** | Coordinator views incoming queue; inspects incident location. | Request appears in coordinator triage table with low flood badge and headcount `3`. | **PASS** | `screenshot_02_coordinator_triage.png` |
| **4** | **Deterministic A* Route & Flood Penalty** | Baseline route calculated; controlled flood injected on edge `BD`. | A* selects alternative route `AC -> CD` (cost 160 vs penalized route 210). Route explanation panel displays exact cost breakdown. | **PASS** | [`../../data/samples/routing-known-graph.example.json`](../../data/samples/routing-known-graph.example.json) |
| **5** | **Atomic Mission Assignment** | Coordinator assigns request to `rescuer-alpha`. | MongoDB transaction commits atomically: Request -> `assigned`, Mission created -> `assigned`, version 1. | **PASS** | DB transaction log; UI toast confirmation |
| **6** | **Rescuer Online Retrieval & Advance** | Rescuer Alpha signs in; retrieves mission; advances to `en-route`. | Mission displayed on card; status advances to `en-route` (Version 2). `offlineStore` caches mission to IndexedDB. | **PASS** | `screenshot_03_rescuer_online.png` |
| **7** | **Offline Disconnection & Stale Disclosures** | DevTools set to **Offline**. | `SyncStatusBadge` turns yellow (`Offline · Connectivity Lost`). Mission card displays `Cached · Possibly Stale` and `Conditions may have changed`. | **PASS** | `screenshot_04_offline_cached.png` |
| **8** | **Queued Status Advance while Offline** | Rescuer clicks *Mark Arrived*. | Idempotency UUID generated; entry persisted to IndexedDB. RescuerQueue displays `Pending Sync` (event ID visible). Action button locks. | **PASS** | `screenshot_05_pending_sync_locked.png` |
| **9** | **Disconnected Page Reload (`Ctrl+F5`)** | Hard reload page with network disabled. | Service worker delivers application shell. IndexedDB recovers mission (v2) and pending event byte-identically. Zero errors. | **PASS** | `offline-shell.js` service worker check |
| **10** | **Reconnection & Durable Auto-Sync** | DevTools set to **Online**. | RescuerQueue briefly displays `Syncing`, then acknowledges. Mission updates to `arrived`, Version 3. Badge turns green `Synced`. | **PASS** | `screenshot_06_synced_online.png`, Network 200 OK |
| **11** | **Negative: Severe Flood / No-Route** | Route requested with both candidate bridges severed by severe flood. | Engine returns `status: "no-route"`. `NoRouteState` renders alert warning dispatcher with forbidden straight-line substitute. | **PASS** | `screenshot_07_no_route_alert.png` |
| **12** | **Negative: Offline Version Conflict (409)** | Server bumped to version 4 while rescuer queued status at version 2. | On sync, server rejects with `HTTP 409 Conflict`. Queue displays `Sync Failed` alert, preserves event, shows server state (v4). | **PASS** | `screenshot_08_conflict_review.png` |
| **13** | **Conflict Recovery (Discard After Review)** | Rescuer inspects discrepancy and clicks *Discard Failed Event After Review*. | Event purged from IndexedDB; mission updates to authoritative server version 4; status action unlocks cleanly. | **PASS** | `screenshot_09_conflict_resolved.png` |
| **14** | **Negative: Multi-Rescuer Isolation** | While offline, switch user to `rescuer-beta`. | UI renders `Mission unavailable offline`. Zero leakage of Rescuer Alpha's cached mission or citizen coordinates. | **PASS** | `screenshot_10_actor_isolation.png` |

---

## 3. Accessibility, Keyboard, and Responsive Layout Audit

Verified across desktop and simulated mobile viewports during rehearsal:

| Audit Item | Verification Criteria | Observed Result | Status |
|---|---|---|---|
| **Keyboard Navigation** | All buttons, forms, and toggles reachable via `Tab` / `Shift+Tab` | Logical tab order preserved; no focus traps. | **PASS** |
| **Focus Indication** | Visible focus outline on interactive elements | `:focus-visible` ring renders with high contrast. | **PASS** |
| **Action Lock Accessibility** | Disabled retry button informs assistive tech | `aria-describedby="Reconnect before retrying"` announced. | **PASS** |
| **Status Announcements** | ARIA live regions for async changes | `role="status"` on sync badge, `role="alert"` on errors/conflicts. | **PASS** |
| **Narrow-Screen Layout (375px)** | iPhone SE viewport (375x667) | No horizontal scrollbar; grid collapses to single column; buttons full-width. | **PASS** |
| **Extreme Narrow Layout (320px)** | Minimum mobile boundary (320x568) | Card padding adjusts; text wraps cleanly without truncation or clipping. | **PASS** |

---

## 4. Known Disclosures & Non-Defect Build Warnings

The following items were observed during rehearsal and are verified as **known, documented Phase 5 items** (not defects):
1. **Frontend Large Bundle Warning:** `dist/assets/index.js` is ~650 kB (exceeds Vite 500 kB chunk threshold due to Leaflet and React dependencies). Handled cleanly by browser.
2. **ESLint Disclosures:** 4 non-blocking style/lint warnings in frontend build.
3. **Audit Warning:** npm reports a development dependency warning (`jsdom` -> `undici`) in test tooling. It does not affect production bundle runtime.
4. **Exploratory ML Separation:** External XGBoost model is intentionally absent from core runtime; `ML_ENABLED=false` verified.

---

## 5. Backup Video and Media Capture Requirements

> [!IMPORTANT]
> **Production Rule:** A backup recording or final slide deck does **NOT** exist until physically produced during the rehearsal capture session. This checklist specifies the exact capture parameters and required media assets to be created.

### 5.1 Video Recording Specifications
- **Software:** OBS Studio or Windows Game Bar (lossless capture).
- **Resolution & Frame Rate:** 1080p (1920x1080) at 30 fps or 60 fps.
- **Audio:** Clear microphone audio narrating each action, plus system audio for UI clicks/toasts.
- **Format:** High-bitrate MP4 (H.264 codec, AAC audio).
- **Target Storage Path:** `docs/presentation/backup/resqph_demo_backup_20261006.mp4`.

### 5.2 Mandatory Video Segments to Capture
1. **Segment A (Full Happy Path):** Citizen submit -> Coordinator A* route & assign -> Rescuer advance -> Offline toggle -> Disconnected reload -> Reconnect auto-sync.
2. **Segment B (No-Route Fallback):** Severe flood scenario resulting in explicit `NoRouteState` alert.
3. **Segment C (Conflict & Discard):** Version mismatch triggering HTTP 409, failed event review, and explicit discard.

### 5.3 Screenshot Evidence Package
- **Desktop Screenshots (1920x1080):** Steps 1 to 14 captured and stored under `docs/presentation/backup/screenshots/desktop/`.
- **Mobile Screenshots (375x667):** Steps 4, 7, 8, and 12 captured under `docs/presentation/backup/screenshots/mobile/`.
- **Privacy Verification:** All screenshots audited to confirm zero personal data, real phone numbers, or real residential addresses.

---

## 6. Rehearsal Outcome and Approval

- **Total Execution Steps:** 14
- **Passed Steps:** 14
- **Failed / Blocked Steps:** 0
- **Defects Identified:** None (zero blockers).
- **Conclusion:** Rehearsal against accepted main `df5a29d` is **successful**. The demo script, presentation outline, and fallback paths are completely evidence-aligned and ready for Phase 5 defense.

### Gate Sign-Off
- **Rehearsal Lead:** Clarence (`@ClarenceArillo`) — *Verified on 2026-10-06*
- **Reviewing Gate Owner:** Ranee Mikaella Gutierrez (`@seavens3nt`) — *Pending PR Merge*
