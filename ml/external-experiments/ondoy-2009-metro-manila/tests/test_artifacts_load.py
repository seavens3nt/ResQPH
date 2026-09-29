"""
Verify that the shipped artifacts load and behave as documented.

These are the files the future runtime adapter will consume; if they
cannot load cleanly under the current environment, the evidence package
is not acceptable.
"""
from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
import pytest

from resqph_ondoy_2009.common import config

ARTIFACTS = config.MODELS_DIR
CLASSIFIER = ARTIFACTS / "road_flood_classifier.pkl"
SURROGATE = ARTIFACTS / "road_risk_surrogate.pkl"
FEATURE_META = ARTIFACTS / "feature_metadata.json"
FLOOD_META = ARTIFACTS / "flood_classifier_metadata.json"


def test_artifacts_exist():
    assert CLASSIFIER.exists(), f"missing {CLASSIFIER}"
    assert SURROGATE.exists(), f"missing {SURROGATE}"
    assert FEATURE_META.exists(), f"missing {FEATURE_META}"
    assert FLOOD_META.exists(), f"missing {FLOOD_META}"


def test_classifier_loads_and_predicts():
    import xgboost as xgb

    model = joblib.load(CLASSIFIER)
    assert isinstance(model, xgb.XGBClassifier)

    # Minimal synthetic input matching the 7-feature contract
    X = pd.DataFrame([{f: 0.0 for f in config.ROAD_RISK_FEATURES}])
    proba = model.predict_proba(X)
    assert proba.shape == (1, 2)
    assert 0.0 <= proba[0, 1] <= 1.0


def test_surrogate_loads_and_predicts():
    import xgboost as xgb

    model = joblib.load(SURROGATE)
    assert isinstance(model, xgb.XGBRegressor)

    X = pd.DataFrame([{f: 0.0 for f in config.ROAD_RISK_FEATURES}])
    pred = model.predict(X)
    assert len(pred) == 1
    assert 0.0 <= pred[0] <= 1.0


def test_metadata_matches_feature_contract():
    import json

    with FEATURE_META.open(encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["features"] == config.ROAD_RISK_FEATURES
    assert meta["target"] == config.ROAD_RISK_TARGET
    assert meta["model_name"] == "xgboost"


def test_rule_based_fallback_still_works():
    from resqph_ondoy_2009.models.road_risk import RuleBasedRisk

    rb = RuleBasedRisk()
    X = pd.DataFrame([{f: 0.0 for f in config.ROAD_RISK_FEATURES}])
    pred = rb.predict(X)
    assert len(pred) == 1
    assert 0.0 <= pred[0] <= 1.0
