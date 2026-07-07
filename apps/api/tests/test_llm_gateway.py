"""AI harness: exercises the real LLM call path with a mocked OpenAI client
(no keys, no network) — provider selection, fallback chain, all-fail, token
metering, the response cache, and the circuit breaker."""

from collections.abc import Callable, Iterator

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


def _install_fake_openai(
    monkeypatch: pytest.MonkeyPatch,
    behavior: Callable[[str], str],
    calls: list[str],
) -> None:
    """behavior(base_url) -> content, or raises to simulate a failure.
    Every attempt appends its base_url to `calls` for assertions."""
    import openai

    class _Completions:
        def __init__(self, base_url: str) -> None:
            self._base = base_url

        def create(self, **_: object) -> _Resp:
            calls.append(self._base)
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
    gateway.reset_for_tests()
    for v in ("GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "TWINOPS_LLM_PROVIDER"):
        monkeypatch.delenv(v, raising=False)
    yield
    gateway.reset_for_tests()


def test_no_provider_configured_returns_none() -> None:
    assert gateway.complete("hi") is None
    assert gateway.active_provider() is None


def test_selection_follows_priority_order(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "x")
    monkeypatch.setenv("GROQ_API_KEY", "x")
    assert gateway.active_provider() == "groq"


def test_completes_and_meters_tokens(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "x")
    _install_fake_openai(monkeypatch, lambda base: "root cause: db pool", [])
    assert gateway.complete("why?", system="be terse") == "root cause: db pool"
    assert gateway.usage_summary()["groq"] == 42


def test_fallback_chain_tries_next_provider_on_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "x")
    monkeypatch.setenv("GEMINI_API_KEY", "x")

    def behavior(base_url: str) -> str:
        if "groq" in base_url:
            raise RuntimeError("groq down")
        return "answer from gemini"

    _install_fake_openai(monkeypatch, behavior, [])
    assert gateway.complete("q") == "answer from gemini"


def test_all_providers_fail_returns_none(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "x")

    def behavior(_: str) -> str:
        raise RuntimeError("down")

    _install_fake_openai(monkeypatch, behavior, [])
    assert gateway.complete("q") is None


def test_cache_serves_identical_request_without_calling_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "x")
    calls: list[str] = []
    _install_fake_openai(monkeypatch, lambda base: "cached answer", calls)

    a = gateway.complete("same question", system="s")
    b = gateway.complete("same question", system="s")

    assert a == b == "cached answer"
    assert len(calls) == 1  # second call served from cache, provider hit once
    stats = gateway.cache_stats()
    assert stats["hits"] == 1 and stats["misses"] == 1
    assert stats["hit_rate_pct"] == 50


def test_cache_misses_for_different_prompts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "x")
    calls: list[str] = []
    _install_fake_openai(monkeypatch, lambda base: "answer", calls)

    gateway.complete("prompt A")
    gateway.complete("prompt B")

    assert len(calls) == 2  # distinct prompts each hit the provider


def test_circuit_breaker_skips_a_repeatedly_failing_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "x")
    monkeypatch.setenv("GEMINI_API_KEY", "x")
    calls: list[str] = []

    def behavior(base_url: str) -> str:
        if "groq" in base_url:
            raise RuntimeError("groq down")
        return "gemini ok"

    _install_fake_openai(monkeypatch, behavior, calls)

    # distinct prompts to bypass the cache; groq fails each time then gemini serves
    for i in range(5):
        assert gateway.complete(f"q{i}") == "gemini ok"

    groq_calls = sum(1 for c in calls if "groq" in c)
    # groq is tried only until the breaker opens (threshold), then skipped
    assert groq_calls == gateway._BREAKER_THRESHOLD
    assert "groq" in gateway.breaker_state()
