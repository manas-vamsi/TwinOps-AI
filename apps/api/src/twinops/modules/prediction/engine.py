"""Deterministic failure prediction: project each node's health-score trend
to the critical threshold via a least-squares slope over the recent window.
Honest heuristic (ARCHITECTURE §4.4) — no ML, no LLM. The seam is here for a
trained model later; the output shape stays the same.
"""

from pydantic import BaseModel

from twinops.modules.twin.topology import NODES

_LABEL = {n.id: n.label for n in NODES}

CRITICAL = 40.0  # score at/below which a node is "failing"
TICK_SECONDS = 1.5
HORIZON_SECONDS = 90.0  # don't forecast further out than this
MIN_SAMPLES = 4


class Prediction(BaseModel):
    node_id: str
    label: str
    eta_seconds: int
    confidence: int


def predict(history: dict[str, list[float]]) -> list[Prediction]:
    out: list[Prediction] = []
    for node_id, scores in history.items():
        if len(scores) < MIN_SAMPLES:
            continue
        current = scores[-1]
        if current <= CRITICAL:
            continue  # already failing — that's an incident, not a prediction

        # least-squares slope: score change per tick
        n = len(scores)
        xs = list(range(n))
        mean_x = sum(xs) / n
        mean_y = sum(scores) / n
        denom = sum((x - mean_x) ** 2 for x in xs) or 1.0
        slope = sum((xs[i] - mean_x) * (scores[i] - mean_y) for i in range(n)) / denom

        if slope >= -0.5:
            continue  # flat or improving — nothing to warn about

        eta_ticks = (current - CRITICAL) / (-slope)
        eta_seconds = eta_ticks * TICK_SECONDS
        if eta_seconds <= 0 or eta_seconds > HORIZON_SECONDS:
            continue

        confidence = min(95, int(45 + (-slope) * 7 + n * 2))
        out.append(
            Prediction(
                node_id=node_id,
                label=_LABEL.get(node_id, node_id),
                eta_seconds=int(eta_seconds),
                confidence=confidence,
            )
        )

    out.sort(key=lambda p: p.eta_seconds)
    return out
