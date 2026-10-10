from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from pymongo.asynchronous.database import AsyncDatabase

from app.api.dependencies.demo_role import get_demo_actor
from app.core.config import settings
from app.core.rate_limit import check_rate_limit
from app.db.mongodb import get_database
from app.schemas.auth import (
    AccountLogin,
    AccountProfileUpdate,
    AccountRegister,
    AccountResponse,
    SessionResponse,
)
from app.schemas.common import DemoActor, ServiceError
from app.services.auth import AuthService, account_response

router = APIRouter(prefix="/auth", tags=["authentication"])


def _set_session_cookies(response: Response, token: str, csrf: str) -> None:
    common = {
        "secure": settings.auth_cookie_secure,
        "samesite": settings.auth_cookie_samesite,
    }
    max_age = settings.auth_session_ttl_hours * 60 * 60
    response.set_cookie(settings.auth_cookie_name, token, httponly=True, max_age=max_age, path=settings.api_prefix, **common)
    response.set_cookie(settings.auth_csrf_cookie_name, csrf, httponly=False, max_age=max_age, path="/", **common)


def _clear_session_cookies(response: Response) -> None:
    response.delete_cookie(settings.auth_cookie_name, path=settings.api_prefix)
    response.delete_cookie(settings.auth_csrf_cookie_name, path="/")


@router.post("/register", response_model=AccountResponse, status_code=201)
async def register(
    payload: AccountRegister,
    request: Request,
    response: Response,
    database: Annotated[AsyncDatabase, Depends(get_database)],
) -> AccountResponse:
    check_rate_limit(request, actor_id=payload.email, action="auth-register", limit=5)
    service = AuthService(database)
    account = await service.register_citizen(payload)
    account, token, csrf, _expires_at = await service.authenticate(account["email"], payload.password, None)
    _set_session_cookies(response, token, csrf)
    return account_response(account)


@router.post("/login", response_model=SessionResponse)
async def login(
    payload: AccountLogin,
    request: Request,
    response: Response,
    database: Annotated[AsyncDatabase, Depends(get_database)],
) -> SessionResponse:
    check_rate_limit(request, actor_id=payload.email, action="auth-login", limit=8)
    account, token, csrf, expires_at = await AuthService(database).authenticate(
        str(payload.email), payload.password, payload.station_id
    )
    _set_session_cookies(response, token, csrf)
    return SessionResponse(user=account_response(account), expires_at=expires_at)


@router.get("/session", response_model=SessionResponse)
async def current_session(
    request: Request,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    database: Annotated[AsyncDatabase, Depends(get_database)],
) -> SessionResponse:
    session = await AuthService(database).actor_from_token(request.cookies.get(settings.auth_cookie_name))
    if session is None:
        raise ServiceError(401, "authentication_required", "Sign in to continue.")
    _actor, account, session_doc = session
    return SessionResponse(user=account_response(account), expires_at=session_doc["expires_at"])


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    _actor: Annotated[DemoActor, Depends(get_demo_actor)],
    database: Annotated[AsyncDatabase, Depends(get_database)],
) -> Response:
    await AuthService(database).logout(request.cookies.get(settings.auth_cookie_name))
    _clear_session_cookies(response)
    response.status_code = 204
    return response


@router.patch("/profile", response_model=AccountResponse)
async def update_profile(
    payload: AccountProfileUpdate,
    request: Request,
    actor: Annotated[DemoActor, Depends(get_demo_actor)],
    database: Annotated[AsyncDatabase, Depends(get_database)],
) -> AccountResponse:
    if not actor.account_id:
        raise ServiceError(401, "authentication_required", "Sign in to continue.")
    check_rate_limit(request, actor_id=actor.user_id, action="profile-update", limit=10)
    account = await AuthService(database).update_profile(
        actor.account_id,
        payload.model_dump(exclude_unset=True),
    )
    return account_response(account)
