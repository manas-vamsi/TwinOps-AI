from typing import Literal

from pydantic import BaseModel

IncidentStatus = Literal["detected", "investigating", "identified", "resolved"]
Severity = Literal["low", "medium", "high"]


class RootCause(BaseModel):
    """Deterministic root-cause verdict inferred from topology + health.
    Confidence is computed from evidence weights, never model vibes (§0.3)."""

    node_id: str
    label: str
    confidence: int  # 0-100
    summary: str
    evidence: list[str]
    recommended_actions: list[str]
    estimated_recovery: str
    runbook_id: str | None  # matching knowledge-base runbook


class Incident(BaseModel):
    id: str
    title: str
    status: IncidentStatus
    severity: Severity
    started_tick: int
    resolved_tick: int | None
    affected_node_ids: list[str]
    root_cause: RootCause | None
