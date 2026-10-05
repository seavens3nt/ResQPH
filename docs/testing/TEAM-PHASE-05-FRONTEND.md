# Team Phase 5 frontend acceptance evidence — Issue #71

**Date:** 2026-10-05 (Asia/Singapore)\
**Owner:** Elle — frontend acceptance package\
**Branch:** `test/71-frontend-acceptance`\
**Base:** accepted `origin/main` at `df5a29d` (merge of Phase 4 gate PR #69)\
**Result:** component regression and frontend checks pass; production browser and real API acceptance remain unverified in this environment.

## Changed evidence files

- `frontend/src/test/phase5RoleFlows.test.tsx` — role-view/API-client regressions using the production API modules and Axios adapter boundary. The adapter supplies synthetic HTTP contract responses; it does not replace the API service or represent a server run.
- `frontend/src/test/phase5OfflineShell.test.ts` — isolated service-worker checks with mocked browser worker/cache/fetch APIs.
- `docs/testing/TEAM-PHASE-05-FRONTEND.md` — this record.

No product code or files outside Issue #71 ownership were changed.

## Revision and commands

Run from `frontend/` on the branch above. In this PowerShell environment, `npm.ps1` is unsigned and blocked by execution policy, so the equivalent `npm.cmd` shim was used.

| Command | Result |
|---|---|
| `npm.cmd run lint` | Pass. Four existing warnings remain: `LandingPage.tsx` state update in effect; `shared.tsx`, `AuthContext.tsx`, and `MissionContext.tsx` Fast Refresh exports. |
| `npm.cmd test -- --run --pool forks --maxWorkers 1` | Pass: 28 test files, 242 tests. Single-worker flags avoid excessive worker startup in this environment. |
| `npm.cmd run build` | Pass: 303 modules transformed. Existing bundle-size warning: JS bundle 891.47 kB minified (over 500 kB). |
| `npm.cmd exec -- vitest run --pool forks --maxWorkers 1 src/test/phase5RoleFlows.test.tsx src/test/phase5OfflineShell.test.ts` | Pass: 2 files, 8 tests (focused rerun). |
| `git diff --check` | Pass. |

The focused 8-test run, full 242-test suite, lint, and production TypeScript/Vite build passed after the final test changes.

## Component regression evidence — HTTP transport mocked

The new role tests exercise the production API modules and production React components while the Axios adapter returns controlled synthetic responses. Request URL, method, role header, submitted body/version, and rendered outcome are asserted.

- **Citizen:** `POST /rescue-requests` carries the citizen demo header and in-boundary GeoJSON point; submitting state appears while the response is pending; a `201` pending/version-1 response reaches the success callback. A `422` common error envelope is announced and entered address remains intact.
- **Volunteer:** volunteer SOS queue view mounts and exposes its active-signal section. This is a view smoke check only; hazard reporting remains outside this API-backed regression.
- **Coordinator:** `POST /rescue-requests/{id}/assignment` includes `expected_request_version`; a `409 assignment_conflict` remains visible with server text.
- **Rescuer:** status-event client posts completion with the event/version body and renders the returned completed state, immutable history transition, actor/source, and synthetic note.
- **Offline shell:** mocked worker installation caches `/index.html` and built JS/CSS; disconnected navigation returns cached shell; API, tile, POST, and arbitrary data requests are not intercepted.

These are **component/transport-mocked** observations, not actual API responses. The focused test output is reproducible with the command in the table.

## Production-preview browser matrix

The frontend production build completed and Vite preview started at `http://127.0.0.1:4173/`. The available computer-use browser inventory returned no browser providers or tabs, so I could not open the preview, capture reproducible screenshots, or exercise browser connectivity, keyboard focus, or viewport layouts. I stopped preview after checking availability.

| Acceptance | Evidence in this package | Outcome |
|---|---|---|
| Preview UI at 320 px and desktop | No browser provider available | Not run; no screenshots captured |
| Keyboard-only role navigation/focus | Semantic labels and live-region assertions in component tests only | Browser interaction not run |
| Offline install, disconnect, reload, reconnect | Worker behavior unit tests are mocked | Real browser path not run |
| Queued event survives reload with same ID | Not exercised in a browser for Issue #71 | Refer to prior Phase 4 evidence below; not claimed as a new run |
| Second action stays locked; conflict review; actor switch | Not exercised in a browser for Issue #71 | Refer to prior Phase 4 evidence below; not claimed as a new run |

Historical baseline: `docs/testing/TEAM-PHASE-04-EVIDENCE.md` records Phase 4 production-preview checks for a synthetic mission/event, stable event ID after disconnected reload, 409 review/queue lock, and rescuer actor isolation. That accepted evidence is not a substitute for screenshots or a rerun against this branch.

## Real API and end-to-end acceptance

**Not run.** The requested disposable backend needs Python 3.12, installed backend dependencies, and a MongoDB replica set. This workspace has no `backend/.venv/Scripts/python.exe`, no Docker command, and no Mongo tooling. `GET http://localhost:8000/api/v1/health` did not return within the two-second probe. I did not connect to or modify the user's default MongoDB instance or create a test database.

As a result, no actual response/status evidence exists here for request creation → assignment → route-found/no-route → rescuer progress/completion/history. Routing, assignment conflicts, route fallback, and persisted lifecycle must be exercised against a disposable backend before this package can be accepted as full browser/API acceptance. No route or API result is inferred from the mocked component tests.

## Defects and limitations

- **Environment blocker:** the local Python/MongoDB/Docker prerequisites and a controllable browser are unavailable, preventing the required real API and visual browser matrices.
- **Product defects:** none confirmed by the checks completed here. The missing prerequisites are not a product-code defect.
- No screenshots, deployment, submission, or Phase 5 final-gate approval are claimed.

## Reproduction when prerequisites are available

1. Start a disposable MongoDB 8 replica set and backend using `docs/SETUP.md`; configure an isolated database name and confirm `GET /api/v1/health`.
2. From `frontend/`, run `npm run build` and `npm run preview`; open the preview once online to install the shell worker.
3. With synthetic records, exercise citizen request, coordinator assignment, route-found and no-route responses, rescuer status progression/completion/history, then record each real HTTP status/body with private data omitted.
4. At 320 px and desktop, capture the same browser's screenshots; navigate using only keyboard and record focused controls and error/live announcements.
5. Disconnect network, reload, verify the cached UI and unchanged queued event ID, verify the second-action lock, reconnect into success and conflict paths, review the authoritative server state, and switch actors to verify isolation.
6. Use only the task-created database and browser records; record exact revision, commands, viewport dimensions, keyboard actions, sanitized response summaries, and limitations here.
