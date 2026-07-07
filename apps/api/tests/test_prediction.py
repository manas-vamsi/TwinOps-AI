from twinops.modules.prediction.engine import predict


def test_predicts_eta_for_a_declining_node() -> None:
    # steady decline from 100 toward critical (40) — should forecast an ETA
    hist = {"svc-payment": [100.0, 90.0, 80.0, 70.0, 60.0, 50.0]}
    preds = predict(hist)
    assert len(preds) == 1
    assert preds[0].node_id == "svc-payment"
    assert preds[0].eta_seconds > 0
    assert 0 < preds[0].confidence <= 95


def test_no_prediction_for_stable_or_improving_nodes() -> None:
    assert predict({"a": [90.0, 90.0, 91.0, 90.0, 92.0]}) == []  # flat/rising
    assert predict({"a": [100.0, 100.0]}) == []  # too few samples


def test_no_prediction_for_already_critical_node() -> None:
    # already below critical — that's an incident, not a forecast
    assert predict({"a": [50.0, 40.0, 30.0, 20.0, 10.0]}) == []
