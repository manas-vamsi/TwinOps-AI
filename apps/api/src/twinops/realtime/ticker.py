"""Background ticker: advances the twin and broadcasts a health delta each tick.
The single supervised task (ARCHITECTURE §3); cancelled on shutdown by lifespan."""

import asyncio

import structlog

from twinops.modules.incidents.service import incident_service
from twinops.modules.twin.service import twin_service
from twinops.realtime.manager import manager

log = structlog.get_logger()

TICK_SECONDS = 1.5


async def run_ticker() -> None:
    log.info("ticker_started", interval_s=TICK_SECONDS)
    while True:
        await asyncio.sleep(TICK_SECONDS)
        twin_service.advance()
        incident_service.evaluate(twin_service.health, twin_service.tick)
        await manager.broadcast(
            {
                "topic": "twin.health",
                "type": "delta",
                "payload": {
                    "tick": twin_service.tick,
                    "active_scenario_id": twin_service.active_scenario_id,
                    "health": [h.model_dump() for h in twin_service.health.values()],
                    "incidents": [i.model_dump() for i in incident_service.open_incidents()],
                    "predictions": [p.model_dump() for p in twin_service.predictions()],
                },
            }
        )
