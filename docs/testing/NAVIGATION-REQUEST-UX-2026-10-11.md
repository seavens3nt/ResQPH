# Navigation and request UX checkpoint — 2026-10-11

## Baseline and delivery

- Started with a clean working tree; fetched origin.
- Accepted baseline: `a143a18acea7fa6897cd7bce196dec912bf7dcdd`, then the latest `origin/temporary-main`.
- Working branch: `feature/navigation-request-ux`.
- Delivery is a feature-branch checkpoint with browser acceptance pending. No PR,
  merge, force push, or push to `main` / `temporary-main` is authorized for this task.
- The developer database, account credentials, ignored environments and local-demo
  files were not changed. No backend code/contracts changed or backend tests rerun.

## Implementation and evidence

| Requirement | Result |
| --- | --- |
| Existing Routes page | Reuses stored route and server tracking; existing lifecycle card/controller and completion dialog are now available on Routes and its detail entry. The card's second tracking map/query is disabled in these views. |
| Heading and camera | Short forward lookahead, duplicate/short/stationary/endpoint handling, shortest-angle smoothing. Marker and camera consume the same interpolated position. First navigation framing uses zoom 17; polling does not reset zoom. |
| Follow controls | Direct pointer/wheel/keyboard input suspends following; programmatic camera events do not. Follow/Recenter resumes; Full Route suspends and fits; north-up switch clears heading/tilt. |
| Google fallback | Requests VECTOR, observes actual rendering type; unavailable vector support falls back to north-up, zero tilt. Center remains subject to existing study bounds. Actual device rendering is unverified. |
| Stale/offline/arrival | Animation freezes for failed updates, browser offline, hidden tabs or server timestamps older than 15 seconds. Cleanup cancels frames/listeners. Reduced motion settles at received positions with no tilt; arrival settles to the latest authoritative point and preserves explicit completion. |
| Marker | Original locally authored shaded SVG, `frontend/src/features/map/assets/response-vehicle.svg`; no third-party asset or license dependency. This is 3D-style artwork, not a 3D model. Center anchor; heading minus camera heading applied once; accessible name and triangle fallback. Fixed five headquarters and incident pins remain independent. |
| Raw road table | Removed the active table/disclosure and unused styles. Road/flood overlays, route feedback and attribution remain. Short journey descriptions expose station, destination, state and remaining distance/time. |
| Citizen location | Scoped green confirmation, 48px target, focus/hover/disabled states. Coordinates validated with the existing schema before confirmation. Pin/GPS changes invalidate confirmation; unrelated validation errors remain. Unconfirmed submission focuses and scrolls to the location error. |
| No coordinate entry | Request and review remove raw coordinate fields/text. Click/drag/GPS and native keyboard-operable directional buttons retain longitude-first payloads, boundary validation, optional notes and draft behavior. Empty address still uses `Pinned location`. |
| Role presentation | Routes opts into heading-up; citizen journey remains north-up. Both use existing server journey data. |
| Performance/cost | No new dependencies or service calls. Existing loader/map retained; static road/flood overlays no longer rebuild on each progress update. No polling cadence increase or cloud changes. |

### Automated checks

Run in `frontend/`:

```sh
npm run lint
npm test -- --run
npm run build
```

- Lint: exit 0, six existing warnings in LandingPage, AuthContext, MissionContext and shared.tsx.
- Tests: 54 files / 376 tests passed. New SDK-mocked behavioral tests cover shared
  camera/marker position, fixed HQs, follow controls, orientation/raster fallback,
  freeze/cleanup, reduced motion and arrival. Pure geometry tests cover angular wrap,
  duplicates, endpoints, missing and stationary paths. Form tests cover pin validation,
  confirmation invalidation, unrelated errors, focus, GPS failures, drafts and payloads.
  Routes lifecycle test exercises Accept, Arrived and explicit completion via the existing controller.
- Build: TypeScript and Vite pass; existing large-chunk warning remains.
- Repository: `git diff --check` passes.
- Google SDK in component tests is mocked; these tests do not establish WebGL support,
  real camera appearance, browser keyboard activation, responsive visual quality or real API lifecycle acceptance.

## Browser blocker and manual acceptance

The browser runtime returned `No browser is available`; discovery returned no connected
browsers. No browser mission was created or progressed. No screenshots/recordings exist
for this checkpoint. Heading-up and tilt have **not** been browser-verified.

Teammates with a clean checkout can fetch and switch to the feature branch:

```sh
git fetch origin
git switch --track origin/feature/navigation-request-ux
./dev.sh --install
```

If the branch already exists locally, switch to it and use `git pull --ff-only`.
Default development UI: `http://localhost:5173/`; API: `http://localhost:8000`.
Follow [setup](../SETUP.md) for prerequisites. Use local environment values and locally
provisioned synthetic accounts; checking out this branch does not copy accounts or secrets.
Use a disposable acceptance database for the following record-mutating walkthrough.

1. In separate browser profiles, sign in as a citizen and a provisioned station rescuer.
2. Citizen: click a pin, adjust with Tab/Enter on directional buttons, confirm with the
   green action. Move again and verify reconfirmation is required. Deny GPS and verify
   pin controls still work. Try an outside-area location and confirm rejection. Leave
   address blank, review, and submit a synthetic request.
3. Station: verify receipt, open Routes, Accept & Start. Watch turns: vehicle remains
   on the displayed stored route; camera follows the same position; headquarters remain fixed.
4. Pan, wheel zoom and rotate manually; verify following pauses. Recenter; verify follow
   resumes. Show Full Route; verify no automatic refit/follow. Switch north-up and back.
5. Citizen: verify calm north-up view and matching mission/progress. Simulate connection
   loss and background the tab; verify no movement beyond the last server update.
6. Verify reduced-motion mode and mobile/desktop sizing, readable green action,
   keyboard focus order, zoom controls and no raw road table or coordinate inputs.
7. Station: Arrived, then Complete with the existing confirmation. Verify both roles
   show the server outcome. Preserve any failed offline event for existing review/replay.
8. Capture sanitized screenshots/recordings after connecting browser tooling. Record
   actual renderer/device results before treating the checkpoint as accepted.

## Google Maps configuration

Keep existing key values private. In `frontend/.env.local`, configure
`VITE_GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_MAP_ID`, then restart Vite.
Use a JavaScript Map ID configured for vector rendering and a browser/device with WebGL
support. The app requests vector rendering and enables heading/tilt interaction only for
navigation. Confirm the actual renderer in the browser; north-up fallback is intentional.
No new navigation, Routes, Roads, Directions, Places or Geocoding service is required.

Official references: [rendering types](https://developers.google.com/maps/documentation/javascript/map-rendering-type),
[vector maps and camera controls](https://developers.google.com/maps/documentation/javascript/vector-map).

## Exact changed files

- `.agents/skills/resqph-project-context/references/current-status.md`
- `.agents/skills/resqph-project-context/references/sync-history.md`
- `docs/STATUS.md`
- `docs/testing/NAVIGATION-REQUEST-UX-2026-10-11.md`
- `frontend/src/features/map/InteractiveFloodMap.test.tsx`
- `frontend/src/features/map/InteractiveFloodMap.tsx`
- `frontend/src/features/map/NavigationCamera.test.tsx`
- `frontend/src/features/map/assets/response-vehicle.svg`
- `frontend/src/features/map/map.css`
- `frontend/src/features/map/navigation.test.ts`
- `frontend/src/features/map/navigation.ts`
- `frontend/src/features/requests/validation.ts`
- `frontend/src/features/workspace/CitizenDraft.test.tsx`
- `frontend/src/features/workspace/MissionRoute.tsx`
- `frontend/src/features/workspace/RequestRescueModal.test.tsx`
- `frontend/src/features/workspace/RescuerNavigationActions.test.tsx`
- `frontend/src/features/workspace/RescuerWorkspace.tsx`
- `frontend/src/features/workspace/workspace.css`
- `frontend/src/pages/dashboard/views/citizen/CitizenRequestFlow.test.tsx`
- `frontend/src/pages/dashboard/views/citizen/RequestForm.tsx`
- `frontend/src/pages/dashboard/views/citizen/RequestLocationMap.tsx`
- `frontend/src/pages/dashboard/views/citizen/RequestReview.tsx`
- `frontend/src/pages/dashboard/views/citizen/RequestStatusView.tsx`
- `frontend/src/pages/dashboard/views/rescuer/RescuerMissionCard.tsx`
- `frontend/src/test/phase5RoleFlows.test.tsx`
