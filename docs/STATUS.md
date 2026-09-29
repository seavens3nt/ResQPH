# ResQPH project status

**Last updated:** 2026-09-29

| Field | Current value |
|---|---|
| Active delivery phase | Team Phase 1 — Mapping and Geospatial Pipeline |
| Parallel review | Team Phase 3 — AI/ML Road-Risk Component |
| Overall health | At risk: core workflow is verified and ML evidence is repaired, but mapping and deterministic routing are still missing |
| Current goal | Merge the Phase 3 evidence repair, keep runtime ML disabled, and complete the bounded U-Belt mapping pipeline |

## Completed and verified

- Project Foundation Phases 1 and 2, including the persistent request,
  assignment, mission, role, and status workflow through PR #25.
- Frontend and backend core checks plus the sanitized real-MongoDB Phase 2 gate
  flow.
- External ML artifact integrity, metadata consistency, and isolated package
  execution in the current readiness branch: 21 ML tests passed.
- Backend evidence gates and rule fallback in the current readiness branch:
  Ruff passed and 43 backend tests passed, with two unrelated MongoDB tests
  skipped in that unit run.

## Ready for review

### Matthew — Team Phase 3 external ML package

- XGBoost classifier and Random Forest surrogate are checksum-pinned.
- The actual random-row split, reported metrics, precision limitation, 307
  false positives, and 8 false negatives are documented.
- The package is accepted only as exploratory evidence; raw-data retraining and
  spatial/temporal generalization are not verified.
- The external target and feature schema are explicitly rejected for U-Belt
  runtime use.

### Ranee — Backend ML boundary and phase reconciliation

- `POST /api/v1/ml/road-risk` retains the mandatory deterministic fallback.
- Artifact loading requires explicit enablement, SHA-256, metadata, version,
  target, and exact ordered features.
- Incompatible or failed artifacts return a stable fallback reason.
- A dedicated ML evidence CI job is included.
- Team Phase 3 guide, evidence, gate draft, decisions, roadmap, status, and
  project context are reconciled.

## In progress

### Team Phase 1 — Mapping and Geospatial Pipeline

Matthew remains accountable for the bounded U-Belt graph, stable `edge_id`,
controlled flood join, source/CRS/license metadata, small fixture, and
reproduction evidence. Jared owns the narrow backend fixture loader. Elle and
Clarence own map presentation after the accepted fixture schema is on `main`.

## Blockers and constraints

- Team Phase 2 deterministic routing cannot start until the accepted Team
  Phase 1 graph and edge schema exist.
- The external Ondoy artifact cannot be activated at runtime because its
  target, features, and evaluation do not meet the U-Belt contract.
- The exact course deadline and member availability are still not recorded, so
  no calendar dates are invented.
- CI results for this readiness branch remain pending until a pull request is
  opened and pushed.

## Next decisions for Ranee

1. Review and merge the Phase 3 readiness pull request after all three CI jobs
   pass.
2. Record `Approve with conditions` in the Team Phase 3 gate, accepting the
   academic ML package while deferring runtime model integration.
3. Keep Team Phase 1 as the active implementation phase and open only its
   bounded work packages.

## Links

- [Dashboard](DASHBOARD.md)
- [Roadmap](ROADMAP.md)
- [Team Phase 1 guide](phases/TEAM-PHASE-01.md)
- [Team Phase 3 guide](phases/TEAM-PHASE-03.md)
- [Team Phase 3 gate](phases/TEAM-PHASE-03-GATE.md)
- [Team Phase 3 evidence](testing/TEAM-PHASE-03-EVIDENCE.md)
- [ML feasibility and acceptance](ml/ML_FEASIBILITY.md)
- [GitHub Issues](https://github.com/seavens3nt/ResQPH/issues)
- [GitHub pull requests](https://github.com/seavens3nt/ResQPH/pulls)
- [GitHub Actions](https://github.com/seavens3nt/ResQPH/actions)
