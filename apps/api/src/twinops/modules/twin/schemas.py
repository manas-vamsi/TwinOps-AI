from typing import Literal

from pydantic import BaseModel

NodeKind = Literal["load-balancer", "gateway", "service", "database", "queue", "cache", "cloud"]
HealthStatus = Literal["healthy", "degraded", "critical"]


class TwinNode(BaseModel):
    id: str
    kind: NodeKind
    label: str
    tier: int


class TwinEdge(BaseModel):
    source: str  # dependent
    target: str  # dependency


class Metrics(BaseModel):
    cpu: float
    memory: float
    latency_p95: int
    error_rate: float


class NodeHealth(BaseModel):
    id: str
    score: float
    status: HealthStatus
    metrics: Metrics


class GraphSnapshot(BaseModel):
    """Full state a client needs to render the twin (REST snapshot, §4 pattern)."""

    topology_hash: str
    tick: int
    active_scenario_id: str | None
    nodes: list[TwinNode]
    edges: list[TwinEdge]
    health: list[NodeHealth]


class Scenario(BaseModel):
    id: str
    label: str
    origin: str
    blurb: str
