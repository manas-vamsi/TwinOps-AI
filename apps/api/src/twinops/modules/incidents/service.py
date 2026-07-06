"""Incident lifecycle. Watches twin health each tick and opens one incident
when services start failing, keeps its root-cause analysis fresh, and resolves
it when everything recovers. Deterministic, driven by the simulation."""

from twinops.modules.incidents.rca import infer_root_cause, severity_of
from twinops.modules.incidents.schemas import Incident
from twinops.modules.twin.schemas import NodeHealth


class IncidentService:
    def __init__(self) -> None:
        self.incidents: dict[str, Incident] = {}
        self.open_id: str | None = None

    def evaluate(self, health: dict[str, NodeHealth], tick: int) -> None:
        affected = sorted(i for i, h in health.items() if h.status in ("degraded", "critical"))

        if not affected:
            if self.open_id:  # everything recovered — resolve
                inc = self.incidents[self.open_id]
                inc.status = "resolved"
                inc.resolved_tick = tick
                self.open_id = None
            return

        rca = infer_root_cause(health)
        severity = severity_of(health, set(affected))

        if self.open_id is None:  # new incident
            inc_id = f"inc-{tick}-{rca.node_id if rca else 'unknown'}"
            self.incidents[inc_id] = Incident(
                id=inc_id,
                title=f"{rca.label} failure" if rca else "Service degradation",
                status="identified" if rca else "detected",
                severity=severity,
                started_tick=tick,
                resolved_tick=None,
                affected_node_ids=affected,
                root_cause=rca,
            )
            self.open_id = inc_id
        else:  # keep the open incident's analysis current
            inc = self.incidents[self.open_id]
            inc.affected_node_ids = affected
            inc.severity = severity
            inc.root_cause = rca
            if rca and inc.status == "detected":
                inc.status = "identified"

    def open_incidents(self) -> list[Incident]:
        return [self.incidents[self.open_id]] if self.open_id else []

    def all(self) -> list[Incident]:
        return sorted(self.incidents.values(), key=lambda i: i.started_tick, reverse=True)


incident_service = IncidentService()
