from typing import Any

import pytest

import app.main as main_module
from app.db import mongodb


class FakeAdmin:
    def __init__(self, failure: Exception | None = None) -> None:
        self.failure = failure

    async def command(self, _: str) -> dict[str, int]:
        if self.failure is not None:
            raise self.failure
        return {"ok": 1}


class FakeClient:
    def __init__(self, failure: Exception | None = None) -> None:
        self.admin = FakeAdmin(failure)
        self.closed = False

    async def close(self) -> None:
        self.closed = True


@pytest.mark.asyncio
async def test_failed_initial_ping_closes_client_and_does_not_publish_it(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = FakeClient(RuntimeError("ping failed"))
    monkeypatch.setattr(mongodb, "AsyncMongoClient", lambda _: fake_client)
    mongodb._client = None

    with pytest.raises(RuntimeError, match="ping failed"):
        await mongodb.connect_mongodb()

    assert fake_client.closed is True
    with pytest.raises(RuntimeError, match="has not been connected"):
        mongodb.get_database()


@pytest.mark.asyncio
async def test_lifespan_closes_client_when_database_initialization_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def connect() -> None:
        calls.append("connect")

    async def initialize(_: Any) -> None:
        calls.append("initialize")
        raise RuntimeError("index setup failed")

    async def close() -> None:
        calls.append("close")

    monkeypatch.setattr(main_module, "connect_mongodb", connect)
    monkeypatch.setattr(main_module, "get_database", lambda: object())
    monkeypatch.setattr(main_module, "initialize_database", initialize)
    monkeypatch.setattr(main_module, "close_mongodb", close)

    with pytest.raises(RuntimeError, match="index setup failed"):
        async with main_module.lifespan(main_module.app):
            pytest.fail("lifespan yielded after failed initialization")

    assert calls == ["connect", "initialize", "close"]
