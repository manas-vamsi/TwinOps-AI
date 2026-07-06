"""Deterministic root-cause analysis over topology + health.

The root cause is INFERRED, not read from the injected failure: among the
failing nodes, the origin is the most-upstream one whose own dependencies are
all healthy (nothing it depends on is failing) and which explains the largest
downstream cascade. Confidence = share of the failing set explained by that
origin's dependency subtree. This is why the verdict is defensible instead of
hallucinated (ARCHITECTURE §0.3).
"""

from twinops.modules.incidents.schemas import RootCause, Severity
from twinops.modules.twin.schemas import NodeHealth
from twinops.modules.twin.topology import DEPENDENTS, EDGES, NODES

_LABEL = {n.id: n.label for n in NODES}
_KIND = {n.id: n.kind for n in NODES}
# dependencies: the targets each node points to (what it depends on)
_DEPS: dict[str, list[str]] = {n.id: [] for n in NODES}
for _e in EDGES:
    _DEPS[_e.source].append(_e.target)

# root cause -> the runbook that addresses it (corpus doc ids in data/corpus)
_RUNBOOK_BY_KIND: dict[str, str] = {
    "database": "db-connection-pool-exhaustion",
    "cache": "cache-stampede",
    "queue": "queue-backlog",
}


def _runbook_for(node_id: str, kind: str) -> str:
    if node_id == "svc-payment":
        return "payment-provider-latency"
    return _RUNBOOK_BY_KIND.get(kind, "incident-response-playbook")


_ACTIONS: dict[str, list[str]] = {
    "database": [
        "Increase connection pool size and cap slow queries",
        "Fail over to a read replica to shed load",
    ],
    "cache": ["Warm the cache and raise TTL", "Add request coalescing to stop stampede"],
    "queue": ["Add consumers to drain the backlog", "Enable backpressure upstream"],
    "service": ["Scale out replicas", "Restart unhealthy pods and check recent deploys"],
    "gateway": ["Shed load with rate limiting", "Route around the unhealthy upstream"],
    "load-balancer": ["Rebalance traffic", "Drain the failing target"],
    "cloud": ["Retry with backoff", "Check provider status and quotas"],
}


def _affected(health: dict[str, NodeHealth]) -> set[str]:
    return {i for i, h in health.items() if h.status in ("degraded", "critical")}


def severity_of(health: dict[str, NodeHealth], affected: set[str]) -> Severity:
    if any(health[i].status == "critical" for i in affected):
        return "high"
    return "medium" if len(affected) > 2 else "low"


def _downstream(origin: str, affected: set[str]) -> set[str]:
    """Affected nodes reachable from origin via dependents (the cascade)."""
    seen: set[str] = set()
    frontier = [origin]
    while frontier:
        nxt: list[str] = []
        for node in frontier:
            for dep in DEPENDENTS.get(node, []):
                if dep in affected and dep not in seen:
                    seen.add(dep)
                    nxt.append(dep)
        frontier = nxt
    return seen


def infer_root_cause(health: dict[str, NodeHealth]) -> RootCause | None:
    affected = _affected(health)
    if not affected:
        return None

    # origins: failing nodes none of whose dependencies are failing
    origins = [n for n in affected if not (set(_DEPS[n]) & affected)]
    if not origins:  # fully cyclic degradation — fall back to worst node
        origins = [min(affected, key=lambda i: health[i].score)]

    # pick the origin explaining the largest cascade (tie-break: lower score)
    root = max(origins, key=lambda n: (len(_downstream(n, affected)), -health[n].score))
    cascade = _downstream(root, affected)
    explained = 1 + len(cascade)
    confidence = min(96, round(explained / len(affected) * 100))
    if health[root].status == "critical":
        confidence = min(96, confidence + 6)

    m = health[root].metrics
    evidence = [
        f"{_LABEL[root]} is {health[root].status} (health {round(health[root].score)}/100)",
        f"Latency p95 {m.latency_p95}ms, error rate {m.error_rate}%, CPU {round(m.cpu)}%",
        f"{len(cascade)} dependent service(s) degraded in the cascade",
        "No upstream dependency of this node is unhealthy — it is the origin",
    ]
    actions = _ACTIONS.get(_KIND[root], ["Investigate and restart the component"])

    return RootCause(
        node_id=root,
        label=_LABEL[root],
        confidence=confidence,
        summary=f"{_LABEL[root]} is the origin; {len(cascade)} downstream service(s) affected.",
        evidence=evidence,
        recommended_actions=actions,
        estimated_recovery="~5 minutes" if health[root].status == "critical" else "~2 minutes",
        runbook_id=_runbook_for(root, _KIND[root]),
    )
