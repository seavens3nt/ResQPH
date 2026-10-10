# ResQPH demonstration script

**Owner:** Clarence. **Review:** Ranee, 2026-10-06 (Asia/Manila).
**Source baseline:** main `818aeee92159223df56787f647b4cc15361ef9b1`, incorporated into PR #81.
**Status:** Corrected demonstration plan; final all-role rehearsal remains blocked.

This is an academic U-Belt prototype, not official dispatch, live forecasting,
secure authentication or guaranteed safe navigation. Use synthetic data only.
Runtime ML remains disabled. The unmerged Ranee repair branch is not this baseline.

## 1. Setup — separate terminals

Complete the [setup guide](../SETUP.md) first. Start each terminal at your own
repository root, not Clarence's personal directory. Record `git rev-parse HEAD`.
Use a fresh, disposable demo database and available seeded team; do not clear
an existing user database to make the demonstration pass.

Database terminal:

```powershell
docker compose up -d
docker compose ps
```

Backend terminal, from the repository root:

```powershell
Set-Location backend
$env:MONGODB_DATABASE = 'resqph_presentation_demo'
$env:FRONTEND_ORIGINS = 'http://127.0.0.1:5189'
$env:ML_ENABLED = 'false'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend terminal, from the repository root:

```powershell
Set-Location frontend
$env:VITE_API_URL = 'http://127.0.0.1:8000/api/v1'
npm.cmd ci
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 5189 --strictPort
```

If the port is occupied, choose a free port and change CORS and preview together.
The API URL must be set before the build. Check API health and browser network
responses. Development-server refresh is not proof of offline shell caching.
Use ordinary reload for disconnected service-worker testing, not a cache-bypassing
hard refresh. Close only the terminals started for this rehearsal when finished.

## 2. Runnable API demonstration

Use this independently of the incomplete browser integration. Paste into a new
PowerShell terminal. Every identifier comes from the server; do not substitute
`req-synth-001`, sample cards or invented mission IDs.

The demonstration assigns `team-alpha` in the disposable database. If it is
already reserved, a 409 is expected: create a new disposable environment rather
than deleting records or forcing reassignment.

```powershell
$demoApi = 'http://127.0.0.1:8000/api/v1'
$citizen = @{'X-Demo-Role'='citizen'; 'X-Demo-User-Id'='presentation.citizen@example.test'}
$coordinator = @{'X-Demo-Role'='coordinator'; 'X-Demo-User-Id'='presentation.coordinator@example.test'}
$rescuer = @{'X-Demo-Role'='rescuer'; 'X-Demo-User-Id'='team-alpha'}
function Post-Demo($path, $headers, $body) {
    Invoke-RestMethod -Method Post -Uri "$demoApi$path" -Headers $headers -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 12)
}
$created = Post-Demo '/rescue-requests' $citizen @{
    location=@{address='Synthetic U-Belt presentation location'; point=@{type='Point'; coordinates=@(120.9931743,14.5983287)}}
    headcount=2; medical_needs=$false; reported_flood_level='low'
}
if ($created.status -ne 'pending') { throw 'Expected a persisted pending request.' }
$assignment = Post-Demo "/rescue-requests/$($created.id)/assignment" $coordinator @{
    team_id='team-alpha'; expected_request_version=$created.version
}
$mission = $assignment.mission
if ($assignment.request.id -ne $created.id -or $assignment.request.status -ne 'assigned') { throw 'Assignment/request mismatch.' }
$retrieved = Invoke-RestMethod -Uri "$demoApi/missions/$($mission.id)" -Headers $rescuer
if ($retrieved.request_id -ne $created.id) { throw 'Wrong assigned mission.' }
$routeInput = @{
    origin=@{type='Point'; coordinates=@(120.9938198,14.5977093)}
    destination=@{type='Point'; coordinates=@(120.9931743,14.5983287)}
    scenario_id='scenario-controlled-ubelt-001'; algorithm='astar'; include_ml_penalty=$false
}
$found = Post-Demo '/routes/evaluate' $coordinator $routeInput
if ($found.status -ne 'route-found' -or $found.cost_breakdown.ml_risk -ne 0) { throw 'Unexpected controlled routing result.' }
$routeInput.destination.coordinates = @(121.0036128,14.6117538)
$noRoute = Post-Demo '/routes/evaluate' $coordinator $routeInput
if ($noRoute.status -ne 'no-route' -or $noRoute.geometry) { throw 'A no-route result must not invent geometry.' }
$event = @{
    event_id=[guid]::NewGuid().ToString(); new_status='en-route'
    expected_mission_version=$mission.version
    client_recorded_at=[DateTimeOffset]::UtcNow.ToString('o'); source='online'
}
$advanced = Post-Demo "/missions/$($mission.id)/status-events" $rescuer $event
$replayed = Post-Demo "/missions/$($mission.id)/status-events" $rescuer $event
if ($advanced.version -ne 2 -or $replayed.status_history.Count -ne 1) { throw 'Status/idempotent replay mismatch.' }
$conflict = $event.Clone()
$conflict.event_id = [guid]::NewGuid().ToString()
$conflict.new_status = 'arrived'
try {
    Post-Demo "/missions/$($mission.id)/status-events" $rescuer $conflict | Out-Null
    throw 'Stale event unexpectedly succeeded.'
} catch {
    if ([int]$_.Exception.Response.StatusCode -ne 409) { throw }
    Write-Host 'PASS: stale event rejected with 409'
}
$invalid = @{
    location=@{address='   '; point=@{type='Point'; coordinates=@(120.9931743,14.5983287)}}
    headcount=0; medical_needs=$false; reported_flood_level='unknown'
}
try {
    Post-Demo '/rescue-requests' $citizen $invalid | Out-Null
    throw 'Invalid request unexpectedly succeeded.'
} catch {
    if ([int]$_.Exception.Response.StatusCode -ne 422) { throw }
    Write-Host 'PASS: invalid request rejected with 422'
}
Write-Host 'PASS: create, assignment, retrieval, controlled route, no-route and duplicate replay'
$created.id
$mission.id
```

Expected: creation/assignment HTTP 201; retrieval, route evaluation and status
HTTP 200; duplicate event does not add history; stale version 409; invalid request
422. Inspect the actual route reason/edges/costs instead of asserting fixed output.
The four-node AB/BD/AC/CD example is a **synthetic unit fixture**, not the actual
U-Belt route returned by this endpoint.

This slice proves selected API behavior only. It does not prove browser cache
acceptance, citizen status propagation, completion/team release or a full
cross-role user journey. The [frontend audit](../testing/TEAM-PHASE-05-FRONTEND.md)
records those integration gaps.

## 3. Browser rehearsal — required after repairs, not recorded as passed

Use separate Citizen, Coordinator/Dispatcher and Rescuer workspaces in separate
tabs after the local candidate is delivered and verified. No role-switch control
belongs in the approved final flow. Local code now uses tab-scoped identity;
repeat sign-out/reload/copied-tab isolation on the delivered revision rather than
treating the older shared-localStorage finding as its current implementation.

1. Citizen: valid synthetic email/password -> Request rescue modal -> edit ->
   Review request -> final submit. Leave optional details blank, verify API-confirmed
   transient success and tracking popup, and record the actual request ID.
2. Coordinator: verify the same request in the API queue and selected inspector.
   Assign the seeded `team-alpha`, not `rescuer-alpha@example.com`.
3. Rescuer: login identity must resolve to that team, retrieve the same mission
   and calculate its actual destination route. On this baseline a normal email
   is disconnected from team assignment; entering a team ID in Email is only a
   diagnostic workaround, not acceptable login behavior.
4. Advance assigned -> en-route -> arrived -> completion with details.
   Check the same citizen request, mission history and team availability.
5. Cache that freshly created mission online; wait for service-worker readiness.
   Disconnect the browser, ordinarily reload, queue one next-valid status,
   reload again, and confirm the same event ID and locked second action.
6. Reconnect. Verify HTTP acceptance, one durable history event, a cleared queue,
   truthful UI status and the next valid action. Do not claim success from badges alone.
7. Conflict: use another authorized session for the **same team** to advance the
   server while the first session retains a queued event at the old version.
   Reconnect; expect 409, preserved event, current server state and explicit
   review/discard. Do not manufacture a version bump or invent reassignment.
8. Test another team with no cached mission, rejected corrupt cache, keyboard
   focus entry/trap/Escape/restore, navigation, and 320px/desktop layouts.
9. Verify retired Volunteer entry, hazard-report workflow, rescuer hotline and
   alternative-route controls are absent. Keep one calculated route and explicit
   no-route behavior. Preserve historical records; do not run a reporting demo.

**Current stop condition:** #76 cache/status/route defects, #77 validation,
#78 navigation/focus, and #82/#83 product-flow repairs require delivered-candidate
acceptance. #84 is closed as not planned, not a demonstration prerequisite.
Do not bypass null fields with richer sample data, replace API records
with local cards, or call fixture-only offline evidence full MVP acceptance.

## 4. Evidence and recovery

- [API contract](../api/API_CONTRACT.md), [lifecycle](../workflows/RESCUE_LIFECYCLE.md).
- [Routing contract](../routing/ROUTING_CONTRACT.md), [known-graph fixture](../../data/samples/routing-known-graph.example.json).
- [Offline contract](../offline/OFFLINE_CONTRACT.md), [historical Phase 4 evidence](../testing/TEAM-PHASE-04-EVIDENCE.md).
- [Current frontend findings](../testing/TEAM-PHASE-05-FRONTEND.md), [routing/ML evidence](../testing/TEAM-PHASE-05-ROUTING-ML.md).
- [Rehearsal record](REHEARSAL_CHECKLIST.md).

For 403 check simulated role/actor; for 409 refresh and review rather than force
a state change; for 422 correct input; for network/database failure preserve
drafts and do not announce success. Record HTTP body, revision, request/mission/
event IDs and synthetic screenshots. Runtime fixes belong in separate scoped
PRs. A video or slide deck is not delivered by this Markdown package.
