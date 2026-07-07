"""LLM gateway — the five production responsibilities in one place: unified
access, caching, routing, resilience, and cost visibility.

- Unified access: every provider speaks the OpenAI protocol, so one client
  covers them via per-provider base URLs (ponytail: no LangChain needed).
- Caching: exact-match response cache (prompt-hash key + TTL). Identical
  requests are served in microseconds and cost nothing — research shows 30-99%
  cost/latency savings on repeat traffic. (Semantic cache is the next layer;
  it needs embeddings, deliberately deferred.)
- Routing + resilience: a fallback chain tries each configured provider in
  priority order; a per-provider circuit breaker skips a provider that just
  failed repeatedly, so one dead provider can't stall every request.
- Cost visibility: token usage + cache hit-rate are metered and exposed.
"""

import hashlib
import os
import time
from collections import defaultdict
from dataclasses import dataclass

import structlog

log = structlog.get_logger()


@dataclass(frozen=True)
class Provider:
    key_env: str
    base_url: str
    default_model: str


# priority order; overridable via TWINOPS_LLM_PROVIDER (comma-separated)
PROVIDERS: dict[str, Provider] = {
    "groq": Provider("GROQ_API_KEY", "https://api.groq.com/openai/v1", "llama-3.1-8b-instant"),
    "gemini": Provider(
        "GEMINI_API_KEY",
        "https://generativelanguage.googleapis.com/v1beta/openai/",
        "gemini-2.0-flash",
    ),
    "openrouter": Provider(
        "OPENROUTER_API_KEY",
        "https://openrouter.ai/api/v1",
        "meta-llama/llama-3.3-70b-instruct:free",
    ),
}

# cost metering
_usage_tokens: dict[str, int] = defaultdict(int)

# exact-match response cache: key -> (expires_at_monotonic, text)
_CACHE_TTL = float(os.environ.get("TWINOPS_LLM_CACHE_TTL", "300"))
_CACHE_MAX = 512
_cache: dict[str, tuple[float, str]] = {}
_metrics: dict[str, int] = {"hits": 0, "misses": 0}

# per-provider circuit breaker
_BREAKER_THRESHOLD = 3  # consecutive failures before opening
_BREAKER_COOLDOWN = 30.0  # seconds a provider is skipped once open
_fail_counts: dict[str, int] = defaultdict(int)
_breaker_until: dict[str, float] = {}


def _cache_key(prompt: str, system: str | None, max_tokens: int) -> str:
    raw = f"{max_tokens}\x00{system or ''}\x00{prompt}"
    return hashlib.sha256(raw.encode()).hexdigest()


def configured_providers() -> list[tuple[str, Provider]]:
    order = os.environ.get("TWINOPS_LLM_PROVIDER", "groq,gemini,openrouter").split(",")
    result: list[tuple[str, Provider]] = []
    for name in order:
        provider = PROVIDERS.get(name.strip())
        if provider and os.environ.get(provider.key_env):
            result.append((name.strip(), provider))
    return result


def active_provider() -> str | None:
    providers = configured_providers()
    return providers[0][0] if providers else None


def usage_summary() -> dict[str, int]:
    return dict(_usage_tokens)


def cache_stats() -> dict[str, int]:
    total = _metrics["hits"] + _metrics["misses"]
    return {
        "hits": _metrics["hits"],
        "misses": _metrics["misses"],
        "size": len(_cache),
        "hit_rate_pct": round(_metrics["hits"] / total * 100) if total else 0,
    }


def breaker_state() -> dict[str, float]:
    """Providers whose breaker is open, with seconds remaining."""
    now = time.monotonic()
    return {name: round(until - now, 1) for name, until in _breaker_until.items() if until > now}


def reset_for_tests() -> None:
    """Clear cache, metrics, and breaker state — for test isolation."""
    _cache.clear()
    _fail_counts.clear()
    _breaker_until.clear()
    _usage_tokens.clear()
    _metrics["hits"] = 0
    _metrics["misses"] = 0


def complete(prompt: str, system: str | None = None, max_tokens: int = 320) -> str | None:
    """One completion via cache → fallback chain, or None if every provider fails."""
    now = time.monotonic()

    key = _cache_key(prompt, system, max_tokens)
    hit = _cache.get(key)
    if hit and hit[0] > now:
        _metrics["hits"] += 1
        log.info("llm_cache_hit", hit_rate_pct=cache_stats()["hit_rate_pct"])
        return hit[1]
    _metrics["misses"] += 1

    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    for name, provider in configured_providers():
        if _breaker_until.get(name, 0.0) > now:
            continue  # circuit open — skip this provider
        model = os.environ.get("TWINOPS_LLM_MODEL", provider.default_model)
        try:
            from openai import OpenAI

            client = OpenAI(
                api_key=os.environ[provider.key_env],
                base_url=provider.base_url,
                timeout=20,
                max_retries=1,
            )
            resp = client.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                max_tokens=max_tokens,
                temperature=0.3,
            )
            if resp.usage and resp.usage.total_tokens:
                _usage_tokens[name] += resp.usage.total_tokens
            text = resp.choices[0].message.content
            if text:
                _fail_counts[name] = 0
                out = text.strip()
                _cache[key] = (now + _CACHE_TTL, out)
                if len(_cache) > _CACHE_MAX:
                    _cache.pop(next(iter(_cache)))  # drop oldest (insertion order)
                log.info(
                    "llm_ok",
                    provider=name,
                    model=model,
                    latency_ms=round((time.monotonic() - now) * 1000),
                    tokens=(resp.usage.total_tokens if resp.usage else None),
                )
                return out
        except Exception as exc:  # network / auth / bad model — trip breaker, try next
            _fail_counts[name] += 1
            if _fail_counts[name] >= _BREAKER_THRESHOLD:
                _breaker_until[name] = now + _BREAKER_COOLDOWN
                log.warning("llm_breaker_open", provider=name, cooldown_s=_BREAKER_COOLDOWN)
            log.warning("llm_call_failed", provider=name, model=model, error=str(exc))
            continue
    return None
