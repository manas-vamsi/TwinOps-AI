"""Deterministic AI evals (CI-enforced). The LLM-quality evals are live-only
(twinops.modules.eval.run); these assert the AI's *core, deterministic* claim:
root-cause inference is correct across every scenario, and the grounding scorer
behaves."""

import pytest

from twinops.modules.eval.grounding import grounding_score
from twinops.modules.incidents.rca import infer_root_cause
from twinops.modules.incidents.schemas import Incident, RootCause
from twinops.modules.simulation.engine import FailureState, simulate_tick
from twinops.modules.twin.topology import SCENARIOS


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.id)
def test_rca_golden_truth_infers_the_true_origin(scenario) -> None:  # type: ignore[no-untyped-def]
    """For every scenario, the inferred root cause must be the injected origin."""
    health = simulate_tick(12, FailureState(origin=scenario.origin, age=12), None)
    rca = infer_root_cause(health)
    assert rca is not None, f"{scenario.id}: expected a root cause"
    assert rca.node_id == scenario.origin, f"{scenario.id}: inferred {rca.node_id}"


def _incident(root_label: str, root_id: str, affected: list[str]) -> Incident:
    return Incident(
        id="t",
        title="t",
        status="identified",
        severity="high",
        started_tick=1,
        resolved_tick=None,
        affected_node_ids=affected,
        root_cause=RootCause(
            node_id=root_id,
            label=root_label,
            confidence=90,
            summary="",
            evidence=[],
            recommended_actions=[],
            estimated_recovery="~5m",
            runbook_id=None,
        ),
    )


def test_grounding_perfect_when_names_cause_only() -> None:
    inc = _incident("Orders Postgres", "db-orders-pg", ["db-orders-pg", "svc-orders"])
    score, issues = grounding_score(
        "Orders Postgres saturated its pool; Orders Service degraded.", inc
    )
    assert score == 1.0
    assert issues == []


def test_grounding_flags_missing_root_cause() -> None:
    inc = _incident("Orders Postgres", "db-orders-pg", ["db-orders-pg"])
    score, issues = grounding_score("Something went wrong somewhere.", inc)
    assert score < 1.0
    assert any("root cause" in i for i in issues)


def test_grounding_flags_hallucinated_component() -> None:
    inc = _incident("Orders Postgres", "db-orders-pg", ["db-orders-pg"])
    # "Payment Service" is a real node but NOT part of this incident
    score, issues = grounding_score(
        "Orders Postgres failed, and Payment Service is also to blame.", inc
    )
    assert score < 1.0
    assert any("Payment Service".lower() in i for i in issues)
