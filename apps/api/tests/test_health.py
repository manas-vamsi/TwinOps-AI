from fastapi.testclient import TestClient

from twinops.main import create_app


def test_healthz_reports_ok_with_version_and_request_id() -> None:
    client = TestClient(create_app())

    res = client.get("/healthz")

    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["version"]
    assert res.headers["X-Request-ID"]


def test_readyz_reports_ready() -> None:
    # readyz is ready only if the twin advanced recently; the ticker task does
    # not run under TestClient, so establish the precondition explicitly
    from twinops.modules.twin.service import twin_service

    twin_service.advance()
    client = TestClient(create_app())

    res = client.get("/readyz")

    assert res.status_code == 200
    assert res.json()["status"] == "ready"


def test_request_id_is_propagated_when_caller_supplies_one() -> None:
    client = TestClient(create_app())

    res = client.get("/healthz", headers={"X-Request-ID": "trace-abc-123"})

    assert res.headers["X-Request-ID"] == "trace-abc-123"
