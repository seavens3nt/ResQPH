"""ML smoke tests: triage + road-risk pipeline + fallback."""
import pandas as pd

from resqph_ondoy_2009.models import nlp_triage, road_risk
from resqph_ondoy_2009.common import config


def test_triage_extracts_entities():
    r = nlp_triage.triage_text(
        "Trapped on roof, chest-deep water, grandmother needs insulin"
    )
    assert r.priority in config.NLP_TRIAGE_LABELS
    assert r.medical is True
    assert r.vulnerable is True
    assert r.flood_depth_m > 0.5


def test_rule_based_risk_bounds():
    rb = road_risk.RuleBasedRisk()
    df = pd.DataFrame(
        [
            {
                "flood_depth_m": 1.2,
                "flood_hazard_class": 2,
                "elevation_m": 2.0,
                "distance_to_evac_m": 4000,
            }
        ]
    )
    pred = rb.predict(df)
    assert 0.0 <= pred[0] <= 1.0


def test_train_produces_model_or_fallback(tmp_path, monkeypatch):
    # Regenerate processed data so the test is self-contained
    from resqph_ondoy_2009.etl.extract import extract_all
    from resqph_ondoy_2009.etl.load import load_processed
    from resqph_ondoy_2009.etl.transform import transform_all

    monkeypatch.setattr(config, "PROCESSED_DIR", tmp_path / "processed")
    monkeypatch.setattr(config, "MODELS_DIR", tmp_path / "artifacts")
    config.PROCESSED_DIR.mkdir(parents=True)
    config.MODELS_DIR.mkdir(parents=True)
    config.set_global_seed()
    raw = extract_all()
    processed = transform_all(raw)
    load_processed(processed)

    result = road_risk.train(model_name="random_forest", export=True)
    assert result["mode"] in {"ml", "rule_based"}
    assert config.model_path(config.MODEL_ROAD_RISK).exists()
    assert config.model_path(config.MODEL_FEATURE_META).exists()
