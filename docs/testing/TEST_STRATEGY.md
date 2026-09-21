# ResQPH test strategy

**Status:** Draft for Phase 1 review
**Last updated:** 2026-09-21

## Verification principle

A task is complete only when its acceptance criteria are supported by inspected implementation or artifacts and repeatable evidence. An issue state, screenshot, placeholder, or member statement alone is insufficient.

## Test levels

| Area | Required evidence |
|---|---|
| Frontend | Lint, component tests, role-flow tests, accessibility checks, production build |
| Backend | Ruff, domain/service tests, API tests, repository/transaction tests |
| Database | Index creation, unique/conflict behavior, rollback/atomicity, sanitized fixtures |
| Data pipeline | Source metadata, CRS and coordinate checks, clipping/coverage checks, reproducible small fixture |
| Routing | Known-graph baseline, penalty route change, impassable exclusion, no-route, deterministic repeatability |
| AI/ML | Reproducible split, baseline and model metrics, confusion matrix, leakage/error review, artifact validation |
| Offline | Cache age label, queue limit, idempotent retry, accepted sync, rejected stale sync |
| Integration | Complete rescue lifecycle with deterministic and ML-fallback route paths |
| Documentation | Link, code-fence, command, terminology, source, and limitation consistency |

## Privacy and fixtures

- Use synthetic names, contact details, addresses, mission records, and incidents.
- Preserve GeoJSON `[longitude, latitude]` order.
- Small committed fixtures must declare that they are synthetic and not proof of real-area accuracy.
- Raw downloads, large processed data, secrets, private locations, and generated model artifacts remain outside Git.

## Required failure cases

- Missing or invalid rescue-request fields
- Unsupported simulated role
- Duplicate or conflicting team assignment
- Invalid, repeated, skipped, or stale mission transition
- Partial assignment operation failure and transaction rollback
- Missing route dependency
- Controlled scenario with no eligible route
- Missing, malformed, out-of-range, stale, or incompatible ML output
- Cached data displayed after connectivity loss
- Second offline action attempted while one event is queued
- Offline event rejected because server state advanced

## Phase gates

### Project Foundation Phase 1

Inspect contract consistency, sanitized examples, dataset metadata, acceptance traceability, open decisions, and affected-member reviews. No application feature is considered complete.

### Project Foundation Phase 2

Verify the complete persistent request/mission lifecycle, conflicts, transaction rollback, role simulation, API/OpenAPI agreement, frontend integration, and operation without routing or ML.

### Team phases

Each team phase adds component-specific evidence and reruns affected integration checks. Team Phase 5 runs the complete regression, demonstration, documentation reconciliation, deployment/local-run smoke test, and rollback rehearsal.
