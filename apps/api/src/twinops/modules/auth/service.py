"""Session auth, flag-gated (TWINOPS_AUTH_ENABLED, default off).

ponytail: in-memory session store (token -> username) for a single instance —
no JWT library needed; `secrets` tokens in an httpOnly cookie are simpler and
revocable. Seam: swap the dict for Valkey when multi-instance. Constant-time
credential compare so the login can't be timing-probed.
"""

import secrets

COOKIE_NAME = "twinops_session"

_sessions: dict[str, str] = {}  # token -> username


def verify_credentials(username: str, password: str, expected_user: str, expected_pw: str) -> bool:
    user_ok = secrets.compare_digest(username, expected_user)
    pw_ok = secrets.compare_digest(password, expected_pw)
    return user_ok and pw_ok


def create_session(username: str) -> str:
    token = secrets.token_urlsafe(32)
    _sessions[token] = username
    return token


def session_user(token: str | None) -> str | None:
    if token is None:
        return None
    return _sessions.get(token)


def revoke_session(token: str | None) -> None:
    if token is not None:
        _sessions.pop(token, None)
