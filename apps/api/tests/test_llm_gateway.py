"""AI harness: exercises the actual LLM call path with a mocked OpenAI client
(no keys, no network) — provider selection, the fallback chain, all-fail, and
token metering. The deterministic-fallback path is covered in test_chat /
test_incidents."""

from collections.abc import Iterator

import pytest

from twinops.modules.llm import gateway


class _Msg:
    def __init__(self, content: str | None) -> None:
        self.content = content


class _Choice:
    def __init__(self, content: str | None) -> None:
        self.message = _Msg(content)


class _Usage:
    def __init__(self, tokens: int) -> None:
        self.total_tokens = tokens


class _Resp:
    def __init__(self, content: str | None, tokens: int) -> None:
        self.choices = [_Choice(content)]
        self.usage = _Usage(tokens)


def _install_fake_openai(monkeypatch: pytest.MonkeyPatch, behavior) -> None:  # type: ignore[no-untyped-def]
    """behavior(base_url) -> str content, or raises to simulate a provider error."""
    import openai

    class _Completions:
        def __init__(self, base_url: str) -> None:
            self._base = base_url

        def create(self, **_: object) -> _Resp:
            return _Resp(behavior(self._base), tokens=42)

    class _Chat:
        def __init__(self, base_url: str) -> None:
            self.completions = _Completions(base_url)

    class _FakeClient:
        def __init__(self, *, base_url: str, **__: object) -> None:
            self.chat = _Chat(base_url)

    monkeypatch.setattr(openai, "OpenAI", _FakeClient)


@pytest.fixture(autouse=True)
def _reset(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    gateway._usage_tokens.clear()
    for v in ("GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "TWINOPS_LLM_PROVIDER"):
        monkeypatch.delenv(v, raising=False)
    yield


def test_no_provider_configured_returns_none() -> None:
    assert gateway.complete("hi") is None
    assert gateway.active_provider() is None


def test_selection_follows_priority_order(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "x")
    monkeypatch.setenv("GROQ_API_KEY", "x")
    assert gateway.active_provider() == "groq"  # groq first in default order


def test_completes_and_meters_tokens(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "x")
    _install_fake_openai(monkeypatch, lambda base: "root cause: db pool")
    out = gateway.complete("why?", system="be terse")
    assert out == "root cause: db pool"
    assert gateway.usage_summary()["groq"] == 42


def test_fallback_chain_tries_next_provider_on_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "x")
    monkeypatch.setenv("GEMINI_API_KEY", "x")

    def behavior(base_url: str) -> str:
        if "groq" in base_url:
            raise RuntimeError("groq down")
        return "answer from gemini"

    _install_fake_openai(monkeypatch, behavior)
    assert gateway.complete("q") == "answer from gemini"  # chained past the failure


def test_all_providers_fail_returns_none(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "x")
    monkeypatch.setenv("GEMINI_API_KEY", "x")

    def behavior(_: str) -> str:
        raise RuntimeError("down")

    _install_fake_openai(monkeypatch, behavior)
    assert gateway.complete("q") is None
