from fastapi.testclient import TestClient

from twinops.main import create_app
from twinops.modules.incidents.rca import infer_root_cause
from twinops.modules.incidents.service import IncidentService
from twinops.modules.simulation.engine import FailureState, simulate_tick


def _health_with_failure(origin: str, age: int):
    return simulate_tick(age, FailureState(origin=origin, age=age), None)


def test_rca_infers_the_true_origin_not_the_cascade() -> None:
    # inject at db-orders-pg, let it cascade, RCA must name the DB as root cause
    health = _health_with_failure("db-orders-pg", age=10)
    rca = infer_root_cause(health)
    assert rca is not None
    assert rca.node_id == "db-orders-pg"
    assert rca.confidence >= 50
    assert rca.recommended_actions  # actions present
    assert rca.runbook_id == "db-connection-pool-exhaustion"  # cites the runbook


def test_rca_none_when_all_healthy() -> None:
    assert infer_root_cause(simulate_tick(0, None, None)) is None


def test_incident_opens_then_resolves() -> None:
    svc = IncidentService()
    svc.evaluate(_health_with_failure("svc-payment", age=8), tick=8)
    assert svc.open_id is not None
    opened = svc.incidents[svc.open_id]
    assert opened.status == "identified"
    assert opened.root_cause is not None

    svc.evaluate(simulate_tick(20, None, None), tick=20)  # recovered
    assert svc.open_id is None
    assert opened.status == "resolved"
    assert opened.resolved_tick == 20


def test_replay_reconstructs_the_cascade() -> None:
    from twinops.modules.incidents.replay import build_replay

    svc = IncidentService()
    svc.evaluate(_health_with_failure("db-orders-pg", age=6), tick=6)
    inc = svc.incidents[svc.open_id]  # type: ignore[index]
    replay = build_replay(inc)

    assert replay is not None
    assert replay.origin == "db-orders-pg"
    assert len(replay.frames) >= 2
    # origin degrades across the replay window
    first = next(h.score for h in replay.frames[0].health if h.id == "db-orders-pg")
    last = next(h.score for h in replay.frames[-1].health if h.id == "db-orders-pg")
    assert last < first


def test_narrative_falls_back_to_deterministic_without_a_provider(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    # no provider keys in the test env -> gateway returns None -> deterministic
    from twinops.modules.incidents.narrative import incident_narrative

    for var in ("GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY"):
        monkeypatch.delenv(var, raising=False)

    svc = IncidentService()
    svc.evaluate(_health_with_failure("svc-payment", age=8), tick=8)
    inc = svc.incidents[svc.open_id]  # type: ignore[index]
    n = incident_narrative(inc)

    assert n.source == "deterministic"
    assert n.provider is None
    assert len(n.text) > 0


def test_narrative_guardrail_rejects_a_hallucinated_llm_answer(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    """If the LLM invents a component outside the incident, the guardrail
    discards it and uses the deterministic answer — no hallucination surfaces."""
    from twinops.modules.incidents import narrative as narrative_mod

    svc = IncidentService()
    svc.evaluate(_health_with_failure("db-orders-pg", age=10), tick=10)
    inc = svc.incidents[svc.open_id]  # type: ignore[index]
    narrative_mod._cache.clear()

    # LLM names an unrelated component (Payment Service) not in this incident
    monkeypatch.setattr(
        narrative_mod.gateway,
        "complete",
        lambda *a, **k: "Orders Postgres failed, and Payment Service is also to blame.",
    )
    rejected = narrative_mod.incident_narrative(inc)
    assert rejected.source == "deterministic"  # guardrail kicked in

    # a clean, grounded answer is accepted
    narrative_mod._cache.clear()
    monkeypatch.setattr(
        narrative_mod.gateway,
        "complete",
        lambda *a, **k: "Orders Postgres saturated its connection pool.",
    )
    accepted = narrative_mod.incident_narrative(inc)
    assert accepted.source == "llm"


def test_incidents_endpoint() -> None:
    client = TestClient(create_app())
    res = client.get("/api/v1/incidents")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    assert client.get("/api/v1/incidents/nope").status_code == 404
