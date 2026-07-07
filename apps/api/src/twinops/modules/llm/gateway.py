"""LLM gateway. All configured providers speak the OpenAI protocol, so one
client covers them via per-provider base URLs (ponytail: no LangChain for a
uniform API).

Real fallback chain: tries each configured provider in priority order until one
succeeds; if all fail (or none is configured) it returns None so callers fall
back to deterministic behavior — the LLM only ever *enriches*, never blocks.
Token usage is metered per provider for cost visibility.
"""

import os
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

# per-provider cumulative token usage (cost visibility; exposed via /config)
_usage_tokens: dict[str, int] = defaultdict(int)


def configured_providers() -> list[tuple[str, Provider]]:
    """Configured providers in priority order (those with a key present)."""
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


def complete(prompt: str, system: str | None = None, max_tokens: int = 320) -> str | None:
    """One completion via the fallback chain, or None if every provider fails."""
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    for name, provider in configured_providers():
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
                log.info("llm_ok", provider=name, model=model)
                return text.strip()
        except Exception as exc:  # network / auth / bad model — try the next provider
            log.warning("llm_call_failed", provider=name, model=model, error=str(exc))
            continue
    return None
