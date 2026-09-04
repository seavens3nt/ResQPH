# AI/ML workspace

This folder contains data investigation, preprocessing, feature engineering, rule-based baselines, model experiments, evaluation, error analysis, and exported artifacts for road-risk or passability estimation.

The project must preserve a rule-based fallback. Large trained artifacts and private or restricted datasets must not be committed to ordinary Git history.

## Intended structure

Keep `notebooks/` for exploration. Reusable work belongs under `src/resqph_ml/`:

- `data/` for reproducible loading and preparation.
- `features/` for feature definitions and transformations.
- `baselines/` for the mandatory rule-based risk baseline.
- `models/` for approved manageable experiments.
- `evaluation/` for split logic, metrics, error analysis, and reports.
- `inference.py` for a stable prediction interface only when integration is approved.
- `tests/` for preparation, baseline, evaluation, inference, and fallback behavior.

Production/backend code must never import notebooks. Routing and backend code should consume a stable, explainable risk result through an adapter rather than depending directly on scikit-learn objects or generated artifacts.
