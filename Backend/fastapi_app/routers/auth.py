"""Authentication routes: register, login, super-admin status."""
import logging
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..config import settings, setup_logging
from ..database import get_db
from .. import models
from ..auth_utils import create_access_token

setup_logging()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    user_name: str
    user_email: str
    user_password: str
    user_phone_no: str
    user_address: Optional[str] = ""
    role: Optional[str] = "user"
    super_admin_secret: Optional[str] = None


class LoginRequest(BaseModel):
    user_email: str
    user_password: str
    role: str = "user"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check_super_admin_exists(db: Session) -> bool:
    return db.query(models.User).filter_by(role="super_admin").first() is not None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user (mobile app) or super admin (one-time)."""
    if not body.user_name or not body.user_email or not body.user_password or not body.user_phone_no:
        raise HTTPException(status_code=400, detail="Missing required fields")

    if "@" not in body.user_email:
        raise HTTPException(status_code=400, detail="Invalid email format")

    if db.query(models.User).filter_by(user_email=body.user_email).first():
        raise HTTPException(status_code=409, detail="User with this email already exists")

    if db.query(models.User).filter_by(user_phone_no=body.user_phone_no).first():
        raise HTTPException(status_code=409, detail="User with this phone number already exists")

    role = "user"
    requested_role = body.role

    if requested_role == "super_admin":
        if body.super_admin_secret != "SUPER_SECRET_SUPER_ADMIN_KEY":
            raise HTTPException(status_code=403, detail="Invalid or missing super admin secret")
        if _check_super_admin_exists(db):
            raise HTTPException(
                status_code=403,
                detail="Super admin already exists. Only one super admin is allowed per system.",
            )
        role = "super_admin"
    elif requested_role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin role cannot be registered via this endpoint. Admins are created by super_admin only.",
        )
    elif requested_role and requested_role not in ("user", "super_admin"):
        raise HTTPException(status_code=403, detail="Only 'user' and 'super_admin' roles are allowed")

    try:
        new_user = models.User(
            user_name=body.user_name,
            user_email=body.user_email,
            user_phone_no=body.user_phone_no,
            user_address=body.user_address or "",
            role=role,
        )
        new_user.set_password(body.user_password)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        if role == "super_admin":
            return {
                "msg": "Super Admin registered successfully",
                "role": new_user.role,
                "warning": "This is the only super admin account allowed in the system.",
            }
        return {"msg": "User registered successfully", "role": new_user.role}

    except Exception as exc:
        db.rollback()
        logger.exception(f"Database error during registration: {exc}")
        raise HTTPException(status_code=500, detail="Registration failed due to database error")


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate any role and return a JWT."""
    if not body.user_email or not body.user_password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    if body.role not in ("user", "admin", "super_admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'user', 'admin', or 'super_admin'")

    user = db.query(models.User).filter_by(user_email=body.user_email.strip()).first()

    if not user or not user.check_password(body.user_password):
        raise HTTPException(status_code=401, detail="Bad email or password")

    if user.role != body.role:
        raise HTTPException(status_code=401, detail="Invalid credentials for the specified role")

    token = create_access_token(
        data={
            "sub": str(user.user_id),
            "user_id": user.user_id,
            "role": user.role,
        },
        expires_delta=timedelta(hours=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS),
    )

    return {
        "access_token": token,
        "username": user.user_name,
        "user_email": user.user_email,
        "user_id": user.user_id,
        "user_address": user.user_address,
        "user_phone_no": user.user_phone_no,
        "role": user.role,
    }


@router.get("/super-admin-status")
def super_admin_status(db: Session = Depends(get_db)):
    """Check whether a super admin exists."""
    exists = _check_super_admin_exists(db)
    return {"super_admin_exists": exists, "can_register": not exists}
