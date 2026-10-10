from fastapi.testclient import TestClient

from app.main import app

LOCAL_ORIGIN = "http://localhost:5173"


def test_registration_preflight_accepts_local_origin_and_credentials() -> None:
    response = TestClient(app).options(
        "/api/v1/auth/register",
        headers={
            "Origin": LOCAL_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.text == "OK"
    assert response.headers["access-control-allow-origin"] == LOCAL_ORIGIN
    assert response.headers["access-control-allow-credentials"] == "true"
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "content-type" in response.headers["access-control-allow-headers"].lower()


def test_request_preflight_accepts_csrf_and_idempotency_headers() -> None:
    response = TestClient(app).options(
        "/api/v1/rescue-requests?limit=20",
        headers={
            "Origin": LOCAL_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-csrf-token,idempotency-key",
        },
    )

    assert response.status_code == 200
    assert response.text == "OK"


def test_request_list_preflight_accepts_get_and_request_id() -> None:
    response = TestClient(app).options(
        "/api/v1/rescue-requests?limit=20",
        headers={
            "Origin": LOCAL_ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "x-request-id",
        },
    )

    assert response.status_code == 200
    assert response.text == "OK"


def test_loopback_ip_port_mismatch_is_not_an_allowed_origin() -> None:
    response = TestClient(app).options(
        "/api/v1/auth/register",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 400
    assert response.text == "Disallowed CORS origin"
    assert "access-control-allow-origin" not in response.headers


def test_disallowed_method_and_header_remain_rejected() -> None:
    client = TestClient(app)
    method_response = client.options(
        "/api/v1/auth/register",
        headers={
            "Origin": LOCAL_ORIGIN,
            "Access-Control-Request-Method": "DELETE",
        },
    )
    header_response = client.options(
        "/api/v1/auth/register",
        headers={
            "Origin": LOCAL_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert method_response.status_code == 400
    assert method_response.text == "Disallowed CORS method"
    assert header_response.status_code == 400
    assert header_response.text == "Disallowed CORS headers"
