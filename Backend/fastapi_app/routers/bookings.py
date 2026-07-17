"""
Future Parking Bookings — BookMyShow-style advance slot reservation.

Flow:
  1. User picks a parking lot, date, time window, vehicle  →  POST /api/v1/user/bookings
  2. System checks availability, reserves a slot           →  booking_status = confirmed
  3. User arrives and checks in against the booking        →  POST /api/v1/user/bookings/{id}/checkin
  4. User checks out normally                              →  POST /api/v1/user/bookings/{id}/checkout
  5. User can cancel before check-in                       →  DELETE /api/v1/user/bookings/{id}
"""
import logging
import random
import string
from datetime import datetime, timedelta
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

router = APIRouter(tags=["Bookings"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _gen_booking_id() -> str:
    """Generate a short human-readable booking ID like BK-A1B2C3."""
    chars = random.choices(string.ascii_uppercase + string.digits, k=6)
    return "BK-" + "".join(chars)


def _fmt(dt) -> Optional[str]:
    if dt is None:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _hourly_rate(lot: models.ParkingLotDetails, vehicle_type: str) -> float:
    import re
    try:
        txt = lot.car_parking_charge if vehicle_type.lower() == "car" else (
            lot.two_wheeler_parking_charge or lot.car_parking_charge
        )
        if txt:
            nums = re.findall(r"[\u20ac$]?(\d+\.?\d*)", txt)
            if nums:
                return float(nums[0])
    except Exception:
        pass
    return 20.0  # default ₹20/hr


def _booking_to_dict(b: models.ParkingBooking, lot: models.ParkingLotDetails = None) -> dict:
    return {
        "booking_id":        b.booking_id,
        "user_id":           b.user_id,
        "vehicle_id":        b.vehicle_id,
        "parkinglot_id":     b.parkinglot_id,
        "parking_lot_name":  lot.name if lot else None,
        "parking_lot_address": lot.address if lot else None,
        "slot_id":           b.slot_id,
        "scheduled_start":   _fmt(b.scheduled_start),
        "scheduled_end":     _fmt(b.scheduled_end),
        "duration_hours":    float(b.duration_hours),
        "vehicle_type":      b.vehicle_type,
        "vehicle_reg_no":    b.vehicle_reg_no,
        "booking_status":    b.booking_status,
        "estimated_amount":  float(b.estimated_amount),
        "payment_status":    b.payment_status,
        "payment_method":    b.payment_method,
        "created_at":        _fmt(b.created_at),
        "updated_at":        _fmt(b.updated_at),
        "cancelled_at":      _fmt(b.cancelled_at),
        "cancel_reason":     b.cancel_reason,
    }


def _check_slot_availability(
    parkinglot_id: int,
    scheduled_start: datetime,
    scheduled_end: datetime,
    vehicle_type: str,
    db: Session,
    exclude_booking_id: str = None,
) -> Optional[models.Slot]:
    """
    Find a free slot for the requested time window.
    A slot is considered free if:
      - It has no active parking session right now
      - It has no confirmed/pending booking that overlaps the requested window
    """
    # Get all slots for this lot
    all_slots = db.query(models.Slot).filter_by(parkinglot_id=parkinglot_id).all()

    for slot in all_slots:
        # Skip currently occupied slots
        if slot.status == 1:
            continue

        # Check for overlapping bookings on this slot
        overlap_query = db.query(models.ParkingBooking).filter(
            models.ParkingBooking.slot_id == slot.id,
            models.ParkingBooking.booking_status.in_(["confirmed", "checked_in"]),
            models.ParkingBooking.scheduled_start < scheduled_end,
            models.ParkingBooking.scheduled_end > scheduled_start,
        )
        if exclude_booking_id:
            overlap_query = overlap_query.filter(
                models.ParkingBooking.booking_id != exclude_booking_id
            )

        if overlap_query.count() == 0:
            return slot  # This slot is free for the requested window

    return None  # No free slot found


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────────────────────────────────────────

class CreateBookingRequest(BaseModel):
    parkinglot_id:   int
    vehicle_id:      int
    scheduled_start: str   # ISO format: "2026-05-10T14:00:00"
    scheduled_end:   str   # ISO format: "2026-05-10T17:00:00"
    payment_method:  Optional[str] = "card"


class CheckoutBookingRequest(BaseModel):
    payment_method: Optional[str] = "card"


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/v1/user/bookings", status_code=201)
def create_booking(
    body: CreateBookingRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Create a future parking booking (BookMyShow-style)."""

    # Parse times
    try:
        sched_start = datetime.fromisoformat(body.scheduled_start)
        sched_end   = datetime.fromisoformat(body.scheduled_end)
    except ValueError:
        raise HTTPException(400, detail={"success": False, "error": "Invalid datetime format"})

    # Validations
    now = datetime.utcnow()
    # Allow booking start up to 15 minutes in the past (for "book now" use case)
    if sched_start < now - timedelta(minutes=15):
        raise HTTPException(400, detail={"success": False, "error": "Booking start time cannot be more than 15 minutes in the past"})
    if sched_end <= sched_start:
        raise HTTPException(400, detail={"success": False, "error": "End time must be after start time"})

    duration_hrs = (sched_end - sched_start).total_seconds() / 3600
    if duration_hrs < 0.5:
        raise HTTPException(400, detail={"success": False, "error": "Minimum booking duration is 30 minutes"})
    if duration_hrs > 24:
        raise HTTPException(400, detail={"success": False, "error": "Maximum booking duration is 24 hours"})

    # Validate booking is not more than 30 days in advance
    if sched_start > now + timedelta(days=30):
        raise HTTPException(400, detail={"success": False, "error": "Cannot book more than 30 days in advance"})

    # Validate vehicle belongs to user
    vehicle = db.query(models.UserVehicle).filter_by(
        vehicle_id=body.vehicle_id, user_id=user_id, is_active=True
    ).first()
    if not vehicle:
        raise HTTPException(404, detail={"success": False, "error": "Vehicle not found"})

    # Validate parking lot exists
    lot = db.query(models.ParkingLotDetails).filter_by(id=body.parkinglot_id).first()
    if not lot:
        raise HTTPException(404, detail={"success": False, "error": "Parking lot not found"})

    # Check user doesn't already have a booking at this lot for overlapping time
    existing = db.query(models.ParkingBooking).filter(
        models.ParkingBooking.user_id == user_id,
        models.ParkingBooking.parkinglot_id == body.parkinglot_id,
        models.ParkingBooking.booking_status.in_(["confirmed", "checked_in"]),
        models.ParkingBooking.scheduled_start < sched_end,
        models.ParkingBooking.scheduled_end > sched_start,
    ).first()
    if existing:
        raise HTTPException(409, detail={
            "success": False,
            "error": f"You already have a booking at this lot for that time window (ID: {existing.booking_id})"
        })

    # Find an available slot
    slot = _check_slot_availability(
        body.parkinglot_id, sched_start, sched_end, vehicle.vehicle_type, db
    )
    if not slot:
        raise HTTPException(409, detail={"success": False, "error": "No slots available for the requested time window"})

    # Calculate estimated cost
    rate = _hourly_rate(lot, vehicle.vehicle_type)
    estimated_amount = round(duration_hrs * rate, 2)

    # Create booking
    booking_id = _gen_booking_id()
    # Ensure uniqueness
    while db.query(models.ParkingBooking).filter_by(booking_id=booking_id).first():
        booking_id = _gen_booking_id()

    booking = models.ParkingBooking(
        booking_id       = booking_id,
        user_id          = user_id,
        vehicle_id       = body.vehicle_id,
        parkinglot_id    = body.parkinglot_id,
        slot_id          = slot.id,
        scheduled_start  = sched_start,
        scheduled_end    = sched_end,
        duration_hours   = round(duration_hrs, 2),
        vehicle_type     = vehicle.vehicle_type,
        vehicle_reg_no   = vehicle.registration_number,
        booking_status   = "confirmed",
        estimated_amount = estimated_amount,
        payment_status   = "pending",
        payment_method   = body.payment_method,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    logger.info(f"Booking {booking_id} created for user {user_id}, lot {body.parkinglot_id}, slot {slot.id}")

    return {
        "success": True,
        "message": "Parking slot booked successfully",
        "data": _booking_to_dict(booking, lot),
    }


@router.get("/api/v1/user/bookings")
def get_my_bookings(
    status: Optional[str] = None,   # filter: confirmed | checked_in | completed | cancelled
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get all bookings for the logged-in user."""
    query = db.query(models.ParkingBooking).filter_by(user_id=user_id)
    if status:
        query = query.filter(models.ParkingBooking.booking_status == status)
    bookings = query.order_by(models.ParkingBooking.scheduled_start.desc()).all()

    result = []
    for b in bookings:
        lot = db.get(models.ParkingLotDetails, b.parkinglot_id)
        result.append(_booking_to_dict(b, lot))

    return {"success": True, "data": result, "count": len(result)}


@router.get("/api/v1/user/bookings/upcoming")
def get_upcoming_bookings(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get upcoming (future) confirmed bookings."""
    now = datetime.utcnow()
    bookings = db.query(models.ParkingBooking).filter(
        models.ParkingBooking.user_id == user_id,
        models.ParkingBooking.booking_status == "confirmed",
        models.ParkingBooking.scheduled_start > now,
    ).order_by(models.ParkingBooking.scheduled_start.asc()).all()

    result = []
    for b in bookings:
        lot = db.get(models.ParkingLotDetails, b.parkinglot_id)
        result.append(_booking_to_dict(b, lot))

    return {"success": True, "data": result, "count": len(result)}


@router.get("/api/v1/user/bookings/{booking_id}")
def get_booking_detail(
    booking_id: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get details of a specific booking."""
    booking = db.query(models.ParkingBooking).filter_by(
        booking_id=booking_id, user_id=user_id
    ).first()
    if not booking:
        raise HTTPException(404, detail={"success": False, "error": "Booking not found"})

    lot = db.get(models.ParkingLotDetails, booking.parkinglot_id)
    return {"success": True, "data": _booking_to_dict(booking, lot)}


@router.post("/api/v1/user/bookings/{booking_id}/checkin")
def checkin_booking(
    booking_id: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Check in against a confirmed booking.
    Creates a real ParkingSession linked to the booking's reserved slot.
    """
    booking = db.query(models.ParkingBooking).filter_by(
        booking_id=booking_id, user_id=user_id
    ).first()
    if not booking:
        raise HTTPException(404, detail={"success": False, "error": "Booking not found"})
    if booking.booking_status != "confirmed":
        raise HTTPException(409, detail={
            "success": False,
            "error": f"Cannot check in — booking status is '{booking.booking_status}'"
        })

    # Allow check-in anytime from booking creation up to the booking end time
    # (no early/late restriction — user arrives when they arrive)
    now = datetime.utcnow()
    if now > booking.scheduled_end:
        raise HTTPException(400, detail={
            "success": False,
            "error": f"Booking has expired. Your booking window ended at {_fmt(booking.scheduled_end)}"
        })

    # Get the reserved slot
    slot = db.get(models.Slot, booking.slot_id)
    if not slot:
        raise HTTPException(500, detail={"success": False, "error": "Reserved slot not found"})

    # Create a real parking session
    import uuid as _uuid
    ticket_id = f"BK-{booking_id}-{str(_uuid.uuid4())[:4].upper()}"

    session = models.ParkingSession(
        ticket_id      = ticket_id,
        user_id        = user_id,
        vehicle_id     = booking.vehicle_id,
        parkinglot_id  = booking.parkinglot_id,
        slot_id        = booking.slot_id,
        vehicle_reg_no = booking.vehicle_reg_no,
        vehicle_type   = booking.vehicle_type,
        start_time     = now,
        session_status = "active",
        payment_status = "pending",
    )

    # Mark slot as occupied
    slot.status = 1
    slot.vehicle_reg_no = booking.vehicle_reg_no
    slot.ticket_id = ticket_id

    # Update booking status
    booking.booking_status = "checked_in"
    booking.updated_at = now

    db.add(session)
    db.commit()

    lot = db.get(models.ParkingLotDetails, booking.parkinglot_id)
    logger.info(f"Booking {booking_id} checked in — session {ticket_id} created")

    return {
        "success": True,
        "message": "Checked in successfully against your booking",
        "data": {
            "booking_id":      booking_id,
            "ticket_id":       ticket_id,
            "parking_lot_name": lot.name if lot else None,
            "slot_location":   f"Slot {slot.name}",
            "start_time":      _fmt(now),
            "status":          "active",
        },
    }


@router.post("/api/v1/user/bookings/{booking_id}/checkout")
def checkout_booking(
    booking_id: str,
    body: CheckoutBookingRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Check out from a booking that has been checked in."""
    booking = db.query(models.ParkingBooking).filter_by(
        booking_id=booking_id, user_id=user_id
    ).first()
    if not booking:
        raise HTTPException(404, detail={"success": False, "error": "Booking not found"})
    if booking.booking_status != "checked_in":
        raise HTTPException(409, detail={
            "success": False,
            "error": f"Cannot check out — booking status is '{booking.booking_status}'"
        })

    # Find the active session for this booking's slot
    session = db.query(models.ParkingSession).filter(
        models.ParkingSession.user_id == user_id,
        models.ParkingSession.slot_id == booking.slot_id,
        models.ParkingSession.session_status == "active",
    ).first()

    now = datetime.utcnow()
    total_amount = 0.0

    if session:
        duration_hrs = (now - session.start_time).total_seconds() / 3600
        lot = db.get(models.ParkingLotDetails, booking.parkinglot_id)
        rate = _hourly_rate(lot, booking.vehicle_type) if lot else 20.0
        total_amount = round(duration_hrs * rate, 2)

        session.end_time       = now
        session.total_amount   = total_amount
        session.payment_status = "completed"
        session.session_status = "completed"
        session.payment_method = body.payment_method

    # Free the slot
    slot = db.get(models.Slot, booking.slot_id)
    if slot:
        slot.status = 0
        slot.vehicle_reg_no = None
        slot.ticket_id = None

    # Complete the booking
    booking.booking_status = "completed"
    booking.payment_status = "paid"
    booking.payment_method = body.payment_method
    booking.updated_at = now

    db.commit()
    logger.info(f"Booking {booking_id} checked out — amount ₹{total_amount}")

    return {
        "success": True,
        "message": "Checked out successfully",
        "data": {
            "booking_id":     booking_id,
            "total_amount":   total_amount,
            "payment_status": "paid",
            "payment_method": body.payment_method,
            "checkout_time":  _fmt(now),
        },
    }


@router.delete("/api/v1/user/bookings/{booking_id}")
def cancel_booking(
    booking_id: str,
    reason: Optional[str] = None,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Cancel a confirmed booking (not allowed after check-in)."""
    booking = db.query(models.ParkingBooking).filter_by(
        booking_id=booking_id, user_id=user_id
    ).first()
    if not booking:
        raise HTTPException(404, detail={"success": False, "error": "Booking not found"})
    if booking.booking_status not in ("confirmed",):
        raise HTTPException(409, detail={
            "success": False,
            "error": f"Cannot cancel — booking status is '{booking.booking_status}'"
        })

    now = datetime.utcnow()
    booking.booking_status = "cancelled"
    booking.cancelled_at   = now
    booking.cancel_reason  = reason or "Cancelled by user"
    booking.payment_status = "refunded" if booking.payment_status == "paid" else "cancelled"
    booking.updated_at     = now

    db.commit()
    logger.info(f"Booking {booking_id} cancelled by user {user_id}")

    return {
        "success": True,
        "message": "Booking cancelled successfully",
        "data": {"booking_id": booking_id, "booking_status": "cancelled"},
    }


@router.get("/api/v1/parking/lots/{lot_id}/availability")
def get_lot_availability(
    lot_id: int,
    date: str,           # YYYY-MM-DD
    start_time: str,     # HH:MM
    end_time: str,       # HH:MM
    vehicle_type: str = "car",
    db: Session = Depends(get_db),
):
    """
    Check how many slots are available at a parking lot for a given time window.
    Used by the Android booking screen to show availability before booking.
    """
    try:
        sched_start = datetime.fromisoformat(f"{date}T{start_time}:00")
        sched_end   = datetime.fromisoformat(f"{date}T{end_time}:00")
    except ValueError:
        raise HTTPException(400, detail={"success": False, "error": "Invalid date/time format"})

    if sched_end <= sched_start:
        raise HTTPException(400, detail={"success": False, "error": "End time must be after start time"})

    lot = db.get(models.ParkingLotDetails, lot_id)
    if not lot:
        raise HTTPException(404, detail={"success": False, "error": "Parking lot not found"})

    total_slots = db.query(models.Slot).filter_by(parkinglot_id=lot_id).count()

    # Count slots that are booked for this window
    booked_slot_ids = db.query(models.ParkingBooking.slot_id).filter(
        models.ParkingBooking.parkinglot_id == lot_id,
        models.ParkingBooking.booking_status.in_(["confirmed", "checked_in"]),
        models.ParkingBooking.scheduled_start < sched_end,
        models.ParkingBooking.scheduled_end > sched_start,
    ).distinct().all()
    booked_count = len(booked_slot_ids)

    # Also count currently occupied slots
    occupied_now = db.query(models.Slot).filter_by(parkinglot_id=lot_id, status=1).count()

    available = max(0, total_slots - booked_count - occupied_now)
    rate = _hourly_rate(lot, vehicle_type)
    duration_hrs = (sched_end - sched_start).total_seconds() / 3600
    estimated_cost = round(duration_hrs * rate, 2)

    return {
        "success": True,
        "data": {
            "parkinglot_id":   lot_id,
            "parking_lot_name": lot.name,
            "date":            date,
            "start_time":      start_time,
            "end_time":        end_time,
            "total_slots":     total_slots,
            "booked_slots":    booked_count,
            "occupied_slots":  occupied_now,
            "available_slots": available,
            "is_available":    available > 0,
            "hourly_rate":     rate,
            "estimated_cost":  estimated_cost,
            "duration_hours":  round(duration_hrs, 2),
        },
    }
