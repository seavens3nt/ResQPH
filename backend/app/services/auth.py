from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from pymongo import ASCENDING
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.schemas.auth import AccountRegister, AccountResponse
from app.schemas.common import DemoActor, ServiceError
from app.security.passwords import hash_password, verify_password
from app.services.stations import station_by_id


class AuthService:
    def __init__(self, database: AsyncDatabase) -> None:
        self.accounts = database["accounts"]
        self.sessions = database["auth_sessions"]

    async def ensure_indexes(self) -> None:
        await self.accounts.create_index([("email", ASCENDING)], unique=True, name="uq_account_email")
        await self.accounts.create_index([("id", ASCENDING)], unique=True, name="uq_account_id")
        await self.accounts.create_index(
            [("station_id", ASCENDING)],
            unique=True,
            name="uq_station_account",
            partialFilterExpression={"station_id": {"$type": "string"}},
        )
        await self.sessions.create_index([("token_hash", ASCENDING)], unique=True, name="uq_session_token_hash")
        await self.sessions.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0, name="ttl_session_expiry")
        await self.sessions.create_index([("account_id", ASCENDING)], name="ix_session_account")

    async def register_citizen(self, payload: AccountRegister) -> dict:
        now = datetime.now(UTC)
        account = {
            "id": f"account-{uuid4().hex}",
            "email": str(payload.email).strip().lower(),
            "name": payload.name,
            "role": "citizen",
            "password_hash": hash_password(payload.password),
            "phone": payload.phone,
            "emergency_contact": getattr(payload, "emergency_contact", None),
            "medical_info": getattr(payload, "medical_info", None),
            "avatar_url": getattr(payload, "avatar_url", None),
            "location_permission": getattr(payload, "location_permission", False),
            "station_id": None,
            "created_at": now,
            "updated_at": now,
        }
        try:
            await self.accounts.insert_one(account)
        except DuplicateKeyError as exc:
            raise ServiceError(409, "email_already_registered", "An account already exists for this email.") from exc
        return account

    async def authenticate(self, email: str, password: str, station_id: str | None) -> tuple[dict, str, str, datetime]:
        account = await self.accounts.find_one({"email": email.strip().lower()})
        if account is None or not verify_password(password, account.get("password_hash", "")):
            raise ServiceError(401, "invalid_credentials", "Email or password is incorrect.")
        if account["role"] == "rescuer":
            station = station_by_id(account.get("station_id", ""))
            if station is None or station_id != station["station_id"]:
                raise ServiceError(403, "station_membership_mismatch", "This account is not a member of the selected station.")
        elif station_id:
            raise ServiceError(400, "station_not_applicable", "A station can only be selected for a station account.")

        session_token = secrets.token_urlsafe(32)
        csrf_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(hours=settings.auth_session_ttl_hours)
        await self.sessions.insert_one({
            "token_hash": _digest(session_token),
            "csrf_hash": _digest(csrf_token),
            "account_id": account["id"],
            "created_at": datetime.now(UTC),
            "expires_at": expires_at,
        })
        return account, session_token, csrf_token, expires_at

    async def actor_from_token(self, session_token: str | None) -> tuple[DemoActor, dict, dict] | None:
        if not session_token:
            return None
        session = await self.sessions.find_one({"token_hash": _digest(session_token), "expires_at": {"$gt": datetime.now(UTC)}})
        if session is None:
            return None
        account = await self.accounts.find_one({"id": session["account_id"]})
        if account is None:
            await self.sessions.delete_one({"_id": session["_id"]})
            return None
        station_id = account.get("station_id")
        user_id = account["id"]
        if account["role"] == "rescuer":
            station = station_by_id(station_id or "")
            if station is None:
                return None
            user_id = station["team_id"]
        actor = DemoActor(user_id=user_id, role=account["role"], account_id=account["id"], station_id=station_id)
        return actor, account, session

    async def logout(self, session_token: str | None) -> None:
        if session_token:
            await self.sessions.delete_one({"token_hash": _digest(session_token)})

    async def update_profile(self, account_id: str, values: dict) -> dict:
        values["name"] = " ".join(values["name"].split())
        values["updated_at"] = datetime.now(UTC)
        await self.accounts.update_one(
            {"id": account_id},
            {"$set": values},
        )
        account = await self.accounts.find_one({"id": account_id})
        if account is None:
            raise ServiceError(404, "account_not_found", "Account is unavailable.")
        return account


def account_response(account: dict) -> AccountResponse:
    station = station_by_id(account.get("station_id", "")) if account.get("station_id") else None
    return AccountResponse(
        id=account["id"], email=account["email"], name=account["name"], role=account["role"],
        phone=account.get("phone"), station_id=station["station_id"] if station else None,
        station_name=station["name"] if station else None, station_address=station["address"] if station else None,
        emergency_contact=account.get("emergency_contact"), medical_info=account.get("medical_info"),
        avatar_url=account.get("avatar_url"), location_permission=account.get("location_permission", False),
        created_at=account["created_at"],
    )


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()
