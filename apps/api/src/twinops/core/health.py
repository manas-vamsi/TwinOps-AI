from fastapi import APIRouter

from twinops import __version__

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    """Liveness: the process is up."""
    return {"status": "ok", "version": __version__}


@router.get("/readyz")
async def readyz() -> dict[str, object]:
    """Readiness: supervised components report here as phases land (sim ticker, rollups)."""
    return {"status": "ready", "components": {}}
