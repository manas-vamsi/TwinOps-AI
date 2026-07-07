"""In-process per-IP rate limiting (BUS_MODE=inproc — no Redis needed for a
single instance). Protects mutating and LLM-spending endpoints from abuse;
the LLM narrative endpoint spends the operator's provider key, so it is capped.
"""

import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request

_hits: dict[str, deque[float]] = defaultdict(deque)


def _check(key: str, max_calls: int, window_s: float, now: float) -> bool:
    """Sliding-window check. Returns False when the caller is over the limit."""
    dq = _hits[key]
    while dq and dq[0] <= now - window_s:
        dq.popleft()
    if len(dq) >= max_calls:
        return False
    dq.append(now)
    return True


def rate_limit(name: str, max_calls: int, window_s: float = 60.0) -> Callable[[Request], None]:
    """FastAPI dependency: allow `max_calls` per `window_s` per client IP."""

    def dependency(request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        if not _check(f"{name}:{ip}", max_calls, window_s, time.monotonic()):
            raise HTTPException(status_code=429, detail="rate limit exceeded, slow down")

    return dependency
