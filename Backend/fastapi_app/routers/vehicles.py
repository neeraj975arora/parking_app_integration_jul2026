"""Vehicle management routes (user-facing)."""
import logging
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import setup_logging
from ..database import get_db
from .. import models
from ..auth_utils import get_current_user_id

setup_logging()
logger = logging.getLogger(__name__)

# Two prefixes to match both /api/v1/user and /user paths
router = APIRouter(tags=["Vehicle Management"])

VALID_VEHICLE_TYPES = {"car", "bike", "truck", "suv", "van", "auto", "motorcycle"}


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class VehicleCreate(BaseModel):
    registration_number: str
    vehicle_name: Optional[str] = ""
    make: Optional[str] = ""
    model: Optional[str] = ""
    year: Optional[int] = 2024
    vehicle_type: Optional[str] = "car"
    color: Optional[str] = ""


class VehicleUpdate(BaseModel):
    registration_number: Optional[str] = None
    vehicle_name: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: Optional[str] = None
    color: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalize_reg_no(reg_no: str) -> str:
    return re.sub(r"\s+", "", reg_no).upper()


def _vehicle_to_dict(v: models.UserVehicle) -> dict:
    return {
        "vehicle_id": v.vehicle_id,
        "id": v.vehicle_id,
        "registration_number": v.registration_number,
        "vehicle_name": v.vehicle_name,
        "make": v.make,
        "model": v.model,
        "year": v.year,
        "vehicle_type": v.vehicle_type,
        "color": v.color,
        "is_active": v.is_active,
    }


# ---------------------------------------------------------------------------
# Endpoints — registered on both prefixes in main.py
# ---------------------------------------------------------------------------

def get_vehicles_handler(user_id: int, db: Session):
    vehicles = db.query(models.UserVehicle).filter_by(user_id=user_id, is_active=True).all()
    return {
        "success": True,
        "data": [_vehicle_to_dict(v) for v in vehicles],
        "count": len(vehicles),
    }


def add_vehicle_handler(body: VehicleCreate, user_id: int, db: Session):
    if not body.registration_number:
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": "Validation failed", "message": "Registration number is required"},
        )

    registration_number = normalize_reg_no(body.registration_number)

    existing = db.query(models.UserVehicle).filter_by(
        registration_number=registration_number, is_active=True
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"success": False, "error": "already registered"},
        )

    year = body.year
    if year and (year < 1900 or year > 2026):
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": "Validation failed", "message": "Year must be between 1900 and 2026"},
        )

    vehicle_type = body.vehicle_type or "car"
    if vehicle_type not in VALID_VEHICLE_TYPES:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error": "Validation failed",
                "message": f"Vehicle type must be one of: {', '.join(sorted(VALID_VEHICLE_TYPES))}",
            },
        )

    vehicle = models.UserVehicle(
        user_id=user_id,
        registration_number=registration_number,
        vehicle_name=body.vehicle_name or "",
        make=body.make or "",
        model=body.model or "",
        year=year or 2024,
        vehicle_type=vehicle_type,
        color=body.color or "",
        is_active=True,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    return {
        "success": True,
        "message": "Vehicle added successfully",
        "data": _vehicle_to_dict(vehicle),
    }


def update_vehicle_handler(vehicle_id: int, body: VehicleUpdate, user_id: int, db: Session):
    vehicle = db.query(models.UserVehicle).filter_by(
        vehicle_id=vehicle_id, user_id=user_id, is_active=True
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Vehicle not found"})

    if body.registration_number is not None:
        reg_no = normalize_reg_no(body.registration_number)
        if reg_no != vehicle.registration_number:
            dup = db.query(models.UserVehicle).filter_by(registration_number=reg_no, is_active=True).first()
            if dup:
                raise HTTPException(status_code=409, detail={"success": False, "error": "already registered"})
        vehicle.registration_number = reg_no

    if body.vehicle_name is not None:
        vehicle.vehicle_name = body.vehicle_name
    if body.make is not None:
        vehicle.make = body.make
    if body.model is not None:
        vehicle.model = body.model
    if body.year is not None:
        if body.year < 1900 or body.year > 2026:
            raise HTTPException(
                status_code=400,
                detail={"success": False, "error": "Validation failed", "message": "Year must be between 1900 and 2026"},
            )
        vehicle.year = body.year
    if body.vehicle_type is not None:
        if body.vehicle_type not in VALID_VEHICLE_TYPES:
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "error": "Validation failed",
                    "message": f"Vehicle type must be one of: {', '.join(sorted(VALID_VEHICLE_TYPES))}",
                },
            )
        vehicle.vehicle_type = body.vehicle_type
    if body.color is not None:
        vehicle.color = body.color

    db.commit()
    db.refresh(vehicle)
    return {"success": True, "message": "Vehicle updated successfully", "data": _vehicle_to_dict(vehicle)}


def delete_vehicle_handler(vehicle_id: int, user_id: int, db: Session):
    vehicle = db.query(models.UserVehicle).filter_by(
        vehicle_id=vehicle_id, user_id=user_id, is_active=True
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Vehicle not found"})

    vehicle.is_active = False
    db.commit()
    return {"success": True, "message": "Vehicle deleted successfully"}


# ---------------------------------------------------------------------------
# Route definitions for /user/vehicles prefix
# ---------------------------------------------------------------------------

@router.get("/user/vehicles")
def get_vehicles(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return get_vehicles_handler(user_id, db)


@router.post("/user/vehicles", status_code=201)
def add_vehicle(
    body: VehicleCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return add_vehicle_handler(body, user_id, db)


@router.put("/user/vehicles/{vehicle_id}")
def update_vehicle(
    vehicle_id: int,
    body: VehicleUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return update_vehicle_handler(vehicle_id, body, user_id, db)


@router.delete("/user/vehicles/{vehicle_id}")
def delete_vehicle(
    vehicle_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return delete_vehicle_handler(vehicle_id, user_id, db)


# ---------------------------------------------------------------------------
# Route definitions for /api/v1/user/vehicles prefix
# ---------------------------------------------------------------------------

@router.get("/api/v1/user/vehicles")
def get_vehicles_v1(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return get_vehicles_handler(user_id, db)


@router.post("/api/v1/user/vehicles", status_code=201)
def add_vehicle_v1(
    body: VehicleCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return add_vehicle_handler(body, user_id, db)


@router.put("/api/v1/user/vehicles/{vehicle_id}")
def update_vehicle_v1(
    vehicle_id: int,
    body: VehicleUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return update_vehicle_handler(vehicle_id, body, user_id, db)


@router.delete("/api/v1/user/vehicles/{vehicle_id}")
def delete_vehicle_v1(
    vehicle_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return delete_vehicle_handler(vehicle_id, user_id, db)
