"""Parking session routes (user-facing): check-in, checkout, history, active."""
import json
import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import setup_logging
from ..database import get_db
from .. import models
from ..auth_utils import get_current_user_id

setup_logging()
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Sessions"])

VALID_PAYMENT_METHODS = {"card", "cash", "upi", "netbanking"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fmt_dt(dt) -> str:
    """Format datetime to ISO string WITHOUT microseconds — matches Android Gson format."""
    if dt is None:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def calculate_cost(start_time: datetime, end_time: datetime) -> float:
    hours = (end_time - start_time).total_seconds() / 3600
    return round(hours * 3.0, 2)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class CheckinRequest(BaseModel):
    vehicle_id: int
    parkinglot_id: int


class CheckoutRequest(BaseModel):
    ticket_id: str
    payment_method: Optional[str] = "card"


# ---------------------------------------------------------------------------
# Shared handlers (used by both /user/sessions and /api/v1/user/sessions)
# ---------------------------------------------------------------------------

def checkin_handler(body: CheckinRequest, user_id: int, db: Session):
    vehicle_id = body.vehicle_id
    parkinglot_id = body.parkinglot_id

    if vehicle_id <= 0 or parkinglot_id <= 0:
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": "Validation failed", "message": "vehicle_id and parkinglot_id must be positive integers"},
        )

    vehicle = db.query(models.UserVehicle).filter_by(
        vehicle_id=vehicle_id, user_id=user_id, is_active=True
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Vehicle not found"})

    parking_lot = db.query(models.ParkingLotDetails).filter_by(id=parkinglot_id).first()
    if not parking_lot:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Parking lot not found"})

    active_session = db.query(models.ParkingSession).filter_by(
        user_id=user_id, vehicle_id=vehicle_id, end_time=None
    ).first()
    if active_session:
        raise HTTPException(
            status_code=409,
            detail={"success": False, "error": "already has an active session"},
        )

    slot = db.query(models.Slot).filter_by(parkinglot_id=parkinglot_id, status=0).first()
    if not slot:
        raise HTTPException(
            status_code=409,
            detail={"success": False, "error": "no available parking slots"},
        )

    ticket_id = str(uuid.uuid4())[:8].upper()
    session = models.ParkingSession(
        ticket_id=ticket_id,
        user_id=user_id,
        vehicle_id=vehicle_id,
        slot_id=slot.id,
        parkinglot_id=parkinglot_id,
        vehicle_reg_no=vehicle.registration_number,
        start_time=datetime.utcnow(),
        end_time=None,
        total_amount=0,
        payment_status="pending",
        session_status="active",
    )

    slot.status = 1
    slot.vehicle_reg_no = vehicle.registration_number
    slot.ticket_id = ticket_id

    db.add(session)
    db.commit()

    return {
        "success": True,
        "message": "Vehicle checked in successfully",
        "data": {
            "ticket_id": ticket_id,
            "parking_lot_name": parking_lot.name,
            "status": "active",
            "slot_location": f"Slot {slot.name}",
            "vehicle_info": {
                "registration_number": vehicle.registration_number,
                "vehicle_name": vehicle.vehicle_name,
            },
        },
    }


def get_session_details_handler(ticket_id: str, user_id: int, db: Session):
    session = db.query(models.ParkingSession).filter_by(ticket_id=ticket_id).first()
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Session not found"})

    parking_lot = db.get(models.ParkingLotDetails, session.parkinglot_id)
    slot = db.get(models.Slot, session.slot_id)
    vehicle = db.get(models.UserVehicle, session.vehicle_id)

    is_active = session.end_time is None
    now = datetime.utcnow()
    end = now if is_active else session.end_time
    duration = (end - session.start_time).total_seconds() / 3600
    cost = calculate_cost(session.start_time, now) if is_active else float(session.total_amount or 0)

    data = {
        "ticket_id": session.ticket_id,
        "session_info": {
            "ticket_id": session.ticket_id,
            "status": "active" if is_active else "completed",
        },
        "parking_lot_info": {"name": parking_lot.name if parking_lot else None},
        "vehicle_info": {
            "registration_number": vehicle.registration_number if vehicle else session.vehicle_reg_no
        },
        "payment_info": {"payment_status": session.payment_status, "amount": float(cost)},
        "slot_location": f"Slot {slot.name}" if slot else None,
        "checkin_time": session.start_time.isoformat(),
        "duration_hours": round(duration, 2),
        "total_amount": float(cost),
    }
    if session.end_time:
        data["checkout_time"] = session.end_time.isoformat()

    return {"success": True, "data": data}


def get_active_sessions_handler(user_id: int, db: Session):
    # Use session_status='active' as primary filter (end_time may be inconsistent in seeded data)
    sessions = db.query(models.ParkingSession).filter(
        models.ParkingSession.user_id == int(user_id),
        models.ParkingSession.session_status == "active"
    ).all()

    result = []
    for session in sessions:
        parking_lot = db.get(models.ParkingLotDetails, session.parkinglot_id)
        duration = (datetime.utcnow() - session.start_time).total_seconds() / 3600 if session.start_time else 0
        estimated_cost = round(duration * 3.0, 2)
        result.append({
            # Fields matching Android ParkingSession @SerializedName annotations exactly
            "ticket_id": session.ticket_id,
            "user_id": session.user_id,
            "vehicle_id": session.vehicle_id,
            "parkinglot_id": session.parkinglot_id,
            "parking_lot_name": parking_lot.name if parking_lot else None,
            "parking_lot_address": parking_lot.address if parking_lot else None,
            "vehicle_reg_no": session.vehicle_reg_no,
            "vehicle_type": session.vehicle_type,
            "start_time": _fmt_dt(session.start_time),
            "end_time": None,
            "duration_hours": round(duration, 2),
            "total_amount": estimated_cost,
            "payment_status": session.payment_status or "pending",
            "payment_method": session.payment_method,
            "status": "active",
            # Extra convenience fields
            "checkin_time": _fmt_dt(session.start_time),
            "current_duration": round(duration, 2),
            "estimated_cost": estimated_cost,
        })

    return {"success": True, "data": result, "count": len(result)}


def checkout_handler(body: CheckoutRequest, user_id: int, db: Session):
    if not body.ticket_id:
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": "Validation failed", "message": "ticket_id is required"},
        )

    payment_method = body.payment_method or "card"
    if payment_method not in VALID_PAYMENT_METHODS:
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": "Validation failed", "message": "Invalid payment method"},
        )

    session = db.query(models.ParkingSession).filter_by(
        ticket_id=body.ticket_id, user_id=user_id
    ).first()
    if not session or session.end_time:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Session not found"})

    checkout_time = datetime.utcnow()
    total_amount = calculate_cost(session.start_time, checkout_time)
    duration = (checkout_time - session.start_time).total_seconds() / 3600

    session.end_time = checkout_time
    session.total_amount = total_amount
    session.payment_status = "completed"
    session.session_status = "completed"
    session.payment_method = payment_method

    slot = db.get(models.Slot, session.slot_id)
    if slot:
        slot.status = 0
        slot.vehicle_reg_no = None
        slot.ticket_id = None

    db.commit()

    return {
        "success": True,
        "message": "Vehicle checked out successfully",
        "data": {
            "ticket_id": body.ticket_id,
            "end_time": checkout_time.isoformat(),
            "duration": round(duration, 2),
            "duration_hours": round(duration, 2),
            "total_amount": float(total_amount),
            "payment_status": session.payment_status,
            "payment_method": payment_method,
            "status": "completed",
        },
    }


def get_session_history_handler(user_id: int, page: int, per_page: int, db: Session):
    query = (
        db.query(models.ParkingSession)
        .filter(
            models.ParkingSession.user_id == int(user_id),
            models.ParkingSession.session_status.in_(["completed", "cancelled"])
        )
        .order_by(models.ParkingSession.start_time.desc())
    )
    total = query.count()
    sessions = query.offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for session in sessions:
        parking_lot = db.get(models.ParkingLotDetails, session.parkinglot_id)
        # Safely compute duration
        if session.end_time and session.start_time:
            duration_hours = round(
                abs((session.end_time - session.start_time).total_seconds()) / 3600, 2
            )
        else:
            duration_hours = float(session.duration_hrs) if session.duration_hrs else 0.0

        result.append({
            # Fields matching Android ParkingSession @SerializedName annotations exactly
            "ticket_id": session.ticket_id,
            "user_id": session.user_id,
            "vehicle_id": session.vehicle_id,
            "parkinglot_id": session.parkinglot_id,
            "parking_lot_name": parking_lot.name if parking_lot else None,
            "parking_lot_address": parking_lot.address if parking_lot else None,
            "vehicle_reg_no": session.vehicle_reg_no,
            "vehicle_type": session.vehicle_type,
            "start_time": _fmt_dt(session.start_time),
            "end_time": _fmt_dt(session.end_time),
            "duration_hours": duration_hours,
            "total_amount": float(session.total_amount or 0),
            "payment_status": session.payment_status,
            "payment_method": session.payment_method,
            "status": session.session_status,
            # Extra convenience fields (kept for backward compat)
            "checkin_time": _fmt_dt(session.start_time),
            "checkout_time": _fmt_dt(session.end_time),
        })

    pages = (total + per_page - 1) // per_page if total > 0 else 1
    return {
        "success": True,
        "data": result,
        "pagination": {"page": page, "pages": pages, "per_page": per_page, "total": total},
    }


# ---------------------------------------------------------------------------
# Routes — /user/sessions prefix
# ---------------------------------------------------------------------------

@router.post("/user/sessions/check-in", status_code=201)
def session_checkin(
    body: CheckinRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return checkin_handler(body, user_id, db)


@router.get("/user/sessions/active")
def get_active_sessions(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return get_active_sessions_handler(user_id, db)


@router.get("/user/sessions/history")
def get_session_history(
    page: int = 1,
    per_page: int = 10,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return get_session_history_handler(user_id, page, per_page, db)


@router.post("/user/sessions/checkout")
def session_checkout(
    body: CheckoutRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return checkout_handler(body, user_id, db)


@router.get("/user/sessions/{ticket_id}")
def get_session_details(
    ticket_id: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return get_session_details_handler(ticket_id, user_id, db)


# ---------------------------------------------------------------------------
# Routes — /api/v1/user/sessions prefix
# ---------------------------------------------------------------------------

@router.post("/api/v1/user/sessions/check-in", status_code=201)
def session_checkin_v1(
    body: CheckinRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return checkin_handler(body, user_id, db)


@router.get("/api/v1/user/sessions/active")
def get_active_sessions_v1(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return get_active_sessions_handler(user_id, db)


@router.get("/api/v1/user/sessions/history")
def get_session_history_v1(
    page: int = 1,
    per_page: int = 10,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return get_session_history_handler(user_id, page, per_page, db)


@router.post("/api/v1/user/sessions/checkout")
def session_checkout_v1(
    body: CheckoutRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return checkout_handler(body, user_id, db)
