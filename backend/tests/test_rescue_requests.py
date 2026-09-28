from copy import deepcopy
from datetime import datetime
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pymongo.errors import PyMongoError

from app.api.routes.rescue_requests import get_rescue_request_service, router
from app.models.rescue_request import RequestStatus, RequestStatusHistory, RescueRequest
from app.schemas.common import (
    ServiceError,
    service_error_handler,
    validation_exception_handler,
)
from app.services.rescue_requests import RescueRequestService


class InMemoryRequestRepository:
    def __init__(self) -> None:
        self.requests: dict[str, RescueRequest] = {}
        self.fail = False

    async def create(
        self, request: RescueRequest, session: Any = None
    ) -> RescueRequest:
        if self.fail:
            raise PyMongoError("simulated unavailable database")
        self.requests[request.id] = request
        return request

    async def get_by_id(
        self,
        request_id: str,
        session: Any = None,
    ) -> RescueRequest | None:
        if self.fail:
            raise PyMongoError("simulated unavailable database")
        return self.requests.get(request_id)

    async def list_visible(
        self,
        *,
        citizen_id: str | None,
        status: RequestStatus | None,
        limit: int,
        cursor: str | None,
    ) -> tuple[list[RescueRequest], str | None, int]:
        if self.fail:
            raise PyMongoError("simulated unavailable database")
        if cursor == "invalid":
            raise ValueError("invalid cursor")
        records = [
            request
            for request in self.requests.values()
            if (citizen_id is None or request.citizen_id == citizen_id)
            and (status is None or request.status == status)
        ]
        records.sort(key=lambda request: (request.created_at, request.id), reverse=True)
        return records[:limit], None, len(records)

    async def cancel_pending_if_current(
        self,
        *,
        request_id: str,
        expected_version: int,
        reason: str,
        cancelled_at: datetime,
        session: Any = None,
    ) -> RescueRequest | None:
        if self.fail:
            raise PyMongoError("simulated unavailable database")
        request = self.requests.get(request_id)
        if (
            request is None
            or request.status != "pending"
            or request.version != expected_version
            or request.mission_id is not None
        ):
            return None
        updated = request.model_copy(
            update={
                "status": "cancelled",
                "version": request.version + 1,
                "cancellation_reason": reason,
                "cancelled_at": cancelled_at,
                "updated_at": cancelled_at,
                "status_history": [
                    *request.status_history,
                    RequestStatusHistory(
                        status="cancelled",
                        occurred_at=cancelled_at,
                        note=reason,
                    ),
                ],
            }
        )
        self.requests[request_id] = RescueRequest.model_validate(updated)
        return self.requests[request_id]


class InMemoryAssignmentVisibility:
    def __init__(self) -> None:
        self.visible: set[tuple[str, str]] = set()

    async def rescuer_has_request(self, rescuer_id: str, request_id: str) -> bool:
        return (rescuer_id, request_id) in self.visible


@pytest.fixture()
def stores() -> tuple[InMemoryRequestRepository, InMemoryAssignmentVisibility]:
    return InMemoryRequestRepository(), InMemoryAssignmentVisibility()


@pytest.fixture()
def client(
    stores: tuple[InMemoryRequestRepository, InMemoryAssignmentVisibility],
) -> TestClient:
    request_store, assignment_store = stores
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.add_exception_handler(ServiceError, service_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    def service_override() -> RescueRequestService:
        return RescueRequestService(request_store, assignment_store)  # type: ignore[arg-type]

    app.dependency_overrides[get_rescue_request_service] = service_override
    return TestClient(app)


def headers(user_id: str = "citizen-demo", role: str = "citizen") -> dict[str, str]:
    return {"X-Demo-User-Id": user_id, "X-Demo-Role": role}


def valid_payload() -> dict[str, Any]:
    return {
        "location": {
            "address": "  <b>Sanitized demonstration address</b>  ",
            "point": {"type": "Point", "coordinates": [120.9946, 14.6042]},
            "landmark": " Demo landmark ",
        },
        "headcount": 4,
        "vulnerabilities": ["infant", "senior"],
        "medical_needs": True,
        "medical_details": "<script>demo only</script>",
        "reported_flood_level": "high",
        "situation_summary": "Controlled rescue demonstration",
    }


def create_request(
    client: TestClient, actor_headers: dict[str, str] | None = None
) -> dict[str, Any]:
    response = client.post(
        "/api/v1/rescue-requests",
        json=valid_payload(),
        headers=actor_headers or headers(),
    )
    assert response.status_code == 201
    return response.json()


def test_citizen_create_list_get_and_sanitization(
    client: TestClient,
    stores: tuple[InMemoryRequestRepository, InMemoryAssignmentVisibility],
) -> None:
    created = create_request(client)

    assert created["status"] == "pending"
    assert created["version"] == 1
    assert (
        created["location"]["address"]
        == "&lt;b&gt;Sanitized demonstration address&lt;/b&gt;"
    )
    assert created["medical_details"] == "&lt;script&gt;demo only&lt;/script&gt;"
    assert created["created_at"].endswith("Z")
    assert created["submitted_at"] == created["created_at"]

    own_list = client.get("/api/v1/rescue-requests", headers=headers())
    assert own_list.status_code == 200
    assert [item["id"] for item in own_list.json()["items"]] == [created["id"]]
    assert own_list.json()["cursor"] is None
    assert own_list.json()["next_cursor"] is None

    other_list = client.get(
        "/api/v1/rescue-requests",
        headers=headers("citizen-other"),
    )
    assert other_list.status_code == 200
    assert other_list.json()["items"] == []

    coordinator_list = client.get(
        "/api/v1/rescue-requests?status=pending",
        headers=headers("coordinator-demo", "coordinator"),
    )
    assert coordinator_list.status_code == 200
    assert coordinator_list.json()["total"] == 1

    own_get = client.get(
        f"/api/v1/rescue-requests/{created['id']}",
        headers=headers(),
    )
    assert own_get.status_code == 200

    hidden_get = client.get(
        f"/api/v1/rescue-requests/{created['id']}",
        headers=headers("citizen-other"),
    )
    assert hidden_get.status_code == 404

    _, assignment_store = stores
    assignment_store.visible.add(("team-alpha", created["id"]))
    rescuer_get = client.get(
        f"/api/v1/rescue-requests/{created['id']}",
        headers=headers("team-alpha", "rescuer"),
    )
    assert rescuer_get.status_code == 200


def test_outside_boundary_and_malformed_inputs_store_nothing(
    client: TestClient,
    stores: tuple[InMemoryRequestRepository, InMemoryAssignmentVisibility],
) -> None:
    request_store, _ = stores
    outside = valid_payload()
    outside["location"]["point"]["coordinates"] = [121.1, 14.7]

    outside_response = client.post(
        "/api/v1/rescue-requests",
        json=outside,
        headers=headers(),
    )
    invalid_headcount = valid_payload()
    invalid_headcount["headcount"] = 0
    headcount_response = client.post(
        "/api/v1/rescue-requests",
        json=invalid_headcount,
        headers=headers(),
    )

    assert outside_response.status_code == 422
    assert outside_response.json()["error"]["code"] == "validation_error"
    assert "ubelt-pilot-v1" in str(outside_response.json()["error"]["details"])
    assert headcount_response.status_code == 422
    assert request_store.requests == {}


def test_role_headers_and_list_filters_use_common_error_envelope(
    client: TestClient,
) -> None:
    no_headers = client.get("/api/v1/rescue-requests")
    volunteer = client.post(
        "/api/v1/rescue-requests",
        json=valid_payload(),
        headers=headers("volunteer-demo", "volunteer"),
    )
    bad_status = client.get(
        "/api/v1/rescue-requests?status=flying",
        headers=headers(),
    )
    bad_cursor = client.get(
        "/api/v1/rescue-requests?cursor=invalid",
        headers=headers(),
    )

    assert no_headers.status_code == 403
    assert no_headers.json()["error"]["code"] == "demo_identity_required"
    assert volunteer.status_code == 403
    assert volunteer.json()["error"]["code"] == "forbidden"
    assert bad_status.status_code == 422
    assert bad_status.json()["error"]["code"] == "invalid_status_filter"
    assert bad_cursor.status_code == 422
    assert bad_cursor.json()["error"]["code"] == "invalid_cursor"


def test_pending_request_cancellation_enforces_owner_state_and_version(
    client: TestClient,
    stores: tuple[InMemoryRequestRepository, InMemoryAssignmentVisibility],
) -> None:
    created = create_request(client)
    request_store, _ = stores
    before = deepcopy(request_store.requests[created["id"]])

    stale = client.post(
        f"/api/v1/rescue-requests/{created['id']}/cancel",
        json={"reason": "Duplicate demo request", "version": 99},
        headers=headers(),
    )
    non_owner = client.post(
        f"/api/v1/rescue-requests/{created['id']}/cancel",
        json={"reason": "Not my request", "version": 1},
        headers=headers("citizen-other"),
    )

    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "stale_request_version"
    assert non_owner.status_code == 404
    assert request_store.requests[created["id"]] == before

    cancelled = client.post(
        f"/api/v1/rescue-requests/{created['id']}/cancel",
        json={"reason": " <b>Duplicate demo request</b> ", "version": 1},
        headers=headers(),
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert cancelled.json()["version"] == 2
    assert cancelled.json()["status_history"][-1]["note"] == (
        "&lt;b&gt;Duplicate demo request&lt;/b&gt;"
    )

    repeated = client.post(
        f"/api/v1/rescue-requests/{created['id']}/cancel",
        json={"reason": "Again", "version": 2},
        headers=headers(),
    )
    assert repeated.status_code == 409
    assert repeated.json()["error"]["code"] == "request_not_pending"


def test_openapi_documents_request_operations_and_response_codes(
    client: TestClient,
) -> None:
    schema = client.get("/openapi.json").json()
    create = schema["paths"]["/api/v1/rescue-requests"]["post"]
    assignment_path = "/api/v1/rescue-requests/{request_id}/cancel"

    assert "201" in create["responses"]
    assert "403" in create["responses"]
    assert "422" in create["responses"]
    assert assignment_path in schema["paths"]


def test_database_failure_returns_contracted_503_envelope(
    client: TestClient,
    stores: tuple[InMemoryRequestRepository, InMemoryAssignmentVisibility],
) -> None:
    request_store, _ = stores
    request_store.fail = True

    response = client.get("/api/v1/rescue-requests", headers=headers())

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "database_unavailable"
    assert response.json()["error"]["request_id"].startswith("trace-")
