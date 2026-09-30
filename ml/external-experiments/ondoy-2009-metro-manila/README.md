# Ondoy 2009 Metro Manila ML experiment

This directory preserves Matthew's externally trained road-flood experiment as
an academic evidence package. It uses a Metro Manila OpenStreetMap-derived road
set and Global Flood Database event 3552 for Typhoon Ondoy on 2009-09-30.

## Acceptance boundary

- The serialized XGBoost classifier, reported metrics, metadata, and checksums
  are preserved and testable.
- The reported holdout used a stratified random row split. It is exploratory;
  it is not a spatial or temporal generalization result.
- The external feature and target schema does not match the approved U-Belt
  runtime request contract.
- The artifact is therefore `runtime_compatible: false` and must not be loaded
  by the backend.
- The deterministic rule score remains the application path.
- The included NLP module is historical exploratory code and is not part of
  the accepted ResQPH MVP or the Team Phase 3 exit gate.

The package demonstrates completed model development and comparison. It does
not demonstrate live flood prediction, street-level accuracy, U-Belt model
validity, or emergency deployment readiness.

## Environment

- Python 3.12
- Dependencies pinned in `requirements.txt`
- Test dependency in `requirements-dev.txt`

Create an isolated environment from this directory:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pip install -e . --no-deps
```

## Verify the preserved evidence

```powershell
.\.venv\Scripts\python.exe -m pytest
```

The artifact tests validate the manifest checksums before deserializing either
model. Do not load a pickle from an untrusted branch or outside the reviewed
manifest.

## Reproduce training when source data are available

The raw Global Flood Database export and processed road-label parquet are not
committed. Place the documented source inputs under ignored `data/raw/`, then
run:

```powershell
.\.venv\Scripts\python.exe -m scripts.build_flood_labels
.\.venv\Scripts\python.exe -m scripts.train_flood_classifier
```

The preserved artifact metrics came from the historical random-row evaluation.
A future candidate for application integration must instead use a defensible
spatial or temporal holdout, remove current-outcome/leaking inputs, emit the
approved U-Belt runtime feature order, and produce a new versioned artifact and
checksum. It must not overwrite this evidence package.

## Evidence and provenance

- `artifacts/flood_classifier_metadata.json` — classifier metrics, split type,
  error counts, contract decision, and limitations
- `artifacts/SHA256SUMS` — immutable file-integrity manifest
- `data/metadata/ondoy-2009.md` in the repository — source and license record
- `docs/ml/ML_FEASIBILITY.md` — accepted interpretation and runtime gate
- `docs/testing/TEAM-PHASE-03-EVIDENCE.md` — repository verification record
