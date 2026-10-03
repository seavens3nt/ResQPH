# Team Phase 3 — AI/ML Road-Risk Component

**Status:** Completed and verified with conditions

**Accountable owner:** Matthew

**Integration and gate owner:** Ranee
**Backend review support:** Jared

## Why this phase is being reviewed early

Matthew completed the external XGBoost work before Team Phases 1 and 2. Ranee
opened and completed an early Phase 3 evidence review so the work could be
preserved, tested, and scoped honestly. The evidence acceptance does not open
runtime ML integration ahead of deterministic routing.

## Phase goal

Accept a reproducible, inspectable academic ML package and a safe backend
inference boundary. The phase may complete with runtime integration deferred
when the artifact does not meet the U-Belt target, feature, split, or evidence
gate. The deterministic rule score must always work.

## Accepted scope

- Preserve the externally trained Ondoy 2009 classifier and comparison results.
- Pin dependency versions and artifact checksums.
- Record provenance, target, ordered features, split method, metrics, error
  counts, and limitations.
- Test artifact integrity and inference shape in an isolated environment.
- Expose a backend road-risk contract whose rule path is always available.
- Reject missing, corrupted, malformed, or incompatible artifacts before use.
- Keep ML penalties bounded and subordinate to impassability and human decisions.

## Excluded scope

- Live flood prediction or current PAGASA integration
- A claim of street-level, U-Belt, or real-emergency accuracy
- Runtime use of the external Ondoy artifact
- NLP triage as an MVP feature
- Routing integration before Team Phase 2
- Training-data publication when redistribution or size rules prohibit it

## Delivered files

```text
ml/external-experiments/ondoy-2009-metro-manila/
  README.md
  requirements.txt
  requirements-dev.txt
  pyproject.toml
  src/
  scripts/
  tests/
  artifacts/
    road_flood_classifier.pkl
    road_risk_surrogate.pkl
    flood_classifier_metadata.json
    feature_metadata.json
    comparison_results.json
    SHA256SUMS

backend/app/
  api/routes/ml.py
  schemas/ml.py
  integrations/ml_inference.py

docs/
  ml/ML_FEASIBILITY.md
  testing/ML-EVIDENCE-UBELT.md
  testing/TEAM-PHASE-03-EVIDENCE.md
```

## Acceptance criteria

- All manifest digests match the committed artifacts.
- Artifact tests verify type, schema, and bounded output.
- Metadata distinguishes artifact-reported results from reproduced results.
- Random-row evaluation is not described as leakage-safe.
- Precision, false-positive, and false-negative limitations are visible.
- Backend loading requires explicit enablement, checksum, metadata, exact
  target, and exact ordered feature schema.
- The external artifact is rejected as runtime-incompatible.
- Rule fallback works when ML is disabled or any gate fails.
- Backend Ruff/Pytest and the isolated ML test suite pass.
- CI contains a separate ML evidence job.
- The README, roadmap, status, dashboard, decision log, and project context use
  the same acceptance boundary.

## Phase exit decision

The gate decision is `Approve with conditions`: the experiment is accepted as
the completed academic ML deliverable and the evidence-gated fallback adapter
is accepted, while runtime model integration remains deferred. See
[`TEAM-PHASE-03-GATE.md`](TEAM-PHASE-03-GATE.md).

## Post-routing reconciliation

Ranee completed the final check through merged PR #58 at `8f2a7ea`:
disabled, missing, rejected, and incompatible ML preserve zero route cost
and an explicit fallback warning. PR and post-merge main CI passed.
This is evidence reconciliation, not model activation, retraining, NLP work, or
a new member handoff.
