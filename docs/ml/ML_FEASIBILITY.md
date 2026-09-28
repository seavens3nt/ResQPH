# Road-risk ML feasibility and evaluation plan

**Status:** XGBoost selected; repository evidence and runtime acceptance pending
**Approved candidate:** XGBoost road-risk classifier
**Required fallback:** deterministic rule-based risk score
**Last updated:** 2026-09-29

The original Logistic Regression and Random Forest requirement was superseded by decision D-019. Matthew reports that an XGBoost model trained from Typhoon Ondoy 2009 data achieved ROC-AUC `0.97` and recall `0.92`, with a smaller artifact than the tested Random Forest; Logistic Regression reportedly did not learn the patterns sufficiently. Those figures are team-reported, not independently verified in this repository.

## Intended use

The ML component estimates a bounded road-risk probability or category for a road edge. An accepted result may add a non-negative penalty to the deterministic routing cost. It cannot mark an impassable edge passable, override a controlled rule, dispatch a team, or make an autonomous safety decision.

## Approved target

The Phase 1 target is binary `high_risk_edge` for one road edge under one labeled scenario or historical observation:

- `1`: the verified outcome is `high`, `severe`, `restricted`, or `impassable`;
- `0`: the verified outcome is `none`, `low`, or `moderate` and `passable`.

Each record must include a stable `edge_id`, scenario/time group, spatial group, source type, and label provenance. The contract fixture is [`../../data/samples/ml-road-risk-contract.example.json`](../../data/samples/ml-road-risk-contract.example.json).

Controlled labels are approved for demonstrating preprocessing, training, comparison, inference, and fallback. They are not evidence of real-world predictive accuracy. Application integration remains optional and requires an honest held-out evaluation.

## Candidate features

- Road class
- Edge length and baseline travel time
- Historical flood frequency calculated only from records before the labeled outcome
- Maximum prior flood depth calculated only from records before the labeled outcome
- Distance to a documented waterway when the method and CRS are recorded
- Optional contextual elevation with missingness handling
- Rainfall band before the outcome when its source period aligns with the label

Do not train on `edge_id`, current outcome flood level, current outcome passability, post-outcome observations, or duplicate location identifiers. These leak the answer or memorize location rather than learning a defensible relationship.

## Data sufficiency and split decision

- Use grouped train/validation/test partitions by `scenario_group` and `spatial_group`; the same edge/scenario group must not cross partitions.
- Prefer a temporal test set when multiple historical periods exist.
- Report missingness and class balance before fitting.
- If fewer than 200 labeled records exist, either class has fewer than 40 examples, or grouped splitting cannot create all partitions, the experiment may still demonstrate the pipeline but its output is not integrated into routing.
- Synthetic controlled records are always labeled as synthetic and are never mixed with historical records without a source indicator and separate result reporting.

## Required evidence package

1. Rule-based baseline using the approved deterministic risk table.
2. XGBoost training code or immutable training reference with dependency versions and random seeds.
3. Dataset provenance for the Ondoy 2009 records plus the exact feature and target schema.
4. Leakage-safe train/validation/test construction and comparison against the rule baseline.
5. Metrics, confusion matrix, and error analysis, especially false-low-risk predictions.
6. Serialized artifact metadata, checksum, version, and stable edge-risk inference contract.
7. Inference fallback tests for missing, malformed, incompatible, or rejected artifacts.

## Evaluation

Report at minimum:

- Sample count and class distribution
- Train/validation/test construction
- Precision, recall, and F1 by risk class
- Confusion matrix
- ROC-AUC only when the target and class structure make it meaningful
- Calibration or probability reliability when probabilities become routing penalties
- False-low-risk cases and their consequences
- Geographic and temporal limitations

Use a spatial or temporal holdout when enough data exist. A random row split is not acceptable when neighboring or repeated road observations could leak nearly identical examples across sets.

## Integration acceptance

The evidence package is a required deliverable. Model output is integrated into the demo only when:

- The target and labels are defensible and documented.
- The held-out evaluation is reproducible.
- The output schema is stable and keyed to routing edges.
- The model does not silently emit out-of-range or missing values.
- False-low-risk behavior and limitations are documented.
- Ranee accepts the evidence.

If these conditions are not met, the completed academic output is the externally trained experiment plus its documented evaluation, while the application demonstration uses the rule-based fallback. This is not cancellation of ML; it is a controlled integration decision.

## Approved model-to-routing mapping

An accepted probability becomes a non-negative bounded cost:

```text
ml_penalty = round(clamp(risk_probability, 0, 1) * 60)
```

The maximum ML contribution is therefore `60` seconds-equivalent prototype cost units per edge. It cannot reduce deterministic penalties, restore an excluded edge, or replace the rule-based score. Invalid, incompatible, or stale output is rejected and produces a visible fallback indicator.

## Inference contract

```json
{
  "edge_id": "edge-001",
  "risk_probability": 0.74,
  "risk_level": "high",
  "model_name": "xgboost",
  "model_version": "xgb-ondoy-001",
  "generated_at": "2026-09-21T04:00:00Z"
}
```

The adapter rejects unknown edge IDs, non-finite probabilities, values outside `0..1`, incompatible versions, and stale results outside the documented scenario policy.
