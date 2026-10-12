import pytest

from app.management.provision_demo_accounts import validate_demo_target


@pytest.mark.parametrize(
    "name", ["resqph", "test", "resqph_demo_", "resqph_demo_x;drop"]
)
def test_demo_guard_refuses_normal_or_invalid_database(name: str) -> None:
    with pytest.raises(ValueError):
        validate_demo_target(name, "mongodb://localhost:27018/?replicaSet=rs0")


def test_demo_guard_accepts_only_local_explicit_demo_target() -> None:
    validate_demo_target(
        "resqph_demo_local", "mongodb://localhost:27018/?replicaSet=rs0"
    )
    with pytest.raises(ValueError):
        validate_demo_target("resqph_demo_local", "mongodb://external.example.test/")


@pytest.mark.asyncio
async def test_repeat_demo_provisioning_preserves_existing_accounts_without_credentials(
    monkeypatch,
) -> None:
    from pathlib import Path
    from types import SimpleNamespace
    from unittest.mock import AsyncMock

    from app.management import provision_demo_accounts as module
    from app.services.stations import load_station_catalog

    catalog = load_station_catalog()["stations"]
    accounts = {
        f"citizen{i}@example.test": {"role": "citizen", "station_id": None}
        for i in range(1, 6)
    }
    for name, email in zip(module.STATION_NAMES, module.STATION_EMAILS, strict=True):
        accounts[email] = {
            "role": "rescuer",
            "station_id": next(s["station_id"] for s in catalog if s["name"] == name),
        }
    collection = SimpleNamespace(
        find_one=AsyncMock(side_effect=lambda query: accounts[query["email"]])
    )
    marker = SimpleNamespace(
        find_one=AsyncMock(return_value={"id": "managed-demo"}),
        update_one=AsyncMock(),
        delete_one=AsyncMock(),
    )

    class Database:
        accounts = collection
        demo_environment = marker

        def __getitem__(self, name):
            return marker

    class Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def with_transaction(self, callback):
            return await callback(self)

    class Client:
        admin = SimpleNamespace(command=AsyncMock(return_value={"setName": "rs0"}))

        async def list_database_names(self):
            return ["resqph_demo_repeat"]

        def __getitem__(self, name):
            return Database()

        def start_session(self):
            return Session()

        async def close(self):
            return None

    monkeypatch.setattr(module.settings, "mongodb_database", "resqph_demo_repeat")
    monkeypatch.setattr(
        module.settings, "mongodb_uri", "mongodb://localhost:27018/?replicaSet=rs0"
    )
    monkeypatch.setattr(module, "AsyncMongoClient", lambda *args, **kwargs: Client())
    monkeypatch.setattr(module, "initialize_database", AsyncMock())
    monkeypatch.setattr(
        module,
        "provision",
        AsyncMock(
            side_effect=AssertionError("Existing station password must be preserved")
        ),
    )
    monkeypatch.setattr(
        module.subprocess, "run", lambda *args, **kwargs: SimpleNamespace(returncode=0)
    )
    monkeypatch.setattr(module.subprocess, "check_output", lambda *args, **kwargs: b"")
    monkeypatch.setattr(Path, "mkdir", lambda *args, **kwargs: None)
    monkeypatch.setattr(module.os, "chmod", lambda *args, **kwargs: None)
    readme = Path(module.__file__).resolve().parents[3] / "local-demo" / "README.md"
    assert await module.provision_demo(readme) == (0, 10)
