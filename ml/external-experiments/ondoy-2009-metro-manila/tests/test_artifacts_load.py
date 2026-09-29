"""
Verify that the shipped artifacts load and behave as documented.

These are the files the future runtime adapter will consume; if they
cannot load cleanly under the current environment, the evidence package
is not acceptable.
"""
from __future__ import annotations

import hashlib
import json

import joblib
import pandas as pd

from resqph_ondoy_2009.common import config

ARTIFACTS = config.MODELS_DIR
CLASSIFIER = ARTIFACTS / "road_flood_classifier.pkl"
SURROGATE = ARTIFACTS / "road_risk_surrogate.pkl"
FEATURE_META = ARTIFACTS / "feature_metadata.json"
FLOOD_META = ARTIFACTS / "flood_classifier_metadata.json"
MANIFEST = ARTIFACTS / "SHA256SUMS"


def _manifest() -> dict[str, str]:
    entries = {}
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        digest, name = line.split(maxsplit=1)
        entries[name.strip()] = digest
    return entries


def _assert_manifest_digest(path) -> None:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert _manifest()[path.name] == digest


def test_artifacts_exist():
    assert CLASSIFIER.exists(), f"missing {CLASSIFIER}"
    assert SURROGATE.exists(), f"missing {SURROGATE}"
    assert FEATURE_META.exists(), f"missing {FEATURE_META}"
    assert FLOOD_META.exists(), f"missing {FLOOD_META}"
    assert MANIFEST.exists(), f"missing {MANIFEST}"


def test_manifest_matches_every_listed_artifact():
    for name in _manifest():
        _assert_manifest_digest(ARTIFACTS / name)


def test_classifier_loads_and_predicts():
    import xgboost as xgb

    _assert_manifest_digest(CLASSIFIER)
    model = joblib.load(CLASSIFIER)
    assert isinstance(model, xgb.XGBClassifier)

    # Minimal synthetic input matching the 7-feature contract
    X = pd.DataFrame([{f: 0.0 for f in config.ROAD_RISK_FEATURES}])
    proba = model.predict_proba(X)
    assert proba.shape == (1, 2)
    assert 0.0 <= proba[0, 1] <= 1.0


def test_surrogate_loads_and_predicts():
    from sklearn.ensemble import RandomForestRegressor

    _assert_manifest_digest(SURROGATE)
    model = joblib.load(SURROGATE)
    assert isinstance(model, RandomForestRegressor)

    X = pd.DataFrame([{f: 0.0 for f in config.ROAD_RISK_FEATURES}])
    pred = model.predict(X)
    assert len(pred) == 1
    assert 0.0 <= pred[0] <= 1.0


def test_metadata_matches_feature_contract():
    with FEATURE_META.open(encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["features"] == config.ROAD_RISK_FEATURES
    assert meta["target"] == config.ROAD_RISK_TARGET
    assert meta["model_name"] == "random_forest"
    assert meta["runtime_compatible"] is False
    assert meta["artifact_sha256"] == _manifest()[SURROGATE.name]


def test_classifier_metadata_records_exploratory_boundary():
    metadata = json.loads(FLOOD_META.read_text(encoding="utf-8"))

    assert metadata["best_model"] == "xgboost"
    assert metadata["target"] == config.ROAD_FLOOD_TARGET
    assert metadata["features"] == config.ROAD_RISK_FEATURES
    assert metadata["evaluation_status"] == "exploratory_only"
    assert metadata["split"]["method"] == "stratified_random_row_holdout"
    assert metadata["runtime_compatible"] is False
    assert metadata["artifact_sha256"] == _manifest()[CLASSIFIER.name]
    assert metadata["error_analysis"]["false_negatives"] == 8
    assert metadata["error_analysis"]["false_positives"] == 307


def test_rule_based_fallback_still_works():
    from resqph_ondoy_2009.models.road_risk import RuleBasedRisk

    rb = RuleBasedRisk()
    X = pd.DataFrame([{f: 0.0 for f in config.ROAD_RISK_FEATURES}])
    pred = rb.predict(X)
    assert len(pred) == 1
    assert 0.0 <= pred[0] <= 1.0
