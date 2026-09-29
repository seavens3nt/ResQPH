# ML runtime adapter — evidence and integration status

**Status:** Adapter shipped in fallback mode; U-Belt model integration gated on label availability
**Last updated:** 2026-09-30
**Owner:** Matthew

## What ships

The backend exposes `POST /api/v1/ml/road-risk`. It accepts the per-edge
feature contract from `docs/ml/ML_FEASIBILITY.md` and returns the documented
response shape.

Two execution paths:

1. **Fallback** (default): `settings.ml_enabled=False`. The endpoint returns
   a deterministic rule-based probability computed in
   `app/services/ml_inference.py`. No model is loaded; no optional dependency
   is required.
2. **Model-loaded**: `settings.ml_enabled=True` AND `xgboost` installed in
   the backend environment AND a valid artifact at
   `settings.ml_artifacts_dir/settings.ml_classifier_filename`. The XGBoost
   classifier is loaded once at startup and used for predictions.

Both paths return the same response shape. The `fallback_used` field
distinguishes them.

## Why model integration is gated

Training a U-Belt model requires:

| Requirement | Status |
|---|---|
| U-Belt study-area roads | Not yet extracted |
| `high_risk_edge` labels for U-Belt | **Does not exist** |
| `historical_flood_frequency` | Needs multi-observation history |
| `distance_to_documented_waterway_m` | Waterway dataset not sourced |
| `rainfall_band_before_outcome` | PAGASA data not sourced |
| `baseline_travel_time_s` | Owned by routing team, not yet published |

The external Ondoy 2009 experiment under
`ml/external-experiments/ondoy-2009-metro-manila/` covers **all of Metro
Manila**, not the U-Belt pilot area. Cropping it to U-Belt produces fewer
than 30 positive examples — statistically insufficient for training
(per the ≥ 200-record, ≥ 40-per-class threshold in `ML_FEASIBILITY.md`).

This is the exact scenario `ML_FEASIBILITY.md` anticipated:

> *"If these conditions are not met, the completed academic output is the
> externally trained experiment plus its documented evaluation, while the
> application demonstration uses the rule-based fallback. This is not
> cancellation of ML; it is a controlled integration decision."*

## What activates when U-Belt labels exist

When a U-Belt model is trained under the target and feature contract, only
two changes are needed in the runtime path:

1. Set `ML_ENABLED=true` in the backend `.env`
2. Add `xgboost` to `backend/requirements.txt`

The adapter picks up the artifact automatically. No code changes.

## Test coverage

`backend/tests/test_ml_inference.py` covers:

- Valid request returns the full contract shape
- Invalid inputs rejected with HTTP 422
- Missing required fields rejected with HTTP 422
- Fallback probabilities are in range across elevation edge cases
- `ml_penalty_seconds` matches `round(probability * 60)`
- Model-loaded path (skipped until xgboost is a runtime dependency)

## Limitations

- **Fallback is the operative path.** The adapter is a scaffold, not a
  deployed predictive model.
- **Fallback features are heuristic.** The deterministic formula is a
  documented placeholder, not a calibrated model.
- **No geographic aggregation.** The endpoint scores one edge per call. The
  routing engine aggregates per mission.
- **No caching.** For routing loops scoring hundreds of edges per mission,
  an in-memory cache or batched endpoint may be needed. Not in scope here.