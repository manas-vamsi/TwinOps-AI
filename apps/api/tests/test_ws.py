from fastapi.testclient import TestClient

from twinops.main import create_app


def test_ws_sends_snapshot_on_connect() -> None:
    client = TestClient(create_app())
    with client.websocket_connect("/ws") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "snapshot"
        assert msg["topic"] == "twin.health"
        assert "seq" in msg
        assert msg["payload"]["nodes"]
        assert msg["payload"]["health"]
