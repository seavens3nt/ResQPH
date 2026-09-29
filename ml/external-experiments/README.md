# External ML experiments

This folder holds self-contained ML experiments completed outside the U-Belt
contract defined in `docs/ml/ML_FEASIBILITY.md`. They are stored here for
provenance and reproducibility. They are **not** integrated into runtime
paths (`backend/`, `routing/`, `frontend/`).

Each experiment lives in its own subfolder with:

- `README.md` — scope, limitations, reproduction instructions
- `requirements.txt` — pinned isolated environment (may differ from `ml/requirements.txt`)
- `src/`, `scripts/`, `tests/` — code and tests
- `artifacts/` — trained models and metadata, whitelisted in `.gitignore` per D-021

Runtime code must never import from `ml/external-experiments/`. Any runtime
integration happens through a stable adapter in `ml/src/` or
`backend/app/services/` after a formal evidence review per `ML_FEASIBILITY.md`.

## Experiments

| Experiment | Status | Target | Study area |
|---|---|---|---|
| `ondoy-2009-metro-manila/` | Evidence package in progress | `flooded_ondoy_2009` | Metro Manila (60 x 30 km) |

## References

- Decision D-020 — accept the Metro Manila Ondoy 2009 experiment as evidence
- Decision D-021 — approve XGBoost + geospatial libraries as experiment-only deps
- `docs/ml/ML_FEASIBILITY.md` — evidence requirements and integration gate
