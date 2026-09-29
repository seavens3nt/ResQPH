"""
ML road-risk inference endpoints.

The adapter is intentionally decoupled from any specific model artifact.
When no model is loaded, the endpoint still returns a valid response using
the deterministic rule-based fallback (D-005).
"""
from fastapi import APIRouter

from app.integrations import ml_inference
from app.schemas.ml import RoadRiskRequest, RoadRiskResponse

router = APIRouter(prefix="/ml", tags=["ml"])


@router.post(
    "/road-risk",
    response_model=RoadRiskResponse,
    summary="Score one road edge for flood risk",
    description=(
        "Returns a bounded risk probability in [0, 1], a categorical risk "
        "level, and the ML penalty per ML_FEASIBILITY.md. The response shape "
        "is stable whether or not a trained model is loaded; `fallback_used` "
        "indicates which path fired."
    ),
)
async def score_road_risk(payload: RoadRiskRequest) -> RoadRiskResponse:
    result = ml_inference.predict_road_risk(payload.model_dump())
    return RoadRiskResponse(**result)
