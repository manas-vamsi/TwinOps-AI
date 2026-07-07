"""Grounding scorer for LLM narratives. Cheap, deterministic checks that catch
the failure modes that matter for an ops copilot: not naming the real cause, or
inventing a component that isn't part of the incident (hallucination). Used by
the live eval and unit-tested on its own."""

from twinops.modules.incidents.schemas import Incident
from twinops.modules.twin.topology import NODES

_ALL_LABELS = {n.label.lower() for n in NODES}
_ID_TO_LABEL = {n.id: n.label for n in NODES}


def grounding_score(text: str, incident: Incident) -> tuple[float, list[str]]:
    """Return (score in 0..1, list of issues). 1.0 = names the root cause and
    mentions no component outside the incident."""
    issues: list[str] = []
    lowered = text.lower()

    rc = incident.root_cause
    if rc and rc.label.lower() not in lowered:
        issues.append("does not name the inferred root cause")

    # components the narrative is allowed to mention
    allowed: set[str] = set()
    if rc:
        allowed.add(rc.label.lower())
    for node_id in incident.affected_node_ids:
        label = _ID_TO_LABEL.get(node_id)
        if label:
            allowed.add(label.lower())

    # any known component mentioned that isn't part of this incident = hallucination risk
    for label in _ALL_LABELS:
        if label not in allowed and label in lowered:
            issues.append(f"mentions unrelated component: {label}")

    score = max(0.0, 1.0 - len(issues) * 0.34)
    return score, issues
