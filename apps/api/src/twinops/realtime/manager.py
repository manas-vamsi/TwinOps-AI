"""Minimal in-process WebSocket fan-out (BUS_MODE=inproc).

Holds connected clients and broadcasts sequenced messages. seq lets clients
detect gaps and re-snapshot (ARCHITECTURE §9). No Redis until multi-instance.
"""

import structlog
from fastapi import WebSocket

log = structlog.get_logger()


class ConnectionManager:
    def __init__(self) -> None:
        self._conns: set[WebSocket] = set()
        self.seq = 0

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._conns.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._conns.discard(ws)

    async def broadcast(self, message: dict[str, object]) -> None:
        self.seq += 1
        payload = {**message, "seq": self.seq}
        dead: list[WebSocket] = []
        for ws in self._conns:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)  # slow/closed consumer — drop, never block others
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
