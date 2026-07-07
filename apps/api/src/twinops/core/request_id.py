import uuid
from collections.abc import Awaitable, Callable

import structlog
from fastapi import Request, Response

REQUEST_ID_HEADER = "X-Request-ID"


async def request_id_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Attach a request id to logs and the response (DEVELOPMENT_RULES §7)."""
    request_id = request.headers.get(REQUEST_ID_HEADER, uuid.uuid4().hex)
    request.state.request_id = request_id  # for RFC-7807 error bodies
    structlog.contextvars.bind_contextvars(request_id=request_id)
    try:
        response = await call_next(request)
    finally:
        structlog.contextvars.unbind_contextvars("request_id")
    response.headers[REQUEST_ID_HEADER] = request_id
    return response
