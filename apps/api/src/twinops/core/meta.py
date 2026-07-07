import os

from fastapi import APIRouter
from pydantic import BaseModel

from twinops.modules.llm import gateway
from twinops.modules.simulation.engine import SEED

router = APIRouter(prefix="/api/v1", tags=["meta"])


class Provider(BaseModel):
    id: str
    label: str
    kind: str  # "local" | "cloud"
    configured: bool


class SystemConfig(BaseModel):
    sim_seed: int
    workspace: str
    providers: list[Provider]
    llm_tokens_used: dict[str, int]  # cumulative tokens per provider (cost visibility)


@router.get("/config")
async def get_config() -> SystemConfig:
    """Honest F10 view: the app boots with any >=1 provider; Ollama needs no key."""
    return SystemConfig(
        sim_seed=SEED,
        workspace="demo-workspace",
        llm_tokens_used=gateway.usage_summary(),
        providers=[
            Provider(id="ollama", label="Ollama (local)", kind="local", configured=True),
            Provider(
                id="gemini",
                label="Google Gemini",
                kind="cloud",
                configured=bool(os.environ.get("GOOGLE_API_KEY")),
            ),
            Provider(
                id="anthropic",
                label="Anthropic Claude",
                kind="cloud",
                configured=bool(os.environ.get("ANTHROPIC_API_KEY")),
            ),
            Provider(
                id="openai",
                label="OpenAI",
                kind="cloud",
                configured=bool(os.environ.get("OPENAI_API_KEY")),
            ),
        ],
    )
