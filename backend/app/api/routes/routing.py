"""Route evaluation endpoint for the controlled routing prototype."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies.demo_role import get_demo_actor
from app.integrations.routing import RoutingAdapter, RoutingIntegrationError
from app.schemas.common import DemoActor, ErrorEnvelope, ServiceError
from app.schemas.routing import RouteEvaluateResponse, RouteRequest

router = APIRouter(prefix="/routes", tags=["routing"])

ERROR_RESPONSES = {
    403: {"model": ErrorEnvelope},
    422: {"model": ErrorEnvelope},
    500: {"model": ErrorEnvelope},
    503: {"model": ErrorEnvelope},
}


def get_routing_adapter() -> RoutingAdapter:
    return RoutingAdapter()


@router.post(
    "/evaluate",
    response_model=RouteEvaluateResponse,
    responses=ERROR_RESPONSES,
    summary="Evaluate a controlled flood-aware route",
    description=(
        "Evaluates a route under the accepted controlled U-Belt scenario. "
        "Responses are synthetic prototype results and must not be treated as "
        "live flood data, official dispatch guidance, or guaranteed-safe navigation."
    ),
)
async def evaluate_route(
    payload: RouteRequest,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    adapter: Annotated[RoutingAdapter, Depends(get_routing_adapter)],
) -> RouteEvaluateResponse:
    if actor.role not in {"rescuer", "coordinator"}:
        raise ServiceError(
            status.HTTP_403_FORBIDDEN,
            "forbidden",
            "This simulated role cannot evaluate routes.",
            [{"field": "X-Demo-Role", "reason": "expected rescuer or coordinator"}],
        )

    try:
        return adapter.evaluate(payload)
    except RoutingIntegrationError as exc:
        status_code = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if exc.code == "routing_engine_unavailable"
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        raise ServiceError(status_code, exc.code, exc.message, exc.details) from exc
