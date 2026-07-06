"""Incident replay: reconstruct the exact cascade from the deterministic engine.

Because the simulation is seeded, we can re-run the failure over the incident's
window and get the same frame sequence — no per-tick history needs storing.
"""

from pydantic import BaseModel

from twinops.modules.incidents.schemas import Incident
from twinops.modules.simulation.engine import FailureState, simulate_tick
from twinops.modules.twin.schemas import NodeHealth

MAX_FRAMES = 30


class ReplayFrame(BaseModel):
    tick: int
    health: list[NodeHealth]


class ReplayResponse(BaseModel):
    incident_id: str
    origin: str
    frames: list[ReplayFrame]


def build_replay(inc: Incident) -> ReplayResponse | None:
    if inc.root_cause is None:
        return None
    origin = inc.root_cause.node_id
    start = inc.started_tick
    end = inc.resolved_tick if inc.resolved_tick is not None else start + 15
    last = min(end, start + MAX_FRAMES - 1)

    frames: list[ReplayFrame] = []
    prev: dict[str, NodeHealth] | None = None
    for tick in range(start, last + 1):
        health = simulate_tick(tick, FailureState(origin=origin, age=tick - start), prev)
        prev = health
        frames.append(ReplayFrame(tick=tick, health=list(health.values())))

    return ReplayResponse(incident_id=inc.id, origin=origin, frames=frames)
