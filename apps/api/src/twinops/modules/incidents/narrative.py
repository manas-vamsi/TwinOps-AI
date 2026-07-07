"""On-demand natural-language incident explanation.

Grounds the LLM strictly in the deterministic evidence, caches per incident
(one call), and falls back to the deterministic summary if no provider is
configured or the call fails. Never runs per-tick — only when a client asks.
"""

from typing import Literal

import structlog
from pydantic import BaseModel

from twinops.modules.eval.grounding import grounding_score
from twinops.modules.incidents.schemas import Incident
from twinops.modules.llm import gateway

log = structlog.get_logger()

_SYSTEM = (
    "You are an SRE incident assistant. In 2-3 sentences, explain what happened "
    "and what the on-call engineer should do. Ground yourself strictly in the "
    "evidence provided; do not invent metrics, causes, or services."
)


class Narrative(BaseModel):
    text: str
    source: Literal["llm", "deterministic"]
    provider: str | None


# cache only successful LLM narratives; the deterministic fallback is cheap to redo
_cache: dict[str, Narrative] = {}


def incident_narrative(inc: Incident) -> Narrative:
    if inc.id in _cache:
        return _cache[inc.id]

    rc = inc.root_cause
    if rc is None:
        return Narrative(
            text="Investigating — root cause not yet identified.",
            source="deterministic",
            provider=None,
        )

    deterministic = f"{rc.summary} Recommended: {'; '.join(rc.recommended_actions)}."

    prompt = (
        f"Incident: {inc.title} (severity {inc.severity}).\n"
        f"Inferred root cause: {rc.label} at {rc.confidence}% confidence.\n"
        f"Evidence: {'; '.join(rc.evidence)}.\n"
        f"Affected services: {', '.join(inc.affected_node_ids)}.\n"
        f"Recommended actions: {'; '.join(rc.recommended_actions)}.\n"
        f"Estimated recovery: {rc.estimated_recovery}."
    )
    llm = gateway.complete(prompt, system=_SYSTEM)
    if llm:
        # self-checking guardrail: never surface an LLM answer that invents a
        # component outside this incident. Loose phrasing is fine; hallucinated
        # services are not — if found, discard the LLM output for deterministic.
        _, issues = grounding_score(llm, inc)
        hallucinations = [i for i in issues if i.startswith("mentions unrelated component")]
        if not hallucinations:
            result = Narrative(text=llm, source="llm", provider=gateway.active_provider())
            _cache[inc.id] = result
            return result
        log.warning("narrative_ungrounded_rejected", incident=inc.id, issues=hallucinations)

    return Narrative(text=deterministic, source="deterministic", provider=None)
