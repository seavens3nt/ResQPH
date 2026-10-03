# ML adapter and U-Belt integration status

**Status:** Completed and verified with conditions

**Owner:** Matthew

**Review owner:** Ranee
**Last updated:** 2026-10-04

## Accepted behavior in this change

The backend exposes `POST /api/v1/ml/road-risk` through
`backend/app/integrations/ml_inference.py`. The endpoint always supports the
approved deterministic rule score. A serialized model is optional and cannot
load unless its checksum, metadata, target, ordered feature list, and version
pass the runtime gate.

Responses include:

- a bounded probability and risk level;
- a penalty capped at 60 seconds-equivalent units;
- model name and version;
- `fallback_used`; and
- a stable `fallback_reason` when the rule path is used.

## External artifact decision

The Ondoy 2009 XGBoost artifact is valid only for its recorded external
experiment schema. Its metadata now declares `runtime_compatible: false`.
The backend's approved U-Belt target and feature order differ, so the adapter
rejects this artifact before deserialization even if `ML_ENABLED=true`.

This is a controlled compatibility decision, not removal of Matthew's work.
The model, comparison, evaluation record, and artifact remain demonstrable as
the Team Phase 3 academic ML output.

## Verification performed

Backend:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m ruff check app tests
.\.venv\Scripts\python.exe -m pytest
```

Result on 2026-09-29: Ruff passed; `44 passed, 2 skipped`. The two skipped
tests are MongoDB integration tests and are unrelated to the ML adapter.

External experiment:

```powershell
Set-Location ml\external-experiments\ondoy-2009-metro-manila
.\.venv\Scripts\python.exe -m pytest
```

Result on 2026-09-29: `21 passed`.

The external suite verifies:

- every manifest digest before artifact deserialization;
- the XGBoost classifier type and prediction shape;
- the Random Forest surrogate type and metadata;
- target and ordered feature metadata;
- exploratory split and error-analysis disclosure;
- explicit runtime incompatibility;
- deterministic fallback behavior; and
- ETL/model smoke behavior in isolated temporary outputs.

The backend suite verifies:

- default rule fallback and response contract;
- input validation and bounded penalties;
- checksum rejection before unpickling;
- external-schema rejection before unpickling;
- activation only after all metadata gates pass;
- prediction-failure fallback with the correct model identity; and
- stable U-Belt runtime feature order and transformations.

## Remaining limitations

- The raw Global Flood Database export and processed training parquet are not
  committed, so training and reported metrics were not regenerated.
- The reported split is a stratified random row split, not a spatial or
  temporal holdout.
- The classifier's reported precision is `0.238`, with 307 false positives and
  8 false negatives in the recorded holdout.
- No U-Belt-compatible trained artifact exists.
- No model output is connected to routing; Team Phase 2 deterministic routing
  is not yet implemented.

## Gate recommendation

`Approve with conditions`:

1. Accept the external package as completed exploratory ML evidence.
2. Accept the backend endpoint and rule fallback contract.
3. Keep `ML_ENABLED=false` for the MVP.
4. Do not claim that the reported metrics were independently reproduced or
   that the artifact predicts U-Belt road safety.
5. Require a new artifact and new gate if runtime model integration is pursued.
