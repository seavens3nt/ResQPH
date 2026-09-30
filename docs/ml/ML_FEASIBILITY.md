# Road-risk ML feasibility and acceptance

**Status:** Ready for review as completed exploratory evidence; runtime model integration deferred

**Candidate experiment:** XGBoost road-flood classifier from the Ondoy 2009 package

**Operative application path:** deterministic rule-based risk score
**Last updated:** 2026-09-29

Matthew's external experiment is preserved under
[`../../ml/external-experiments/ondoy-2009-metro-manila/`](../../ml/external-experiments/ondoy-2009-metro-manila/).
The repository can verify that the code, artifacts, metadata, checksums, and
smoke tests are internally consistent. The source training parquet is not
committed, so the reported metrics have not been regenerated from raw inputs.

## Evidence levels

| Claim | Status | Evidence |
|---|---|---|
| XGBoost classifier artifact exists and matches the manifest | Verified | SHA-256 plus artifact-load tests |
| Artifact accepts its recorded seven-feature external schema | Verified | Isolated ML test suite |
| Reported random-row metrics are recorded consistently | Verified as artifact metadata | `flood_classifier_metadata.json` |
| Training can be reproduced from raw source data in this repository | Not verified | Raw export and processed labeled parquet are intentionally absent |
| Metrics demonstrate spatial or temporal generalization | Not verified | Evaluation used a stratified random row split |
| Artifact matches the approved U-Belt runtime target and features | Rejected | Target and ordered feature schemas differ |
| Artifact may influence routing | Not approved | Runtime adapter rejects incompatible metadata and uses the rule fallback |

## Preserved experiment results

The committed metadata reports the following XGBoost holdout values:

- ROC-AUC: `0.9763345225`
- Flooded-class recall: `0.9230769231`
- Flooded-class precision: `0.2382133995`
- Flooded-class F1: `0.3786982249`
- Samples: `148,495`
- Positive samples: `520` (`0.350%`)
- Confusion matrix: `[[29288, 307], [8, 96]]`
- Split: stratified random row holdout, test size `0.20`, seed `42`

These values are **artifact-reported exploratory results**, not independently
retrained results and not proof of U-Belt or street-level accuracy. The
holdout includes 307 false positives and 8 false negatives. The low precision
means most positive predictions in this holdout were false alarms.

## Why the external artifact is not a runtime model

The artifact predicts `flooded_ondoy_2009` using:

```text
road_length_m
speed_kph
elevation_m
flood_depth_m
flood_hazard_class
road_class_code
distance_to_evac_m
```

The approved application target is `high_risk_edge`, and the backend contract
uses pre-outcome U-Belt fields such as historical flood frequency, prior flood
depth, waterway distance, baseline travel time, and rainfall band. Equal vector
length is not compatibility. Loading the external model with differently
ordered or differently defined values would produce meaningless output.

Current-event flood depth and hazard class also cannot be presented as
pre-outcome predictors without a separate, time-aligned source decision. The
external evaluation's random row split may place neighboring road observations
in both train and test sets.

## Approved runtime target and features

The accepted future target is binary `high_risk_edge`:

- `1`: a verified historical or controlled outcome is high, severe,
  restricted, or impassable;
- `0`: a verified outcome is none, low, or moderate and passable.

The approved ordered runtime feature representation is:

```text
road_class_code
length_m
baseline_travel_time_s
historical_flood_frequency
max_prior_flood_depth_cm
distance_to_documented_waterway_m
elevation_context_m
rainfall_band_code
```

The source request contract remains
[`../../data/samples/ml-road-risk-contract.example.json`](../../data/samples/ml-road-risk-contract.example.json).
Do not train on `edge_id`, current outcome flood level, current outcome
passability, post-outcome observations, or duplicate location identifiers.

## Runtime activation gate

The backend loads a model only when all of the following are true:

1. `ML_ENABLED=true` is set deliberately.
2. Artifact and metadata paths are configured explicitly.
3. The configured SHA-256 digest matches the artifact before deserialization.
4. Metadata declares `runtime_compatible: true`.
5. Model name, version, target, and ordered feature list exactly match the
   backend contract.
6. Optional runtime dependencies are installed.
7. The artifact loads and produces a finite probability.

Any failure produces the deterministic rule score and a stable
`fallback_reason`. The external Ondoy metadata declares
`runtime_compatible: false`, so it cannot pass this gate.

## Requirements for a future integrated model

- U-Belt-compatible labels and stable `edge_id` joins
- Source, time, CRS, missingness, and class-balance records
- Spatial or temporal holdout with no edge/scenario group overlap
- Rule-baseline comparison
- Precision, recall, F1, confusion matrix, probability reliability, and error
  analysis focused on false-low-risk predictions
- Versioned artifact, metadata, checksum, and exact preprocessing schema
- Missing, malformed, incompatible, corrupted, and prediction-failure tests
- Ranee's explicit acceptance

If those conditions are not met, Team Phase 3 still completes its academic ML
deliverable through the external experiment and honest evaluation record while
the application continues with the mandatory rule-based path.

## Model-to-routing boundary

An accepted future probability may contribute only this bounded non-negative
cost:

```text
ml_penalty = round(clamp(risk_probability, 0, 1) * 60)
```

It cannot reduce deterministic penalties, restore an impassable edge, override
a controlled rule, dispatch a team, or replace human judgment.
