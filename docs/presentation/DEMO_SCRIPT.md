# ResQPH Demonstration Script — Phase 5 Evidence-Aligned Workflow

**Document Version:** 1.0.0  
**Phase Baseline:** Team Phase 5 (`df5a29d` post Issue #64 gate merge)  
**Author:** Clarence (UI/UX and Frontend Contributor)  
**Gate Owner / Reviewer:** Ranee (Project Manager and Primary Backend Contributor)  
**Execution Context:** Local development and production preview environments  

---

## 1. Objective and Scope Boundary

This document provides a runnable, repeatable, evidence-aligned demonstration script for the ResQPH prototype. It demonstrates how a citizen rescue request, coordinator assignment, deterministic flood-aware routing, rescuer mission execution, and resilient offline status queuing operate as a unified, resilient system within the **U-Belt pilot area, City of Manila**.

### Crucial Project Disclosures and Boundaries
- **Academic Prototype:** ResQPH is an academic research prototype. It is **not** an official emergency-response, dispatch, flood-forecasting, or guaranteed road-safety system.
- **Geographic Pilot Boundary:** Constrained to `ubelt-pilot-v1` (WGS 84 bounds: West `120.982000`, South `14.596000`, East `121.004000`, North `14.617500`; [`data/samples/study-area.geojson`](../../data/samples/study-area.geojson)).
- **Role Simulation:** All logins use prototype role simulation via headers (`X-Demo-User-Id`, `X-Demo-Role`) and client storage. This is **not** secure production authentication.
- **Controlled Scenarios:** Road flood levels and impassability are controlled academic test fixtures, not live sensor feeds or hydrological forecasts.
- **Offline Limits:** Offline capability supports viewing exactly **one** previously synchronized assigned mission and queuing at most **one** next-valid status transition. Full offline map-tile downloads, offline request creation, and multi-device merging are explicitly excluded ([`docs/offline/OFFLINE_CONTRACT.md`](../offline/OFFLINE_CONTRACT.md)).
- **Exploratory ML:** The candidate XGBoost classifier is preserved as external exploratory evidence only ([`docs/ml/ML_FEASIBILITY.md`](../ml/ML_FEASIBILITY.md)). Runtime routing operates with `ML_ENABLED=false` using deterministic rule-based safety penalties.

---

## 2. Environment Prerequisites and Services

All demonstration commands are executed from the repository root:
`c:\Users\CLARENCE\OneDrive\Documents\NU\3rd Year\1st Term\Software Engineering 1\ResQPH-II\ResQPH`

### 2.1 Software Requirements
- **Git** (tracking branch `main` at `df5a29d`)
- **Node.js** `22.x` LTS and **npm** `10.x`
- **Python** `3.12` (64-bit) with virtual environment (`backend/.venv`)
- **Docker Desktop** (WSL 2 backend) running MongoDB 8.x single-node replica set

### 2.2 Service Startup Commands

#### Step 1: Start MongoDB Replica Set
```powershell
docker compose up -d
docker compose ps
```
*Expected Output:* Container `resqph-mongodb` is running and healthy on port `27017`.

#### Step 2: Start Backend (FastAPI)
```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m fastapi dev app\main.py --port 8000
```
*Expected Output:*
- Application startup complete.
- Uvicorn running on `http://127.0.0.1:8000` (API documentation at `http://127.0.0.1:8000/docs`).

#### Step 3: Start Frontend (Production Preview for Offline Shell)
*Note:* True disconnected reload requires the production service-worker application shell built by Vite ([`docs/SETUP.md`](../SETUP.md)).
```powershell
Set-Location frontend
npm run build
npm run preview -- --port 5189
```
*Expected Output:* Built assets in `dist/`, preview server running on `http://localhost:5189`.

---

## 3. Demonstration Roles and Synthetic Personas

| Role | Persona / Identifier | Initial View | Intended Demo Actions |
|---|---|---|---|
| **Citizen** | `citizen@example.com` (`citizen-maria`) | `/login?role=citizen` -> `/dashboard` | Submit emergency assistance request in U-Belt; track live status. |
| **Coordinator** | `coordinator@example.com` (`coord-santos`) | `/login?role=coordinator` -> `/dashboard` | Review incoming requests; inspect flood map; assign mission to rescuer. |
| **Rescuer (Alpha)** | `rescuer-alpha@example.com` (`rescuer-alpha`) | `/login?role=rescuer` -> `/dashboard` | View assigned mission; simulate offline connectivity loss; queue update; sync. |
| **Rescuer (Beta)** | `rescuer-beta@example.com` (`rescuer-beta`) | `/login?role=rescuer` -> `/dashboard` | Demonstrate strict actor isolation while offline (no cached mission leakage). |

---

## 4. End-to-End Workflow Demonstration

### Phase 1: Citizen Rescue Request Submission (Online)

1. **Navigate to Application:**
   - Open Chrome Incognito window at `http://localhost:5189`.
   - The landing page displays the prototype notice banner: *"Academic flood-aware rescue prototype for U-Belt Manila"*.
2. **Simulate Citizen Login:**
   - Navigate to `/login?role=citizen`.
   - Enter email `citizen@example.com` and arbitrary demo password.
   - Click **Sign In**. Redirects to `/dashboard` in Citizen view.
3. **Submit Rescue Request:**
   - Fill in the assistance form:
     - **Location Address:** `Block 5 Lot 21 Jhocson St., Sampaloc, Manila` (within U-Belt bounds).
     - **Coordinates:** Latitude `14.6042`, Longitude `120.9946`.
     - **Headcount:** `3` (including 1 elderly person).
     - **Reported Flood Level:** `low` (ankle-to-knee water).
     - **Situation Summary:** `Water entering ground floor; power cut; evacuation assistance needed.`
   - Click **Submit Request**.
4. **Verification:**
   - API emits `POST /api/v1/requests` with headers `X-Demo-Role: citizen`, `X-Demo-User-Id: citizen@example.com`.
   - Response: `201 Created` with `status: "pending"`, `version: 1`, assigned opaque `id` (e.g., `req-synth-001`).
   - UI Card updates to display status badge: **Pending Coordinator Review**.

---

### Phase 2: Coordinator Review, Assignment, and Deterministic Routing (Online)

1. **Switch to Coordinator Role:**
   - Click user profile menu -> **Switch Role / Sign Out**.
   - Navigate to `/login?role=coordinator`, sign in as `coordinator@example.com`.
2. **Review Triage Dashboard:**
   - Incoming request `req-synth-001` appears in the triage list with `low` flood badge and headcount `3`.
3. **Inspect Flood-Aware Route & Explanation:**
   - Click **Plan Route** for the incident.
   - Origin: Rescue Staging HQ (España Blvd, `[120.9900, 14.6040]`).
   - Destination: Jhocson St (`[120.9946, 14.6042]`).
   - **Baseline Evaluation:** A* algorithm computes the optimal path across the bounded OSM graph (`AB -> BD`, cost 120 units).
   - **Controlled Flood Injection:** Introduce controlled scenario where segment `BD` has `moderate` flood (+90 penalty).
   - **Reroute Result:** A* recalculates and selects alternative corridor `AC -> CD` (cost 160 vs rejected path cost 210).
   - **Route Explanation Display:** UI panel shows transparent breakdown:
     - *Preferred Route:* Corridor `AC -> CD` (total cost 160).
     - *Avoided Segment:* `BD` penalized +90 cost units due to moderate flood condition.
     - *Safety Rule:* Deterministic penalty applied; no unsafe shortcuts.
4. **Assign Mission to Rescuer Team:**
   - Select available unit: `rescuer-alpha` (Rescue Boat Team Alpha).
   - Click **Confirm Assignment**.
   - Backend processes multi-document MongoDB transaction:
     - Request status transitions: `pending` -> `assigned`.
     - Mission document created: `mission-synth-001` with `status: "assigned"`, `assigned_rescuer_id: "rescuer-alpha"`, `version: 1`.
   - UI Toast confirms: *"Mission mission-synth-001 assigned to rescuer-alpha"*.

---

### Phase 3: Rescuer Retrieval and Status Advance (Online)

1. **Switch to Rescuer Alpha:**
   - Sign in as `rescuer-alpha@example.com`.
   - View `/dashboard` in Rescuer Console.
2. **Initial Online Cache Synchronization:**
   - Console displays **Assigned Mission** card: `mission-synth-001`.
   - Status: `assigned` (Version 1).
   - Sync Badge displays: `Online – Up-to-date`.
   - IndexedDB stores the validated mission record via `offlineStore.ts` with `last_synced_at` timestamp.
3. **Advance to En-Route:**
   - Click **Begin Travel (En Route)**.
   - API `POST /api/v1/missions/mission-synth-001/status` with `new_status: "en-route"`, `expected_mission_version: 1`.
   - Response: `200 OK`, Mission updated to `en-route` (Version 2).
   - Rescuer card displays **En route**, Version 2.

---

### Phase 4: Disconnection, Disconnected Reload, and Queued Transition (Offline)

1. **Simulate Field Network Failure:**
   - Open Chrome DevTools (`F12`) -> **Network** tab -> select **Offline** throttle preset.
   - SyncStatusBadge immediately updates to: **Offline · Connectivity Lost**.
2. **Verify Cached Presentation & Disclosures:**
   - RescuerMissionCard reflects offline state:
     - Header displays: `Cached · Possibly Stale`.
     - Subtitle discloses: *"Cached API mission for offline reference; conditions may have changed."*
     - Timestamp shows: `Last synced: <time>` inside `<time dateTime="...">`.
     - Notice displayed: *"Conditions may have changed."*
3. **Advance Status while Offline (Queued Action):**
   - Click **Mark Arrived at Location**.
   - Client detects offline mode; `useOfflineMission` intercepts action.
   - Unique idempotency UUID generated (`crypto.randomUUID()`).
   - Queued record persisted into IndexedDB:
     ```json
     {
       "localId": "event-uuid-001",
       "missionId": "mission-synth-001",
       "body": {
         "event_id": "event-uuid-001",
         "new_status": "arrived",
         "expected_mission_version": 2,
         "client_recorded_at": "2026-10-06T...",
         "source": "offline-sync"
       },
       "syncState": "pending"
     }
     ```
   - **Queue Presentation:**
     - `RescuerOfflineQueue` panel renders with role `status`: **Pending Sync**.
     - Event ID and expected mission version (`2`) are explicitly visible.
     - Warning shown: *"This update has not been accepted by the server."*
     - Button **Retry Sync Now** is disabled with accessible description: *"Reconnect before retrying."*
     - Mission Card action button changes to **Status update awaiting review** and is strictly disabled.
4. **Demonstrate True Disconnected Application Reload:**
   - With DevTools still set to **Offline**, press `Ctrl+F5` (Hard Reload).
   - **Observation:**
     - The Service Worker serves the application shell (`index.html`, compiled JS/CSS).
     - RescuerView initializes from IndexedDB without network requests.
     - Cached mission (`mission-synth-001`, `en-route`, version 2) and pending event (`event-uuid-001`, `arrived`, version 2) are recovered byte-for-byte.
     - No blank screen, no crash, no invented server acceptance.

---

### Phase 5: Reconnection and Durable Synchronization (Happy Path)

1. **Restore Network Connectivity:**
   - In DevTools Network tab, switch from **Offline** back to **No throttling** (Online).
   - Window fires `online` event; `useOfflineMission` initiates auto-synchronization.
2. **Observe Sync Transition:**
   - RescuerOfflineQueue temporarily displays role `status`: **Syncing** with message: *"Acceptance is not confirmed until a response is received."*
   - Backend receives `POST /api/v1/missions/mission-synth-001/status` with `event_id: "event-uuid-001"`, `expected_mission_version: 2`.
   - Backend validates transition, commits update, bumps mission version to `3`, and records event in idempotency log.
3. **Verification of Acceptance:**
   - RescuerView receives HTTP 200 response with updated mission.
   - `acknowledgeEvent` in IndexedDB marks event complete and clears queue.
   - RescuerCard updates to **Arrived**, Version 3.
   - SyncStatusBadge turns **Synced** (green) and returns to **Online – Up-to-date**.
   - Mission action unlocks for the next valid step (`Complete Mission`).

---

## 5. Negative and Fallback Scenarios

### Scenario A: Severe Flooding and No-Route Fallback

1. **Trigger Condition:**
   - Coordinator plans route to an isolated pocket where all connecting edges (`BD` and `CD`) are marked `severe` / `impassable` in the controlled scenario.
2. **Expected System Response:**
   - A* routing engine evaluates graph; all candidate paths are severed by safety exclusion rules.
   - Engine returns structured no-route response:
     ```json
     {
       "status": "no-route",
       "reason": "controlled_impassability_disconnected_destination",
       "warnings": [
         "No eligible route exists under the selected controlled scenario.",
         "Do not draw a straight-line or ordinary shortest-path substitute."
       ]
     }
     ```
3. **UI Presentation:**
   - `NoRouteState` component renders with role `alert`:
     - Heading: **No eligible route under this controlled scenario**.
     - Message: *"No eligible route was returned. No substitute path has been evaluated or shown."*
     - Clear advisory: *"Review the request inputs or controlled scenario before submitting another request. This result does not establish that another path is safe."*
     - Reason displayed: `controlled impassability disconnected destination`.
4. **Recovery Path:**
   - Coordinator does not dispatch team into hazard; marks incident for boat staging or waits for updated scenario water levels.

---

### Scenario B: Offline Status Conflict (HTTP 409 Version Conflict)

1. **Trigger Condition:**
   - Rescuer Alpha is offline with a queued status advance (`completed` expecting Version 3).
   - In parallel, Coordinator updates or re-assigns the mission on the server, advancing the server mission version to Version 4.
2. **Reconnection & Conflict Detection:**
   - Rescuer Alpha reconnects. Client transmits queued event expecting version 3.
   - Backend detects version mismatch (`expected 3, current 4`) and returns `HTTP 409 Conflict`.
3. **UI Presentation & Queue Lock:**
   - Client marks entry `syncState: "failed"`.
   - `RescuerOfflineQueue` renders role `alert`: **Sync Failed: event preserved for review**.
   - Displays exact error: `HTTP 409: version conflict`.
   - Preserves rescuer's attempted event ID and notes.
   - Displays latest authoritative server state: `Current server state: arrived, version 4`.
   - Mission card action remains locked to prevent further out-of-order writes.
4. **Recovery Path:**
   - Rescuer inspects the difference between their pending event and the server state.
   - Rescuer clicks button: **Discard Failed Event After Review**.
   - Client purges failed event from IndexedDB, syncs with server Version 4, and unlocks the interface based on authoritative server data.

---

### Scenario C: Offline Actor Isolation (Multi-Rescuer Security)

1. **Trigger Condition:**
   - Device was used by Rescuer Alpha (`mission-synth-001` cached).
   - Network is disconnected.
   - User logs out and switches to Rescuer Beta (`rescuer-beta@example.com`).
2. **Expected Behavior:**
   - `useOfflineMission("rescuer-beta@example.com")` queries IndexedDB store key for `rescuer-beta`.
   - No cached mission exists for Beta.
3. **UI Presentation:**
   - RescuerView renders: **Mission unavailable offline**.
   - Subtitle: *"No previously synchronized mission is stored for this rescuer account."*
   - Explanatory status: *"Reconnect to load an assigned mission. No mission or map is available from the offline cache."*
   - **Verification:** Alpha's mission, citizen details, and coordinates are strictly isolated and never displayed to Beta.

---

## 6. Summary of Evidence Alignment

| Demonstration Claim | Authoritative Contract | Verifying Test / Evidence Source |
|---|---|---|
| Single mission cache & 1 queued event | [`docs/offline/OFFLINE_CONTRACT.md`](../offline/OFFLINE_CONTRACT.md) | `frontend/src/features/offline/offlineStore.test.ts` |
| Preserved failed event on conflict & review | [`docs/offline/OFFLINE_CONTRACT.md`](../offline/OFFLINE_CONTRACT.md) | `frontend/src/pages/dashboard/views/rescuer/RescuerOfflinePresentation.test.tsx` |
| Disconnected reload application shell | [`docs/phases/TEAM-PHASE-04-GATE.md`](../phases/TEAM-PHASE-04-GATE.md) | `frontend/public/offline-shell.js`, preview server check |
| Deterministic A* routing & flood penalties | [`docs/routing/ROUTING_CONTRACT.md`](../routing/ROUTING_CONTRACT.md) | `data/samples/routing-known-graph.example.json`, routing tests |
| No-route handling without invented paths | [`docs/routing/ROUTING_CONTRACT.md`](../routing/ROUTING_CONTRACT.md) | `data/samples/no-route.example.json`, `NoRouteState.test.tsx` |
| External ML exploratory boundary & rule fallback | [`docs/ml/ML_FEASIBILITY.md`](../ml/ML_FEASIBILITY.md) | `test_team_phase3_ml_route_fallback.py` |
| Prototype role simulation header validation | [`docs/api/API_CONTRACT.md`](../api/API_CONTRACT.md) | Backend FastAPI test suite (`test_auth_simulation.py`) |
| Atomic request/mission state transition | [`docs/workflows/RESCUE_LIFECYCLE.md`](../workflows/RESCUE_LIFECYCLE.md) | `test_phase4_integration.py` against MongoDB replica set |

---

## 7. Operational Troubleshooting and Defect Reporting

If any step in this demo fails to execute as specified:
1. **Do not modify frontend or backend code directly** (this is a presentation/QA package).
2. Record the exact console log, terminal trace, network status, and visual screenshot.
3. Identify the defect by name (e.g., `DEFECT-DEMO-OFFLINE-SHELL-TIMEOUT`).
4. Report the defect in the assigned Phase 5 issue for Ranee's scoped repair and verification.
