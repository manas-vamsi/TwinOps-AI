from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from twinops.core.config import get_settings
from twinops.main import create_app


@pytest.fixture
def auth_on(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("TWINOPS_AUTH_ENABLED", "true")
    monkeypatch.setenv("TWINOPS_DEMO_USER", "demo")
    monkeypatch.setenv("TWINOPS_DEMO_PASSWORD", "s3cret")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_auth_off_by_default_everything_open() -> None:
    get_settings.cache_clear()
    client = TestClient(create_app())
    assert client.get("/api/v1/auth/me").json() == {"auth_enabled": False, "user": "anonymous"}
    assert client.post("/api/v1/simulation/reset").status_code == 200


def test_protected_endpoints_reject_without_session(auth_on: None) -> None:
    client = TestClient(create_app())
    assert client.post("/api/v1/simulation/reset").status_code == 401
    assert client.post("/api/v1/chat", json={"message": "hi"}).status_code == 401
    # read-only stays open for viewers
    assert client.get("/api/v1/twin/graph").status_code == 200


def test_login_flow_sets_cookie_and_unlocks(auth_on: None) -> None:
    client = TestClient(create_app())

    bad = client.post("/api/v1/auth/login", json={"username": "demo", "password": "wrong"})
    assert bad.status_code == 401

    ok = client.post("/api/v1/auth/login", json={"username": "demo", "password": "s3cret"})
    assert ok.status_code == 200
    assert ok.json()["user"] == "demo"

    # cookie now carried by the client — protected endpoints unlock
    assert client.get("/api/v1/auth/me").json()["user"] == "demo"
    assert client.post("/api/v1/simulation/reset").status_code == 200

    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/auth/me").json()["user"] is None
    assert client.post("/api/v1/simulation/reset").status_code == 401


def test_ws_requires_session_when_auth_on(auth_on: None) -> None:
    client = TestClient(create_app())

    # without a session the socket is closed at connect (policy violation 1008)
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect) as exc, client.websocket_connect("/ws") as ws:
        ws.receive_json()
    assert exc.value.code == 1008

    # after login the same client's cookie authenticates the WS handshake
    client.post("/api/v1/auth/login", json={"username": "demo", "password": "s3cret"})
    with client.websocket_connect("/ws") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "snapshot"
