# ResQPH presentation outline

**Owner:** Clarence. **Review:** Ranee, 2026-10-06 (Asia/Manila).
**Baseline:** main `818aeee` plus this documentation PR.
**Status:** Evidence-aligned outline, not a finished slide deck or accepted final demo.

## Slide 1 — Identity and limitation

ResQPH: flood-aware rescue coordination and routing academic prototype.
COM243 / CCSFEN1L; Code Tayo Right-Neow. Project-defined U-Belt area, City of
Manila; not official dispatch, flood forecasting or emergency-ready deployment.
Use the [approved scope](../requirements/MVP_SCOPE.md).

## Slide 2 — Motivation and constrained objective

Explain the design problem: structured rescue requests, coordinator assignments,
explainable route penalties and limited operation during connectivity loss.
These are project motivations, not findings from an unprovided user study.
Add a primary citation before presenting flood prevalence or outage statistics.

## Slide 3 — Three roles and final flow

Citizen requests/tracking; Coordinator/Dispatcher review/assignment;
Rescuer mission/status. Volunteer reporting, rescuer hotline and alternative-route
UI are retired; #84 is closed as not planned. The local independent-tab/modal
candidate (#82/#83/#78) still needs delivery and full acceptance, not merely
screenshots or fixture checks. Use Inter and current shared visual rules.
Use [DEMO_SCRIPT.md](DEMO_SCRIPT.md) to distinguish API demonstration from browser blockers.

## Slide 4 — Stack and architecture

React 19, TypeScript, Vite, React Router 7, Leaflet/React Leaflet, Axios,
TanStack Query, Zod, Dexie/IndexedDB; Python 3.12, FastAPI, Pydantic, async PyMongo;
MongoDB 8 replica set; OSMnx/NetworkX geospatial routing.
Versions come from package manifests/lockfiles, not assumed earlier releases.
Frontend -> API routes -> services/repositories -> MongoDB, with a separate
deterministic routing adapter. UI shell service worker is not API/tile caching.
References: [architecture](../ARCHITECTURE.md), [database schema](../database/MONGODB_SCHEMA.md).

## Slide 5 — Lifecycle and transactions

Intended lifecycle: pending request -> assigned mission -> en-route -> arrived
-> completed; pending cancellation is constrained. Assignment creates the
mission, reserves the team and updates the request atomically.
Mission status/history/idempotent replay and linked request/team propagation
are verified by PR #80's real-database tests, including completion/team release.
This is backend evidence; #83's remaining browser/UI surfaces still need review.
References: [lifecycle](../workflows/RESCUE_LIFECYCLE.md), [API](../api/API_CONTRACT.md).

## Slide 6 — Deterministic routing

Base travel cost + deterministic flood penalty + restricted penalty + bounded
accepted ML contribution. Runtime ML contribution is currently zero. Severe/
impassable edges are excluded, never restored by ML. These penalties are
prototype units, not scientifically validated safety thresholds.
The synthetic four-node fixture demonstrates 120 baseline versus 160 detour
and a 210 rejected penalized path. Actual U-Belt output uses OSM edge IDs and
returned costs; there is no UI button that injects flood on synthetic BD.
References: [cost contract](../routing/ROUTING_CONTRACT.md), [known graph](../../data/samples/routing-known-graph.example.json).

## Slide 7 — External ML experiment

Preserved historical Ondoy 2009 exploratory XGBoost evidence. Reported random-row
holdout: AUC 0.9763, recall 0.9231, precision 0.2382, F1 0.3787; 307 false
positives and 8 false negatives. Metrics were not regenerated from raw data in
this review and do not establish spatial/temporal or U-Belt generalization.
Target: `flooded_ondoy_2009`; ordered features: road length, speed, elevation,
flood depth, hazard class, road class code, evacuation distance. The runtime
target/features differ. `ML_ENABLED=false`; rules remain the fallback.
Reference: [ML feasibility](../ml/ML_FEASIBILITY.md).

## Slide 8 — Limited offline behavior

One assigned mission and one next-valid queued status per actor. Dexie tables:
`missions` and `queues`, keyed by `actor_id`. Production service worker caches
UI assets, not dynamic API responses or map tiles. Pending is not accepted;
failed events remain reviewable. No offline request creation or batch merging.
Reference: [offline contract](../offline/OFFLINE_CONTRACT.md).

## Slide 9 — Evidence boundary and browser defects

Historical fixture-based Phase 4 evidence is useful but is not fresh-mission
acceptance. PR #79's real browser journey exposed null-summary cache rejection,
accepted status falsely shown pending, team/email mismatch, mixed coordinator
records and missing mission route controls. Modal focus/navigation require
delivered-candidate acceptance; report persistence is retired, not remaining work.
Show this accurately; do not use nonexistent
screenshots or assert a completed rehearsal.
Reference: [current frontend evidence](../testing/TEAM-PHASE-05-FRONTEND.md).

## Slide 10 — Negative scenarios

Actual route-found/no-route controlled API probes; no invented replacement path.
Same-team stale event receives 409, and duplicate replay adds no event.
Browser conflict/reload/isolation must be repeated after fresh cache works.
Distinguish automated assertions, observed HTTP behavior and manual browser checks.
Reference: [routing/ML acceptance](../testing/TEAM-PHASE-05-ROUTING-ML.md).

## Slide 11 — Contributions

| Member | Accountability and inspected artifacts |
| --- | --- |
| Ranee / @seavens3nt | PM/core backend/integration/gates; lifecycle and Phase 4 gate |
| Jared / @AshenDary | Backend mission/history/API and database tests; PR #80 remains a separate package |
| Elle / @Qiuyuan26 | Primary UI/UX/citizen flow/map/offline client; PRs #22, #42, #65, #79 |
| Matthew / @matthew-sudo2 | Geospatial/routing/external ML; [routing/ML evidence](../testing/TEAM-PHASE-05-ROUTING-ML.md) |
| Clarence / @ClarenceArillo | Coordinator/rescuer presentation and offline surfaces; this script/outline/checklist |

Accountability is not proof that one member authored every line. Use PR history
for contribution attribution; do not add observers or completed rehearsals without evidence.

## Slide 12 — Verification

Use the exact revision/results in [REHEARSAL_CHECKLIST.md](REHEARSAL_CHECKLIST.md).
Frontend uses **Oxlint**, not ESLint. PR #79 recorded 248 passing tests and a
successful build with existing warnings; that is historical evidence, not a
new browser pass. Opt-in database tests must be reported separately from skipped
default-suite tests. Passing CI does not override a failed browser journey.

## Slide 13 — Demonstration and backup

Run the API script against isolated synthetic data; display actual IDs/status/
route results. Only present the complete same-record browser/offline journey
after its blockers are repaired and evidence recorded.
Capture sanitized desktop/mobile screenshots and a narrated local recording;
neither a final deck nor backup recording is delivered by these files.

## Slide 14 — Conclusion and remaining gate

What is demonstrated: deterministic controlled routing and selected persistent
API operations, with explicit failure contracts. What is not yet accepted:
complete fresh-browser integration, final rehearsal/media/submission.
Google Maps, production identity, live ingestion, expanded offline maps and
model activation remain separately approved future work, not this PR.
No merge authorizes operational emergency use or deployment.
