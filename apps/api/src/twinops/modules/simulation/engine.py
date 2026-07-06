"""Deterministic simulation engine (server-authoritative).

Healthy baselines with noise, plus a failure that originates on one node and
cascades to its DEPENDENTS via BFS over the dependency edges, with attenuation
and per-hop delay. Given the same seed + tick + failure it is reproducible, so
demos, replay, and tests are stable (ARCHITECTURE §5).
"""

import random
from dataclasses import dataclass

from twinops.modules.twin.schemas import Metrics, NodeHealth
from twinops.modules.twin.topology import DEPENDENTS, NODES

SEED = 42


@dataclass
class FailureState:
    origin: str
    age: int  # ticks since injection


def _status(score: float) -> str:
    if score >= 75:
        return "healthy"
    if score >= 40:
        return "degraded"
    return "critical"


def compute_impact(failure: FailureState | None) -> dict[str, float]:
    """node id -> impact 0..1 (0 = healthy). BFS from origin over dependents."""
    if failure is None:
        return {}

    origin_impact = min(1.0, 0.35 + failure.age * 0.12)
    impact: dict[str, float] = {failure.origin: origin_impact}

    frontier = [failure.origin]
    seen = {failure.origin}
    depth = 0
    while frontier and depth < 6:
        nxt: list[str] = []
        for node_id in frontier:
            for dep in DEPENDENTS.get(node_id, []):
                if dep in seen:
                    continue
                seen.add(dep)
                lag = depth + 1
                if failure.age < lag:
                    continue  # wave hasn't reached this hop yet
                attenuation = 0.62 ** (depth + 1)
                reached = min(1.0, (failure.age - lag) * 0.18)
                impact[dep] = origin_impact * attenuation * reached
                nxt.append(dep)
        frontier = nxt
        depth += 1
    return impact


def simulate_tick(
    tick: int,
    failure: FailureState | None,
    prev: dict[str, NodeHealth] | None,
) -> dict[str, NodeHealth]:
    """Advance every node one tick. prev enables hysteresis on the score."""
    impact = compute_impact(failure)
    out: dict[str, NodeHealth] = {}

    for node in NODES:
        rng = random.Random(f"{SEED}:{node.id}:{tick}")
        imp = impact.get(node.id, 0.0)

        cpu = min(100.0, (18 + rng.random() * 22) + imp * 65)
        memory = min(100.0, (30 + rng.random() * 25) + imp * 45)
        latency = round((40 + rng.random() * 60) * (1 + imp * 9))
        error_rate = round((rng.random() * 0.6) + imp * imp * 55, 1)

        raw = 100 - imp * 95 - (8 if cpu > 85 else 0)
        prev_score = prev[node.id].score if prev and node.id in prev else 100.0
        score = max(0.0, min(100.0, prev_score + (raw - prev_score) * 0.5))

        out[node.id] = NodeHealth(
            id=node.id,
            score=score,
            status=_status(score),  # type: ignore[arg-type]
            metrics=Metrics(
                cpu=round(cpu, 1),
                memory=round(memory, 1),
                latency_p95=latency,
                error_rate=error_rate,
            ),
        )
    return out
