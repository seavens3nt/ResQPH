# Team Phase 3 gate — AI/ML Road-Risk Component

**Status:** Completed and verified

**Decision owner:** Ranee

**Decision:** Approve with conditions
**Decision date:** 2026-09-30

## Inspected evidence

- External package source, metadata, serialized artifacts, and SHA-256 manifest
- Isolated external experiment test suite
- Backend road-risk schema, route, integration adapter, and tests
- ML feasibility, runtime boundary, source metadata, and decision log
- Team Phase 3 evidence record

## Gate criteria

| Criterion | Review result |
|---|---|
| External evidence package is internally consistent | Passed locally and in PR #31 CI |
| Artifact checksums are verified before loading | Passed locally and in PR #31 CI |
| Metrics, split, and errors are reported honestly | Passed locally |
| Backend rule fallback is deterministic and bounded | Passed locally and in PR #31 CI |
| Missing, corrupted, or incompatible artifacts fall back safely | Passed locally and in PR #31 CI |
| External artifact matches the U-Belt runtime contract | Failed by design; integration deferred |
| Training and metrics reproduced from raw source data | Not verified; source inputs are not committed |
| Runtime model affects routing | Not approved and not required for this gate |

## Conditions

1. Merge only after frontend, backend, and ML evidence CI jobs pass.
2. Keep `ML_ENABLED=false` in examples, local defaults, and demonstrations.
3. Present the reported model metrics as external exploratory results, not as
   U-Belt accuracy or independently reproduced evidence.
4. Use the rule-based score in the routing MVP.
5. Open a new evidence-gated change if a compatible U-Belt artifact is created.

## Final decision

Ranee accepted the external experiment as academic evidence through merged PR
#31 and closed Issue #37. Runtime ML remains disabled because the artifact is
not compatible with the U-Belt target and ordered-feature contract.
