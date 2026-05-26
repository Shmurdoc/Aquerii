"""
Shared authentication dependency for internal service-to-service calls.
The Laravel API service sends: Authorization: Bearer <AI_INTERNAL_TOKEN>
which must match settings.INTERNAL_API_KEY on the Python side.
"""
from fastapi import Header, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

_bearer_scheme = HTTPBearer(auto_error=False)


def verify_internal_token(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer_scheme),
    x_internal_key: str | None = Header(default=None, alias="X-Internal-Key"),
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
) -> None:
    """
    Accepts the token in any of three forms for backward compatibility:
      1. Authorization: Bearer <token>
      2. X-Internal-Key: <token>
      3. X-Internal-Secret: <token>
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif x_internal_key:
        token = x_internal_key
    elif x_internal_secret:
        token = x_internal_secret

    if not token or token != settings.INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Forbidden"})
