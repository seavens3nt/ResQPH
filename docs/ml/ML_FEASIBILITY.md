# Road-risk ML feasibility and evaluation plan

**Status:** Required experiment; data feasibility still under validation
**Approved models:** Logistic Regression and Random Forest
**Excluded model:** XGBoost
**Last updated:** 2026-09-21

## Intended use

The ML component estimates a bounded road-risk probability or category for a road edge. An accepted result may add a non-negative penalty to the deterministic routing cost. It cannot mark an impassable edge passable, override a controlled rule, dispatch a team, or make an autonomous safety decision.

## Proposed target

Preferred target: a documented road-edge risk label such as `low`, `moderate`, or `high`, or a binary `passable_under_scenario` label when the source data support it.

The target is not approved until the team verifies its source, meaning, class balance, geographic coverage, timestamp, and join to a stable `edge_id`. Controlled labels may be used to demonstrate the pipeline but must not be presented as evidence of real-world predictive accuracy.

## Candidate features

- Historical or controlled flood-hazard category
- Reported or scenario flood depth
- Elevation or relative elevation when resolution is suitable
- Road class
- Distance to a documented hazard feature when methodologically justified
- Verified reported road condition
- Rainfall category only when its source period aligns with the label

Identifiers, post-outcome information, duplicate location proxies, and information collected after the target event require leakage review.

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
