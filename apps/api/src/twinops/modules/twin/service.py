"""Holds the live twin state and advances it. Single in-process owner
(BUS_MODE=inproc); the ticker calls advance(), the router/WS read snapshots."""

import hashlib

from twinops.modules.simulation.engine import FailureState, simulate_tick
from twinops.modules.twin.schemas import GraphSnapshot, NodeHealth
from twinops.modules.twin.topology import EDGES, NODES, SCENARIOS


def _topology_hash() -> str:
    ids = sorted(n.id for n in NODES) + sorted(f"{e.source}->{e.target}" for e in EDGES)
    return hashlib.sha256("|".join(ids).encode()).hexdigest()[:16]


class TwinService:
    def __init__(self) -> None:
        self.tick = 0
        self.failure: FailureState | None = None
        self.active_scenario_id: str | None = None
        self.health: dict[str, NodeHealth] = simulate_tick(0, None, None)
        self._hash = _topology_hash()

    def advance(self) -> None:
        if self.failure is not None:
            self.failure.age += 1
        self.tick += 1
        self.health = simulate_tick(self.tick, self.failure, self.health)

    def inject(self, scenario_id: str) -> bool:
        scenario = next((s for s in SCENARIOS if s.id == scenario_id), None)
        if scenario is None:
            return False
        self.active_scenario_id = scenario_id
        self.failure = FailureState(origin=scenario.origin, age=0)
        return True

    def reset(self) -> None:
        self.failure = None
        self.active_scenario_id = None
        self.health = simulate_tick(self.tick, None, self.health)

    def snapshot(self) -> GraphSnapshot:
        return GraphSnapshot(
            topology_hash=self._hash,
            tick=self.tick,
            active_scenario_id=self.active_scenario_id,
            nodes=NODES,
            edges=EDGES,
            health=list(self.health.values()),
        )


# module-level singleton — the app's one twin (started by lifespan ticker)
twin_service = TwinService()
