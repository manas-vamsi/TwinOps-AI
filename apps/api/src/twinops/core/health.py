import time

from fastapi import APIRouter

from twinops import __version__
from twinops.modules.twin.service import twin_service

router = APIRouter(tags=["health"])

# ticker fires every ~1.5s; allow generous slack before calling it unhealthy
_TICKER_STALE_S = 6.0


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    """Liveness: the process is up."""
    return {"status": "ok", "version": __version__}


@router.get("/readyz")
async def readyz() -> dict[str, object]:
    """Readiness: reports live subsystem health. The simulation ticker must be
    advancing — a stalled ticker means the twin has gone silent."""
    age = time.monotonic() - twin_service.last_advance
    ticker_ok = age < _TICKER_STALE_S
    return {
        "status": "ready" if ticker_ok else "degraded",
        "components": {
            "ticker": {
                "healthy": ticker_ok,
                "tick": twin_service.tick,
                "last_advance_s_ago": round(age, 1),
            }
        },
    }
