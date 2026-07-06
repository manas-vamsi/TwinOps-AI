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


def test_incidents_endpoint() -> None:
    client = TestClient(create_app())
    res = client.get("/api/v1/incidents")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    assert client.get("/api/v1/incidents/nope").status_code == 404
