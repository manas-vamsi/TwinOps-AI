from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from twinops.modules.incidents.service import incident_service
from twinops.modules.twin.service import twin_service
from twinops.realtime.manager import manager

router = APIRouter()


@router.websocket("/ws")
async def ws(websocket: WebSocket) -> None:
    """Snapshot on connect, then the ticker pushes health deltas (§9)."""
    await manager.connect(websocket)
    await websocket.send_json(
        {
            "topic": "twin.health",
            "seq": manager.seq,
            "type": "snapshot",
            "payload": {
                **twin_service.snapshot().model_dump(),
                "incidents": [i.model_dump() for i in incident_service.open_incidents()],
            },
        }
    )
    try:
        while True:
            await websocket.receive_text()  # keepalive; client sends nothing yet
    except WebSocketDisconnect:
        manager.disconnect(websocket)
