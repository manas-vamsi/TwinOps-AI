from fastapi.testclient import TestClient

from twinops.main import create_app


def test_http_error_is_rfc7807_shaped_with_trace_id() -> None:
    client = TestClient(create_app())
    res = client.get("/api/v1/incidents/does-not-exist", headers={"X-Request-ID": "trace-xyz"})

    assert res.status_code == 404
    body = res.json()
    assert body["code"] == "http_404"
    assert body["message"]
    assert body["trace_id"] == "trace-xyz"  # traceable to the logs
    assert res.headers["X-Request-ID"] == "trace-xyz"


def test_readyz_reports_ticker_health() -> None:
    client = TestClient(create_app())
    body = client.get("/readyz").json()

    assert body["status"] in ("ready", "degraded")
    ticker = body["components"]["ticker"]
    assert "tick" in ticker
    assert "healthy" in ticker
    assert "last_advance_s_ago" in ticker
