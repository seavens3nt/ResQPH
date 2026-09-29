# Team Phase 3 gate — AI/ML Road-Risk Component

**Status:** Ready for review

**Decision owner:** Ranee

**Proposed decision:** Approve with conditions
**Decision date:** Pending merge and CI

## Inspected evidence

- External package source, metadata, serialized artifacts, and SHA-256 manifest
- Isolated external experiment test suite
- Backend road-risk schema, route, integration adapter, and tests
- ML feasibility, runtime boundary, source metadata, and decision log
- Team Phase 3 evidence record

## Gate criteria

| Criterion | Review result |
|---|---|
| External evidence package is internally consistent | Passed locally |
| Artifact checksums are verified before loading | Passed locally |
| Metrics, split, and errors are reported honestly | Passed locally |
| Backend rule fallback is deterministic and bounded | Passed locally |
| Missing, corrupted, or incompatible artifacts fall back safely | Passed locally |
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

Pending. Ranee may change this record to `Completed and verified` and record
`Approve with conditions` only after reviewing the pull request and passing CI.
