import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AccountRegister(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=128)
    phone: str | None = Field(default=None, max_length=24)
    emergency_contact: dict[str, str] | None = None
    location_permission: bool = False

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not _valid_email(normalized):
            raise ValueError("Enter a valid email address.")
        return normalized


class AccountLogin(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)
    station_id: str | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not _valid_email(normalized):
            raise ValueError("Enter a valid email address.")
        return normalized


class AccountProfileUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=24)
    emergency_contact: dict[str, str] | None = None
    medical_info: dict[str, str] | None = None
    avatar_url: str | None = Field(default=None, max_length=2048)


class AccountResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    email: str
    name: str
    role: Literal["citizen", "rescuer"]
    phone: str | None = None
    station_id: str | None = None
    station_name: str | None = None
    station_address: str | None = None
    emergency_contact: dict[str, str] | None = None
    medical_info: dict[str, str] | None = None
    avatar_url: str | None = None
    location_permission: bool = False
    created_at: datetime


class SessionResponse(BaseModel):
    user: AccountResponse
    expires_at: datetime


def _valid_email(value: str) -> bool:
    return len(value) <= 254 and re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value) is not None
