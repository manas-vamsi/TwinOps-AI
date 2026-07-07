"""RFC-7807-style error responses (DEVELOPMENT_RULES §7): every error carries
{code, message, details, trace_id} with the request's id, so a failure is
traceable from the client response straight to the logs."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from twinops.core.request_id import REQUEST_ID_HEADER


def _trace_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _body(
    code: str, message: object, trace_id: str | None, details: object = None
) -> dict[str, object]:
    return {"code": code, "message": message, "details": details, "trace_id": trace_id}


def _headers(trace_id: str | None) -> dict[str, str] | None:
    return {REQUEST_ID_HEADER: trace_id} if trace_id else None


async def _http_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    trace_id = _trace_id(request)
    return JSONResponse(
        status_code=exc.status_code,
        content=_body(f"http_{exc.status_code}", exc.detail, trace_id),
        headers=_headers(trace_id),
    )


async def _validation_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    trace_id = _trace_id(request)
    return JSONResponse(
        status_code=422,
        content=_body("validation_error", "request validation failed", trace_id, exc.errors()),
        headers=_headers(trace_id),
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
