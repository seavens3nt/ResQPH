"""Current scope rejects the retired role and publishes no hazard endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


def test_openapi_excludes_retired_hazard_endpoints():
    assert not any("hazard-reports" in path for path in app.openapi()["paths"])


@pytest.mark.parametrize("role", ["citizen", "rescuer", "coordinator", "volunteer"])
def test_retired_hazard_routes_are_unavailable_without_database_access(role):
    client = TestClient(app)
    headers = {"X-Demo-User-Id": "synthetic@example.test", "X-Demo-Role": role}
    assert client.get("/api/v1/hazard-reports", headers=headers).status_code == 404
    assert client.post("/api/v1/hazard-reports", headers=headers, json={}).status_code == 404
    for operation in ["verify", "reject"]:
        assert client.post(
            f"/api/v1/hazard-reports/archived/{operation}", headers=headers, json={}
        ).status_code == 404
