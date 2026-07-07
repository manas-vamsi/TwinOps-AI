from twinops.modules.chat.service import _suggested_action, answer_chat


def test_chat_falls_back_to_deterministic_without_provider(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    for var in ("GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY"):
        monkeypatch.delenv(var, raising=False)
    resp = answer_chat("what's failing?")
    assert resp.source == "deterministic"
    assert resp.provider is None
    assert "Components:" in resp.text


def test_suggested_action_routes_by_keyword() -> None:
    assert _suggested_action("why is this happening?").href == "/incidents"  # type: ignore[union-attr]
    assert _suggested_action("show me the runbook").href == "/knowledge"  # type: ignore[union-attr]
    assert _suggested_action("what's failing on the twin?").href == "/twin"  # type: ignore[union-attr]
    assert _suggested_action("hello") is None
