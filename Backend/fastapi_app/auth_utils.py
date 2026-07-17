"""JWT creation and verification utilities."""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import logging

from .config import settings, setup_logging
from .database import get_db
from . import models

setup_logging()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(hours=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ---------------------------------------------------------------------------
# FastAPI security scheme
# ---------------------------------------------------------------------------

bearer_scheme = HTTPBearer(auto_error=False)


def _extract_token(credentials: Optional[HTTPAuthorizationCredentials]) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

def get_current_user_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Dict[str, Any]:
    """Return the decoded JWT payload. Raises 401 if missing/invalid."""
    token = _extract_token(credentials)
    return decode_access_token(token)


def get_current_user_id(
    payload: Dict[str, Any] = Depends(get_current_user_payload),
) -> int:
    """Return the integer user_id from the JWT."""
    sub = payload.get("sub") or payload.get("user_id")
    if sub is None:
        raise HTTPException(status_code=401, detail="Token missing user identity")
    try:
        return int(sub)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid user identity in token")


def get_current_user_role(
    payload: Dict[str, Any] = Depends(get_current_user_payload),
) -> str:
    role = payload.get("role")
    if not role:
        raise HTTPException(status_code=401, detail="Token missing role information")
    return role


# ---------------------------------------------------------------------------
# Role-based access control
# ---------------------------------------------------------------------------

ROLE_HIERARCHY = {
    "super_admin": {"super_admin", "admin", "user"},
    "admin": {"admin", "user"},
    "user": {"user"},
}


def _has_required_role(user_role: str, required_role: str) -> bool:
    return required_role in ROLE_HIERARCHY.get(user_role, {user_role})


def require_role(required_role: str):
    """
    Returns a FastAPI dependency that enforces the given role.
    Usage:
        @router.get("/...", dependencies=[Depends(require_role("admin"))])
    or inject as a parameter:
        async def endpoint(payload=Depends(require_role("admin"))): ...
    """

    def _dependency(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    ) -> Dict[str, Any]:
        token = _extract_token(credentials)
        payload = decode_access_token(token)
        user_role = payload.get("role")
        if not user_role:
            raise HTTPException(status_code=401, detail="Token missing role information")
        if not _has_required_role(user_role, required_role):
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required: {required_role}",
            )
        # Attach user info to payload for downstream use
        user_id = payload.get("user_id") or payload.get("sub")
        payload["_current_user"] = {"user_id": user_id, "role": user_role}
        return payload

    return _dependency
