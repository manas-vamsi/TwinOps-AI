from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from twinops.core.config import get_settings
from twinops.core.ratelimit import rate_limit
from twinops.modules.auth.service import (
    COOKIE_NAME,
    create_session,
    revoke_session,
    session_user,
    verify_credentials,
)

router = APIRouter(prefix="/api/v1", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthState(BaseModel):
    auth_enabled: bool
    user: str | None


@router.post(
    "/auth/login",
    dependencies=[Depends(rate_limit("login", max_calls=10, window_s=60))],
)
async def login(req: LoginRequest, response: Response) -> AuthState:
    settings = get_settings()
    if not settings.auth_enabled:
        return AuthState(auth_enabled=False, user="anonymous")
    if not verify_credentials(
        req.username, req.password, settings.demo_user, settings.demo_password
    ):
        raise HTTPException(status_code=401, detail="invalid credentials")
    token = create_session(req.username)
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        samesite="lax",
        secure=settings.env == "prod",
        max_age=60 * 60 * 12,
    )
    return AuthState(auth_enabled=True, user=req.username)


@router.post("/auth/logout")
async def logout(request: Request, response: Response) -> AuthState:
    revoke_session(request.cookies.get(COOKIE_NAME))
    response.delete_cookie(COOKIE_NAME)
    return AuthState(auth_enabled=get_settings().auth_enabled, user=None)


@router.get("/auth/me")
async def me(request: Request) -> AuthState:
    settings = get_settings()
    if not settings.auth_enabled:
        return AuthState(auth_enabled=False, user="anonymous")
    return AuthState(auth_enabled=True, user=session_user(request.cookies.get(COOKIE_NAME)))
