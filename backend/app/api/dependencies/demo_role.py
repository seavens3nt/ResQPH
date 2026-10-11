import hashlib
import hmac
from typing import Annotated

from fastapi import Header, Request

from app.core.config import settings
from app.db.mongodb import get_database
from app.schemas.common import DemoActor, ServiceError
from app.services.auth import AuthService

_ALLOWED_DEMO_ROLES = {"citizen", "rescuer", "coordinator"}


async def get_demo_actor(
    request: Request,
    x_demo_user_id: Annotated[str | None, Header(alias="X-Demo-User-Id")] = None,
    x_demo_role: Annotated[str | None, Header(alias="X-Demo-Role")] = None,
) -> DemoActor:
    if settings.auth_allow_demo_headers and x_demo_user_id and x_demo_role:
        user_id = x_demo_user_id.strip()
        role = x_demo_role.strip().lower()
        if user_id and role in _ALLOWED_DEMO_ROLES:
            return DemoActor(user_id=user_id, role=role)  # type: ignore[arg-type]
        raise ServiceError(403, "demo_role_required", "A supported simulated role is required for this test operation.")

    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        raise ServiceError(401, "authentication_required", "Sign in to continue.")
    database = get_database()
    session = await AuthService(database).actor_from_token(token)
    if session is None:
        raise ServiceError(401, "authentication_required", "Sign in to continue.")
    actor, _account, session_document = session
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        csrf_cookie = request.cookies.get(settings.auth_csrf_cookie_name, "")
        csrf_header = request.headers.get("X-CSRF-Token", "")
        csrf_hash = hashlib.sha256(csrf_cookie.encode()).hexdigest()
        if not csrf_cookie or not hmac.compare_digest(csrf_cookie, csrf_header) or not hmac.compare_digest(csrf_hash, session_document["csrf_hash"]):
            raise ServiceError(403, "csrf_validation_failed", "The request could not be verified. Refresh and try again.")
    return actor
