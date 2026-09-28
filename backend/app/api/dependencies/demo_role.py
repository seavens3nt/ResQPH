from typing import Annotated

from fastapi import Header

from app.schemas.common import DemoActor, ServiceError

_ALLOWED_DEMO_ROLES = {"citizen", "volunteer", "rescuer", "coordinator"}


def get_demo_actor(
    x_demo_user_id: Annotated[str | None, Header(alias="X-Demo-User-Id")] = None,
    x_demo_role: Annotated[str | None, Header(alias="X-Demo-Role")] = None,
) -> DemoActor:
    user_id = (x_demo_user_id or "").strip()
    role = (x_demo_role or "").strip().lower()

    if not user_id:
        raise ServiceError(
            403,
            "demo_identity_required",
            "A simulated user id is required for this prototype operation.",
            [{"field": "X-Demo-User-Id", "reason": "missing or blank header"}],
        )
    if role not in _ALLOWED_DEMO_ROLES:
        raise ServiceError(
            403,
            "demo_role_required",
            "A supported simulated role is required for this prototype operation.",
            [{"field": "X-Demo-Role", "reason": "unsupported or missing role"}],
        )
    return DemoActor(user_id=user_id, role=role)  # type: ignore[arg-type]
