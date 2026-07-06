from fastapi.testclient import TestClient

from twinops.main import create_app
from twinops.modules.simulation.engine import FailureState, compute_impact, simulate_tick
from twinops.modules.twin.topology import NODES


def test_simulation_is_deterministic() -> None:
    # same seed + tick + failure => identical health (protects replay & demos)
    a = simulate_tick(5, None, None)
    b = simulate_tick(5, None, None)
    assert {k: v.score for k, v in a.items()} == {k: v.score for k, v in b.items()}


def test_baseline_is_all_healthy() -> None:
    health = simulate_tick(0, None, None)
    assert all(h.status == "healthy" for h in health.values())


def test_failure_cascades_from_origin_to_dependents() -> None:
    # db-orders-pg failing, aged enough to propagate, should degrade svc-orders
    failure = FailureState(origin="db-orders-pg", age=8)
    impact = compute_impact(failure)
    assert impact["db-orders-pg"] > impact.get("svc-orders", 0)
    assert impact.get("svc-orders", 0) > 0  # dependent is affected
    assert "svc-auth" not in impact  # unrelated branch untouched


def test_graph_endpoint_returns_full_topology() -> None:
    client = TestClient(create_app())
    res = client.get("/api/v1/twin/graph")

    assert res.status_code == 200
    body = res.json()
    assert len(body["nodes"]) == len(NODES)
    assert body["topology_hash"]
    assert len(body["health"]) == len(NODES)


def test_inject_unknown_scenario_is_404() -> None:
    client = TestClient(create_app())
    assert client.post("/api/v1/simulation/inject/nope").status_code == 404
