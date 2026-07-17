"""Admin routes – ported 1-to-1 from Flask admin.py."""
import logging, uuid
from datetime import datetime, timedelta, date as date_cls
from typing import Optional, List, Union

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import setup_logging
from ..database import get_db
from .. import models
from ..auth_utils import require_role

setup_logging()
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class RegisterAdminBody(BaseModel):
    user_name: str; user_email: str; user_password: str
    user_phone_no: str; user_address: str

class AssignLotBody(BaseModel):
    name: str; email: str; password: str
    assigned_lots: Union[int, List[int]]
    phone_no: str; address: str
    role: Optional[str] = "admin"

class AssignExistingLotBody(BaseModel):
    admin_id: int; parking_lot_id: int

class RemoveAssignmentBody(BaseModel):
    admin_id: int
    parking_lot_id: Union[int, List[int]]

class CheckinBody(BaseModel):
    vehicle_reg_no: str; slot_id: int; lot_id: int; vehicle_type: str

class CheckoutBody(BaseModel):
    vehicle_reg_no: str

class ClosureBody(BaseModel):
    payment_made: Optional[float] = 0.0
    date: Optional[str] = None

# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register_admin", status_code=201)
def register_admin(body: RegisterAdminBody, payload: dict=Depends(require_role("super_admin")), db: Session=Depends(get_db)):
    for field in ["user_name","user_email","user_password","user_phone_no","user_address"]:
        if not getattr(body, field, None):
            raise HTTPException(400, detail={"error": f"Field '{field}' is required."})
    if db.query(models.User).filter_by(user_email=body.user_email).first():
        raise HTTPException(409, detail={"error": "An admin with this email already exists."})
    if db.query(models.User).filter_by(user_phone_no=body.user_phone_no).first():
        raise HTTPException(409, detail={"error": "An admin with this phone number already exists."})
    admin = models.User(user_name=body.user_name, user_email=body.user_email,
                        user_phone_no=body.user_phone_no, user_address=body.user_address, role="admin")
    admin.set_password(body.user_password)
    db.add(admin); db.commit(); db.refresh(admin)
    return {"msg": "Admin registered successfully", "role": "admin"}

@router.post("/assign_lot", status_code=201)
def assign_lot(body: AssignLotBody, payload: dict=Depends(require_role("super_admin")), db: Session=Depends(get_db)):
    lot_ids = [int(x) for x in (body.assigned_lots if isinstance(body.assigned_lots, list) else [body.assigned_lots])]
    if not lot_ids:
        raise HTTPException(400, detail={"error": "assigned_lots must be non-empty."})
    if body.role not in ("admin",):
        raise HTTPException(400, detail={"error": "Invalid role. Allowed roles: ['admin']"})
    if db.query(models.User).filter_by(user_email=body.email).first():
        raise HTTPException(409, detail={"error": "An admin with this email already exists."})
    existing = db.query(models.ParkingLotDetails).filter(models.ParkingLotDetails.id.in_(lot_ids)).all()
    if len(existing) != len(lot_ids):
        missing = set(lot_ids) - {l.id for l in existing}
        raise HTTPException(400, detail={"error": f"Parking lot IDs do not exist: {list(missing)}"})
    already = db.query(models.AdminParkingLot).filter(models.AdminParkingLot.parking_lot_id.in_(lot_ids)).all()
    if already:
        raise HTTPException(400, detail={"error": f"Lots already assigned: {[a.parking_lot_id for a in already]}"})
    new_admin = models.User(user_name=body.name, user_email=body.email,
                            user_phone_no=body.phone_no, user_address=body.address, role=body.role)
    new_admin.set_password(body.password)
    db.add(new_admin); db.flush()
    for lid in lot_ids:
        db.add(models.AdminParkingLot(admin_id=new_admin.user_id, parking_lot_id=lid))
    db.commit()
    return {"message": "Admin created successfully", "user_id": new_admin.user_id, "role": body.role, "assigned_lots": lot_ids}

@router.post("/assign_existing_lot", status_code=201)
def assign_existing_lot(body: AssignExistingLotBody, payload: dict=Depends(require_role("super_admin")), db: Session=Depends(get_db)):
    admin = db.query(models.User).filter_by(user_id=body.admin_id, role="admin").first()
    if not admin: raise HTTPException(404, detail={"error": "Admin not found"})
    lot = db.query(models.ParkingLotDetails).filter_by(id=body.parking_lot_id).first()
    if not lot: raise HTTPException(404, detail={"error": "Parking lot not found"})
    if db.query(models.AdminParkingLot).filter_by(admin_id=body.admin_id, parking_lot_id=body.parking_lot_id).first():
        raise HTTPException(409, detail={"error": "Lot already assigned to this admin"})
    db.add(models.AdminParkingLot(admin_id=body.admin_id, parking_lot_id=body.parking_lot_id, assigned_date=datetime.now().date()))
    db.commit()
    return {"message": "Lot assigned successfully", "admin_id": body.admin_id, "parking_lot_id": body.parking_lot_id}

@router.get("/admin_lots/all")
def get_all_admin_lots(payload: dict=Depends(require_role("super_admin")), db: Session=Depends(get_db)):
    rows = (db.query(models.AdminParkingLot, models.User, models.ParkingLotDetails)
            .join(models.User, models.AdminParkingLot.admin_id == models.User.user_id)
            .join(models.ParkingLotDetails, models.AdminParkingLot.parking_lot_id == models.ParkingLotDetails.id)
            .filter(models.User.role == "admin").all())
    grouped = {}
    for apl, user, lot in rows:
        if user.user_id not in grouped:
            grouped[user.user_id] = {
                "user_id": user.user_id, "user_name": user.user_name, "user_email": user.user_email,
                "user_phone_no": user.user_phone_no, "user_address": user.user_address,
                "joining_date": user.created_on.isoformat()+"Z" if user.created_on else None,
                "status": "active", "assigned_lots": []
            }
        grouped[user.user_id]["assigned_lots"].append({
            "parkinglot_id": apl.parking_lot_id, "parking_name": lot.name,
            "location": {"address": lot.address, "landmark": lot.landmark,
                         "coordinates": {"latitude": float(lot.latitude) if lot.latitude else None,
                                         "longitude": float(lot.longitude) if lot.longitude else None}},
            "parking_type": lot.parking_type,
            "assigned_date": apl.assigned_date.isoformat()+"Z" if apl.assigned_date else None,
        })
    data = list(grouped.values())
    return {"meta": {"total": len(data)}, "data": data}

@router.get("/admin_lots/{admin_id}")
def get_lots_for_admin(admin_id: int, payload: dict=Depends(require_role("admin")), db: Session=Depends(get_db)):
    admin = db.query(models.User).filter_by(user_id=admin_id, role="admin").first()
    if not admin: raise HTTPException(404, detail={"error": "Admin not found"})
    rows = (db.query(models.AdminParkingLot, models.ParkingLotDetails)
            .join(models.ParkingLotDetails, models.AdminParkingLot.parking_lot_id == models.ParkingLotDetails.id)
            .filter(models.AdminParkingLot.admin_id == admin_id).all())
    lots = [{
        "parkinglot_id": apl.parking_lot_id, "parking_name": lot.name,
        "location": {"address": lot.address, "landmark": lot.landmark,
                     "coordinates": {"latitude": float(lot.latitude) if lot.latitude else None,
                                     "longitude": float(lot.longitude) if lot.longitude else None}},
        "parking_type": lot.parking_type,
        "assigned_date": apl.assigned_date.isoformat()+"Z" if apl.assigned_date else None,
    } for apl, lot in rows]
    return {"user_id": admin.user_id, "user_name": admin.user_name, "user_email": admin.user_email,
            "user_phone_no": admin.user_phone_no, "user_address": admin.user_address,
            "joining_date": admin.created_on.isoformat()+"Z" if admin.created_on else None,
            "status": "active", "assigned_lots": lots}

@router.delete("/remove_assignment")
def remove_assignment(body: RemoveAssignmentBody, payload: dict=Depends(require_role("super_admin")), db: Session=Depends(get_db)):
    lot_ids = [int(x) for x in (body.parking_lot_id if isinstance(body.parking_lot_id, list) else [body.parking_lot_id])]
    assignments = db.query(models.AdminParkingLot).filter(
        models.AdminParkingLot.admin_id == body.admin_id,
        models.AdminParkingLot.parking_lot_id.in_(lot_ids)).all()
    if not assignments:
        raise HTTPException(404, detail={"msg": "Assignment not found for given admin_id and parking_lot_id(s)"})
    removed = [a.parking_lot_id for a in assignments]
    for a in assignments: db.delete(a)
    db.commit()
    resp = {"msg": "Assignment(s) removed", "removed_parking_lot_ids": removed}
    not_found = list(set(lot_ids) - set(removed))
    if not_found: resp["not_found_parking_lot_ids"] = not_found
    return resp

@router.get("/sessions/details/all")
def get_all_sessions(payload: dict=Depends(require_role("super_admin")), db: Session=Depends(get_db)):
    three_months_ago = datetime.utcnow() - timedelta(days=90)
    sessions = (db.query(models.ParkingSession)
                .filter(models.ParkingSession.start_time != None,
                        models.ParkingSession.start_time >= three_months_ago)
                .order_by(models.ParkingSession.start_time.desc()).all())
    return [{"ticket_id": s.ticket_id, "parkinglot_id": s.parkinglot_id,
             "vehicle_reg_no": s.vehicle_reg_no, "user_id": s.user_id,
             "start_time": s.start_time.isoformat()+"Z" if s.start_time else None,
             "end_time": s.end_time.isoformat()+"Z" if s.end_time else None,
             "duration_hrs": float(s.duration_hrs) if s.duration_hrs else None,
             "amount_paid": float(s.amount_paid) if s.amount_paid else 0,
             "vehicle_type": s.vehicle_type} for s in sessions]

@router.get("/sessions/details/{user_id}")
def get_sessions_for_admin(user_id: int, payload: dict=Depends(require_role("admin")), db: Session=Depends(get_db)):
    admin_id = payload["_current_user"]["user_id"]
    admin = db.query(models.User).filter_by(user_id=admin_id, role="admin").first()
    if not admin: raise HTTPException(404, detail={"error": "Admin not found"})
    admin_lot_ids = [a.parking_lot_id for a in db.query(models.AdminParkingLot).filter_by(admin_id=admin_id).all()]
    if not admin_lot_ids: return []
    three_months_ago = datetime.utcnow() - timedelta(days=90)
    all_sessions = db.query(models.ParkingSession).filter(models.ParkingSession.start_time >= three_months_ago).all()
    result = []
    for s in all_sessions:
        if s.slot_id:
            slot = db.query(models.Slot).filter_by(id=s.slot_id).first()
            if slot and slot.parkinglot_id in admin_lot_ids:
                result.append({"ticket_id": s.ticket_id,
                                "parkinglot_id": slot.parkinglot_id,
                                "vehicle_reg_no": s.vehicle_reg_no, "user_id": s.user_id,
                                "start_time": s.start_time.isoformat()+"Z" if s.start_time else None,
                                "end_time": s.end_time.isoformat()+"Z" if s.end_time else None,
                                "duration_hrs": float(s.duration_hrs) if s.duration_hrs else None,
                                "vehicle_type": s.vehicle_type,
                                "amount_paid": float(s.amount_paid) if s.amount_paid else 0})
    return result

@router.get("/lot_admins/{lot_id}")
def get_admins_for_lot(lot_id: int, payload: dict=Depends(require_role("admin")), db: Session=Depends(get_db)):
    admins = [a.admin_id for a in db.query(models.AdminParkingLot).filter_by(parking_lot_id=lot_id).all()]
    return {"parking_lot_id": lot_id, "admin_ids": admins}

@router.get("/total_due")
def get_total_due(payload: dict=Depends(require_role("admin")), db: Session=Depends(get_db)):
    admin_id = payload["_current_user"]["user_id"]
    today = date_cls.today()
    today_ledger = db.query(models.AdminPaymentLedger).filter_by(admin_id=admin_id, date=today).first()
    prev_ledger = (db.query(models.AdminPaymentLedger)
                   .filter(models.AdminPaymentLedger.admin_id == admin_id,
                           models.AdminPaymentLedger.date < today)
                   .order_by(models.AdminPaymentLedger.date.desc()).first())
    return {"date": today.isoformat(),
            "outstanding_amount": float(prev_ledger.closing_balance) if prev_ledger else 0.0,
            "today_collection": float(today_ledger.today_collection) if today_ledger else 0.0}

@router.post("/session/checkin")
def vehicle_checkin(body: CheckinBody, payload: dict=Depends(require_role("admin")), db: Session=Depends(get_db)):
    slot = db.query(models.Slot).filter_by(id=body.slot_id, parkinglot_id=body.lot_id).first()
    if not slot: raise HTTPException(404, detail={"error": "Slot not found", "status": "failed"})
    if slot.status != 0: raise HTTPException(409, detail={"error": "Slot is already occupied", "status": "failed"})
    active = db.query(models.ParkingSession).filter_by(vehicle_reg_no=body.vehicle_reg_no, end_time=None).first()
    if active: raise HTTPException(409, detail={"error": "Vehicle already has an active parking session", "status": "failed"})
    ticket_id = str(uuid.uuid4())
    session = models.ParkingSession(ticket_id=ticket_id, parkinglot_id=body.lot_id, slot_id=body.slot_id,
                                    vehicle_reg_no=body.vehicle_reg_no, start_time=datetime.utcnow(),
                                    vehicle_type=body.vehicle_type)
    slot.status = 1; slot.vehicle_reg_no = body.vehicle_reg_no; slot.ticket_id = ticket_id
    db.add(session); db.commit()
    return {"session_id": ticket_id}

@router.post("/session/checkout")
def vehicle_checkout(body: CheckoutBody, payload: dict=Depends(require_role("admin")), db: Session=Depends(get_db)):
    session = db.query(models.ParkingSession).filter_by(vehicle_reg_no=body.vehicle_reg_no, end_time=None).first()
    if not session: raise HTTPException(404, detail={"error": "No active session found for this vehicle", "status": "failed"})
    now = datetime.utcnow()
    duration = now - session.start_time
    duration_hours = int(duration.total_seconds() // 3600)
    if duration.total_seconds() % 3600: duration_hours += 1
    lot = db.query(models.ParkingLotDetails).filter_by(id=session.parkinglot_id).first()
    rate_str = (lot.car_parking_charge if session.vehicle_type == "Car" else lot.two_wheeler_parking_charge) if lot else None
    try: rate = float(rate_str.split("/")[0]) if rate_str else 20.0
    except: rate = 20.0
    amount_due = duration_hours * rate
    slot = db.query(models.Slot).filter_by(id=session.slot_id).first()
    session.end_time = now; session.duration_hrs = duration_hours; session.amount_paid = amount_due
    if slot: slot.status = 0; slot.vehicle_reg_no = None; slot.ticket_id = None
    admin_lots = db.query(models.AdminParkingLot).filter_by(parking_lot_id=session.parkinglot_id).all()
    if admin_lots:
        admin_id = admin_lots[0].admin_id
        today = date_cls.today()
        ledger = db.query(models.AdminPaymentLedger).filter_by(admin_id=admin_id, date=today).first()
        if not ledger:
            ledger = models.AdminPaymentLedger(admin_id=admin_id, date=today,
                                               opening_balance=0.0, today_collection=0.0,
                                               payment_made=0.0, closing_balance=0.0)
            db.add(ledger)
        ledger.today_collection = float(ledger.today_collection or 0) + amount_due
    db.commit()
    return {"amount_paid": amount_due, "duration_hours": duration_hours, "checkout_time": session.end_time.isoformat()+"Z"}

@router.post("/closure", status_code=201)
def submit_closure(body: ClosureBody, payload: dict=Depends(require_role("admin")), db: Session=Depends(get_db)):
    admin_id = payload["_current_user"]["user_id"]
    if body.date:
        try: entry_date = date_cls.fromisoformat(body.date)
        except: raise HTTPException(400, detail={"msg": "Invalid date format, use YYYY-MM-DD"})
    else:
        entry_date = date_cls.today()
    ledger = db.query(models.AdminPaymentLedger).filter_by(admin_id=admin_id, date=entry_date).first()
    today_collection = float(ledger.today_collection) if ledger else 0.0
    prev = (db.query(models.AdminPaymentLedger)
            .filter(models.AdminPaymentLedger.admin_id == admin_id,
                    models.AdminPaymentLedger.date < entry_date)
            .order_by(models.AdminPaymentLedger.date.desc()).first())
    opening = float(prev.closing_balance) if prev else 0.0
    closing = opening + today_collection - float(body.payment_made or 0)
    if not ledger:
        ledger = models.AdminPaymentLedger(admin_id=admin_id, date=entry_date,
                                           opening_balance=opening, today_collection=today_collection,
                                           payment_made=body.payment_made or 0, closing_balance=closing)
        db.add(ledger)
    else:
        ledger.opening_balance = opening; ledger.payment_made = body.payment_made or 0; ledger.closing_balance = closing
    db.commit()
    return {"opening_balance": opening, "today_collection": today_collection,
            "payment_made": float(body.payment_made or 0), "closing_balance": closing}

@router.get("/closure")
def get_closure(start_date: Optional[str]=None, end_date: Optional[str]=None,
                payload: dict=Depends(require_role("admin")), db: Session=Depends(get_db)):
    admin_id = payload["_current_user"]["user_id"]
    q = db.query(models.AdminPaymentLedger).filter_by(admin_id=admin_id)
    if start_date:
        try: q = q.filter(models.AdminPaymentLedger.date >= date_cls.fromisoformat(start_date))
        except: raise HTTPException(400, detail={"msg": "Invalid start_date format, use YYYY-MM-DD"})
    if end_date:
        try: q = q.filter(models.AdminPaymentLedger.date <= date_cls.fromisoformat(end_date))
        except: raise HTTPException(400, detail={"msg": "Invalid end_date format, use YYYY-MM-DD"})
    entries = q.order_by(models.AdminPaymentLedger.date.desc()).all()
    return [{"date": e.date.isoformat(), "opening_balance": float(e.opening_balance),
             "today_collection": float(e.today_collection), "payment_made": float(e.payment_made),
             "closing_balance": float(e.closing_balance)} for e in entries]

@router.get("/debug/slots")
def debug_slots(payload: dict=Depends(require_role("admin")), db: Session=Depends(get_db)):
    slots = db.query(models.Slot).all()
    return {"total_slots": len(slots),
            "slots": [{"slot_id": s.id, "parkinglot_id": s.parkinglot_id, "name": s.name, "status": s.status} for s in slots]}

@router.get("/debug/sessions")
def debug_sessions(payload: dict=Depends(require_role("admin")), db: Session=Depends(get_db)):
    admin_id = payload["_current_user"]["user_id"]
    admin = db.query(models.User).filter_by(user_id=admin_id, role="admin").first()
    if not admin: raise HTTPException(404, detail={"error": "Admin not found"})
    admin_lot_ids = [a.parking_lot_id for a in db.query(models.AdminParkingLot).filter_by(admin_id=admin_id).all()]
    total = db.query(models.ParkingSession).count()
    three_months_ago = datetime.utcnow() - timedelta(days=90)
    return {"admin_info": {"admin_id": admin_id, "admin_name": admin.user_name, "admin_email": admin.user_email},
            "assigned_lots": admin_lot_ids,
            "session_counts": {"total_sessions_in_db": total},
            "query_date_range": {"three_months_ago": three_months_ago.isoformat()+"Z",
                                 "current_time": datetime.utcnow().isoformat()+"Z"}}
