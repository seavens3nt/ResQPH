# ResQPH deployment checkpoint — 2026-10-13

Related release work: Issue #70. Baseline: main
`5131e45a0890e5a84b93c59afa184b8a1a6ef295` (PR #92, recent UI and routing).
Changes are a review candidate on `setup/production-deployment`, not a deployed release.
No UI stylesheet, workspace component, routing algorithm or historical database was replaced.

## Approved budget and targets

The owner selected **free plans only**. Vercel frontend, Render Free backend and
Atlas Free database remain an academic demonstration, not dependable emergency
infrastructure. Render Free sleeps when idle, has cold starts and shared workspace
free-hour limits. Do not add artificial keep-alive traffic. Atlas Free has no managed
backup service. No always-on or managed-backup claim is permitted.

- Atlas: Project 0, cluster `resqph-demo`, AWS Singapore; staging application user
  verified with only `readWrite@resqph_staging`. No local records migrated.
- Render: existing My Workspace; unrelated WayFarer service must remain untouched.
  ResQPH services have not been provisioned. Blueprint templates are **not applied**.
- Vercel: seavens3nt's projects; ResQPH project and domains have not been provisioned.
- Production must remain on `main`; no protection bypass or direct main push.

## Packaging and security

Use repository-root build contexts for both providers. Render installs
`backend/requirements.txt`, including sibling routing code and repository data.
The templates use Python 3.12.15, one instance/process, no trusted forwarding headers,
readiness health checks and automatic deployment **off**. Node 22 and locked npm
dependencies are required for Vercel. `vercel.mjs` builds `frontend/dist` from root,
rewrites `/api` before SPA fallback, rejects incomplete configuration and disables
Git auto-deployment. Session/CSRF/private API responses are not CDN-cacheable.

Hosted API settings fail startup if insecure: environment-specific database,
authenticated Atlas SRV URI, HTTPS exact frontend origins, Secure cookies,
SameSite Lax/Strict, demo headers off, runtime ML off. `/api/v1/health` is process
liveness; `/api/v1/ready` additionally checks a bounded database ping and dispatch
heartbeat and returns the release SHA. A healthy process alone is not release evidence.

Render secure environment: `MONGODB_URI`, `MONGODB_DATABASE`, `APP_ENVIRONMENT`,
`FRONTEND_ORIGINS`, `AUTH_COOKIE_SECURE=true`, `AUTH_COOKIE_SAMESITE=lax`,
`AUTH_ALLOW_DEMO_HEADERS=false`, `ML_ENABLED=false`, optional server-only
`GOOGLE_WEATHER_API_KEY`. Existing routing/simulation defaults remain unchanged.
Templates set `RELEASE_SHA` from the Render commit at startup.

Vercel environment: `VITE_API_URL=/api/v1`, `RESQPH_DEPLOY_ENVIRONMENT`,
`RENDER_API_ORIGIN`, restricted public `VITE_GOOGLE_MAPS_API_KEY` and
`VITE_GOOGLE_MAPS_MAP_ID`. Production and staging use separate projects/settings;
previews must never receive the production backend origin. No database/Weather
credentials or provider tokens belong in VITE variables.

## Release gates — provider automation is not yet connected

CI preserves frontend/backend/ML evidence, adds routing, disposable replica-set
transactions, production-build browser smoke and a final all-success gate.
`release-check.yml` is a **read-only eligibility check**, not a deploy workflow.
It rejects an old SHA, PR-only success, skipped/neutral jobs and production without
the same `STAGING_ACCEPTED_SHA`. Configure main-only GitHub environments with
appropriate independent review before use. That variable is an explicit acceptance
record, not a substitute for the hosted checks below.

The following explicit operator release sequence must be followed until a reviewed
provider-connected workflow is added. Automatic Render/Vercel releases stay off:

1. Merge the reviewed PR normally. Run CI on the resulting main SHA; all required
   jobs must succeed. Run Release eligibility for that exact SHA targeting staging.
2. Provision free staging resources, separate credentials and secure variables.
   User enters all new passwords/URIs directly in provider secure forms. Allowlist
   actual Render outbound CIDRs in Atlas; do not use permanent `0.0.0.0/0` access.
3. Deploy the **exact eligible commit** to Render staging. Verify deployed revision
   and `/api/v1/ready` release SHA. Verify Atlas connectivity and real transactions.
4. Deploy the same SHA to the separate Vercel staging project. Verify HTTPS cookie
   flags and proxy behavior, the flows below, and manual backup/restore. Record results.
5. Record the accepted staging SHA in the production environment. Run production
   eligibility. Provision separate production DB user restricted to
   `readWrite@resqph_production`; do not reuse staging credentials.
6. Deploy Render production at that SHA and check readiness/revision. Build Vercel
   production without assigning its domain (`--prod --skip-domain`), verify that
   candidate and its API revision before promotion. Recheck that main has not moved
   immediately before promotion. If it moved, stop and test the new release.
7. Promote the verified Vercel candidate, then repeat critical HTTPS smoke checks.
   Store only sanitized evidence and public service/revision links.

The operator steps do not constitute enforced automatic CD. Provider identities,
secrets, main environment restrictions, protected-candidate checks and promotion
are still pending. Do not describe CI/CD as complete or deployment as verified.

## Hosted acceptance and recovery (pending)

Use only synthetic staging data and separate citizen/rescuer profiles. Verify
landing/signup/login/session restore/logout, role isolation, direct-route refresh,
U-Belt location validation, request review/submission and duplicate rejection,
headquarters assignment/deterministic route, rescuer lifecycle through completion,
cancellation constraints/stale conflicts, offline reconnect/account isolation,
restricted Maps loading, truthful Weather feedback and retained mobile/desktop UI.
Verify Secure/HttpOnly host-only session cookie, readable CSRF cookie, rejected
missing-token writes, JSON API errors and no private API/service-worker caching.

Before production, export only synthetic staging data using a privately stored
authenticated URI; restore into a **separate disposable staging database**, compare
record counts and transaction behavior, and record the restore result. Obtain a
decision on retention/location and protected backup credentials. Free-tier backup
verification is outstanding. Do not migrate local accounts, sessions or history.

Use sanitized provider logs and readiness checks; never log credentials or request
medical/location details. Monitoring and alert recipients remain to be configured.
Cold-start failures must be disclosed, not hidden by fake uptime requests.

Rollback: keep the previous verified frontend deployment and backend commit.
Recheck schema compatibility, deploy the previous backend SHA and verify readiness,
then promote the matching prior frontend and smoke test. Preserve database records;
database restore is never an automatic code rollback. This patch adds no schema
migration requiring restoration. The first hosted release has no verified rollback
target until an initial deployment and rehearsal are completed.

## Local evidence (not hosted acceptance)

- Frontend: 433 tests / 66 suites; production build passed; lint passed with six
  existing warnings. Existing large-chunk warning remains. npm audit: zero findings.
- Backend/cross-layer: 252 passed, 48 opt-in skips; Ruff passed.
- Explicit disposable MongoDB acceptance: 41 passed, one skipped; additional
  overlap/restart/expired-lease test passed. Existing developer data untouched.
- Routing: 150 passed; Ruff passed. GeoJSON canonical LF and evidence hashes retained.
- Deployment config: seven Node checks and five Python release-guard tests passed.
- New GitHub CI/browser job, hosted TLS/proxy, Atlas transactions, screenshots,
  backup restore and full hosted role journey: not yet verified.

No production URL or deployed SHA exists at this checkpoint. Normal independent
PR approval is required; the PR #92 administrator override does not apply here.
