from fastapi import HTTPException, Request

from twinops.core.config import get_settings
from twinops.modules.auth.service import COOKIE_NAME, session_user


def require_auth(request: Request) -> str:
    """Dependency for protected endpoints. When the auth flag is off (default,
    local demo) everyone is 'anonymous'; when on, a valid session cookie is
    required and 401 is returned otherwise."""
    settings = get_settings()
    if not settings.auth_enabled:
        return "anonymous"
    user = session_user(request.cookies.get(COOKIE_NAME))
    if user is None:
        raise HTTPException(status_code=401, detail="authentication required")
    return user
