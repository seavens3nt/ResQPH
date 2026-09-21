# Road-risk ML feasibility and evaluation plan

**Status:** Completed Phase 1 experiment contract; later training evidence required
**Approved models:** Logistic Regression and Random Forest
**Excluded model:** XGBoost
**Last updated:** 2026-09-22

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

## Required experiments

1. Rule-based baseline using the approved deterministic risk table.
2. Logistic Regression with documented preprocessing and interpretable coefficients.
3. Random Forest using the same approved feature/label split.
4. Comparison against the baseline on the same held-out data.
5. Error analysis, especially false-low-risk predictions.
6. Inference fallback test for missing, malformed, or rejected artifacts.

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

The experiment is a required deliverable. Model output is integrated into the demo only when:

- The target and labels are defensible and documented.
- The held-out evaluation is reproducible.
- The output schema is stable and keyed to routing edges.
- The model does not silently emit out-of-range or missing values.
- False-low-risk behavior and limitations are documented.
- Ranee accepts the evidence.

If these conditions are not met, the completed academic output is the evaluated experiment and error analysis, while the application demonstration uses the rule-based fallback. This is not cancellation of ML; it is a controlled integration decision.

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
  "model_name": "random_forest",
  "model_version": "rf-001",
  "generated_at": "2026-09-21T04:00:00Z"
}
```

The adapter rejects unknown edge IDs, non-finite probabilities, values outside `0..1`, incompatible versions, and stale results outside the documented scenario policy.
