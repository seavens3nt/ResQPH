# Team Phase 5 Routing and ML Evidence Record

## Objective
Routing/fallback acceptance regression and truthful research evidence ready for the final presentation.

## 1. Routing and Fallback Acceptance Regression

### Commands
```bash
cd backend
python -m ruff check ../tests/integration
python -m pytest ../tests/integration/test_phase5_routing_acceptance.py -v
```

## Verified scope and revision

Reviewed on 2026-10-06 against PR #75 source revision
`0237c4efcd561f33c6f00e6c7deb152e4091b9be`, with the repair in this document's
containing commit. The source branch includes current `origin/main` at review.
Only this evidence record and `tests/integration/test_phase5_routing_acceptance.py`
are changed. Runtime code, artifacts, contracts and ML activation are unchanged.

The acceptance file now contains **26 collected cases**. It exercises the real
FastAPI route and production engine, not a mocked routing response:

- Repeated requests return identical route geometry, selected edge IDs and costs.
- Both returned geometry and input validation respect the locked U-Belt bounds.
  Origin/destination outside each boundary, reversed coordinates and boolean
  coordinates are rejected with HTTP 422.
- Selected edges exclude the scenario's severe/impassable edges. The controlled
  route's deterministic penalty is exactly **690**: moderate/restricted
  `90 + 180`, plus high/restricted `240 + 180`. Total cost includes base travel
  cost separately; it is not an arrival-time guarantee.
- The locked cost table adds flood, restriction, obstacle and uncertainty
  penalties. Even an accepted zero ML risk cannot restore an excluded edge.
- A disconnected destination returns explicit `no-route` with no geometry,
  edge IDs, route ID or total cost, rather than a substitute path.
- Disabled, absent, checksum-corrupt and actual incompatible Ondoy artifacts
  retain rule scoring. Rejected artifacts cannot reach deserialization, and
  route-found/no-route responses remain unchanged when ML is requested.
- Adapter globals and settings are restored after each case, including failures,
  preventing these tests from leaking model state into later suites.

## Repeatable verification

Use Python 3.12 and the component setup instructions. The backend environment
needs `backend/requirements.txt` and `backend/requirements-dev.txt`; install the
local routing package from this checkout. The routing suite also needs its own
`requirements.txt` and `requirements-dev.txt`. The Ondoy environment must remain
separate because its numerical/geospatial versions are pinned differently.

From `backend/`:

```powershell
python -m ruff check app tests ../tests/integration
python -m pytest tests ../tests/integration -q
```

From `routing/`:

```powershell
python -m ruff check src tests
python -m pytest -q
```

From `ml/external-experiments/ondoy-2009-metro-manila/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
$artifactDirectory = Join-Path $PWD 'artifacts'
Get-Content 'artifacts/SHA256SUMS' | ForEach-Object {
    $digest, $artifactName = $_ -split '\s+', 2
    $actualDigest = (Get-FileHash -LiteralPath (Join-Path $artifactDirectory $artifactName) -Algorithm SHA256).Hash.ToLower()
    if ($actualDigest -ne $digest) { throw "Digest mismatch: $artifactName" }
    Write-Output "MATCH $artifactName $actualDigest"
}
```

Local results on 2026-10-06:

| Check | Result |
| --- | --- |
| Backend and integration Ruff | Passed |
| Backend and integration Pytest | 186 passed, 17 skipped |
| Routing Ruff | Passed |
| Routing Pytest | 136 passed |
| Isolated Ondoy Pytest | 21 passed |
| SHA-256 manifest | All five entries matched |

Local runs used existing Python 3.12 environments without changing their
installed dependencies. `PYTHONPATH` explicitly selected this checkout's
backend/routing/experiment sources rather than another checkout's editable
installation. Pytest scratch directories were local to this checkout and are
excluded from the submitted changes. Backend emitted two dependency deprecation
warnings. The 17 skips require opt-in real-MongoDB testing; no database tests
were verified in this repair. Frontend execution is covered by GitHub CI,
not a new local browser audit here.

## Artifact integrity

The reviewed manifest records these SHA-256 values:

| File under experiment `artifacts/` | SHA-256 |
| --- | --- |
| `road_flood_classifier.pkl` | `b998272893726c78035186955949c1c97cd982b1c553789b740ca22b71616d92` |
| `road_risk_surrogate.pkl` | `d1745982ce771f7440d9bffce03a4f872f37675a24211bfa75a6a7fb4d54dc6a` |
| `comparison_results.json` | `ce0e949c9167db3df9480dce9c1c0fc79dd0ce636c1bb5f0704a564e13b50aea` |
| `feature_metadata.json` | `cf550771e9f3c8bb4f88dcdb4848f40bb1a07cd9dec128d3dbbbc07935f9f191` |
| `flood_classifier_metadata.json` | `b837e21f25e6b845a57eca3b7ae12dd13feaaacf292b3a97ca22d9f442e5a4fe` |

Matching digests establish preservation, not predictive accuracy. The isolated
tests check digests before loading the models and confirm executable inference
on synthetic inputs. They do not reproduce training from raw data.

## Presentation explanation tied to repository evidence

### Routing

The bounded OSM-derived preview supplies a small controlled road graph. The
engine excludes severe/impassable edges before search and adds the locked rule
penalties to eligible edges. It runs deterministic A* with a **zero heuristic**,
so the current search is equivalent to Dijkstra rather than demonstrating a
geographic A* speedup. Stable tie handling makes identical inputs repeatable.
The API validates the result and identifies it as controlled prototype data.

### Historical experiment

The repository's [Ondoy provenance record](../../data/metadata/ondoy-2009.md)
documents Metro Manila OSM-derived roads and Global Flood Database v1 event
3552 for 2009-09-30. Flood labels were sampled at road midpoints from a
250-m MODIS-derived flood raster; these are not street-level measurements.
The preserved metadata records 148,495 samples, 520 positives (about 0.35%),
and a stratified random-row 80/20 holdout with seed 42.

| Preserved classifier | AUC | Recall | Precision | F1 |
| --- | --- | --- | --- | --- |
| Logistic regression | 0.5763 | 0.6635 | 0.0041 | 0.0081 |
| Random Forest | 0.9768 | 0.8558 | 0.2500 | 0.3870 |
| XGBoost | 0.9763 | 0.9231 | 0.2382 | 0.3787 |

These are **reported historical metrics**, not metrics recalculated by this PR.
The metadata's selection rationale favors XGBoost for similar AUC, higher
recall and smaller size; this repair does not independently benchmark model
sizes. The XGBoost holdout includes 96 true positives, 8 false negatives,
307 false positives and 29,288 true negatives. High AUC/recall must therefore
be presented alongside low precision and the strong class imbalance.

Neighboring observations may appear on both sides of a random-row split.
Current-event flood depth/hazard inputs also require leakage scrutiny.
This evidence does not establish spatial/temporal generalization, live
prediction or valid U-Belt road-risk performance. Raw inputs were not acquired
and raw-data training was not reproduced in this package.

### Why runtime ML stays disabled

The historical target is `flooded_ondoy_2009`; the approved runtime target is
`high_risk_edge`. The external ordered features are `road_length_m`, `speed_kph`,
`elevation_m`, `flood_depth_m`, `flood_hazard_class`, `road_class_code`, and
`distance_to_evac_m`. The runtime adapter instead requires `road_class_code`,
`length_m`, `baseline_travel_time_s`, `historical_flood_frequency`,
`max_prior_flood_depth_cm`, `distance_to_documented_waterway_m`,
`elevation_context_m`, and `rainfall_band_code` in that order. The names,
semantics, count and target differ; external metadata intentionally says
`runtime_compatible: false`.

The route API currently **does not consume the inference adapter**. These
tests verify rejected-model isolation and deterministic fallback; they do
not prove accepted-model routing integration. The rule score is a deterministic
prototype score, not a calibrated flood probability. `ML_ENABLED=false` remains
the approved application path. The exploratory NLP module is outside this MVP.

See [ML feasibility](../ml/ML_FEASIBILITY.md),
[routing contract](../routing/ROUTING_CONTRACT.md) and
[Phase 3 evidence](TEAM-PHASE-03-EVIDENCE.md) for the locked interpretation.
Issue #74 acceptance is scoped to this evidence/test package. Fresh-request
browser integration defects and final Phase 5 acceptance remain separate work.
