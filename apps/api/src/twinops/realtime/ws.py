from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from twinops.core.config import get_settings
from twinops.modules.auth.service import COOKIE_NAME, session_user
from twinops.modules.incidents.service import incident_service
from twinops.modules.twin.service import twin_service
from twinops.realtime.manager import manager

router = APIRouter()


@router.websocket("/ws")
async def ws(websocket: WebSocket) -> None:
    """Snapshot on connect, then the ticker pushes health deltas (§9).
    When the auth flag is on, the session cookie is validated at upgrade
    (browsers send cookies on same-site WS handshakes automatically)."""
    if get_settings().auth_enabled:
        user = session_user(websocket.cookies.get(COOKIE_NAME))
        if user is None:
            await websocket.close(code=1008, reason="authentication required")
            return

    await manager.connect(websocket)
    await websocket.send_json(
        {
            "topic": "twin.health",
            "seq": manager.seq,
            "type": "snapshot",
            "payload": {
                **twin_service.snapshot().model_dump(),
                "incidents": [i.model_dump() for i in incident_service.open_incidents()],
                "predictions": [p.model_dump() for p in twin_service.predictions()],
            },
        }
    )
    try:
        while True:
            await websocket.receive_text()  # keepalive; client sends nothing yet
    except WebSocketDisconnect:
        manager.disconnect(websocket)
