# Temporary backend with retained main UI

## Sources and scope

- UI and deployed API baseline: `origin/main` at `bb6995461748b4f208fd7038159129e42cd236de`.
- Refreshed backend source: `origin/temporary-main` at `b7df264`.
- Integration branch: `fix/70-temp-backend-main-ui`, created from the main baseline.

Explicitly fetching the temporary branch revealed two source commits not in main's
history. The routing content from `91e8138` is already present through the earlier
integration; the routing implementation and assignment service have no source diff
against main. Do not reapply or replace that content.

Selectively import only the four backend files added or updated by `b7df264`:

- `backend/app/management/refresh_demo_account_credentials.py`
- `backend/app/management/reset_station_password.py`
- `backend/tests/test_refresh_demo_account_credentials.py`
- `backend/tests/test_reset_station_password_mongodb.py`

The import adds guarded staging-only synthetic credential refresh and transactional
station password/email reset, with session revocation, account collision checks and
active-work protections. These are explicit administrator tools, not API endpoints,
automatic startup actions or deployment migrations.

Keep main's newer origin protection, readiness, cookie configuration, deployment
verification and restart reconciliation. Preserve its opt-in NetworkX import fix.
Do not copy the older temporary frontend, its login-page behavior changes, local
environment files, private credential plans or uncommitted UI edits.

## Verification

- Ruff: passed for backend app, tests and cross-component integration tests.
- Full backend/integration suite: 253 passed, 54 skipped, one existing
  Starlette TestClient/httpx deprecation warning.
- Routing suite: 150 passed.
- Imported tool tests with an explicitly configured local replica set: 6 passed.
  Each database test created a uniquely named disposable database and removed only
  its own synthetic records. Existing local, Atlas and hosted account records were
  not changed.
- Targeted authentication/deployment regression run: 29 passed, 5 skipped; the
  five skipped database cases were exercised in the separate disposable run.
- The first restricted TestClient run stalled and was stopped; the successful
  regression runs above were executed outside that restricted environment.
- No frontend paths are included in the integration commit. Main UI is retained
  byte-for-byte; no UI rendering or frontend behavior changes require acceptance.
- Main routing/API deployment files remain unchanged.

The remaining 54 opt-in skips are not newly claimed as verified. Tests are not
proof of a completed hosted rollout. Review, main merge and provider deployment
remain separate gates. No real credential rotation or account provisioning was
performed as part of this code integration.
