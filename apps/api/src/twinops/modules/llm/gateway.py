"""LLM gateway. All configured providers speak the OpenAI protocol, so one
client covers them via per-provider base URLs (ponytail: no LangChain for a
uniform API). Every call degrades to None on any failure, so callers fall back
to the deterministic behavior — the LLM only ever *enriches*, never blocks.
"""

import os
from dataclasses import dataclass

import structlog

log = structlog.get_logger()


@dataclass(frozen=True)
class Provider:
    key_env: str
    base_url: str
    default_model: str


# priority order; first one with a key configured wins (override via TWINOPS_LLM_PROVIDER)
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


def _select() -> tuple[str, Provider] | None:
    order = os.environ.get("TWINOPS_LLM_PROVIDER", "groq,gemini,openrouter").split(",")
    for name in order:
        p = PROVIDERS.get(name.strip())
        if p and os.environ.get(p.key_env):
            return name.strip(), p
    return None


def active_provider() -> str | None:
    sel = _select()
    return sel[0] if sel else None


def complete(prompt: str, system: str | None = None, max_tokens: int = 320) -> str | None:
    """One completion, or None if no provider is configured / the call fails."""
    sel = _select()
    if sel is None:
        return None
    name, provider = sel
    model = os.environ.get("TWINOPS_LLM_MODEL", provider.default_model)

    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

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
        text = resp.choices[0].message.content
        return text.strip() if text else None
    except Exception as exc:  # network / auth / bad model — degrade, never raise
        log.warning("llm_call_failed", provider=name, model=model, error=str(exc))
        return None
