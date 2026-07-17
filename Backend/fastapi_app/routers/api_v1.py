"""Extra /api/v1 endpoints – IoT slot update, nearby lots (raw SQL version)."""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import settings, setup_logging
from ..database import get_db
from .. import models

setup_logging()
logger = logging.getLogger(__name__)
router = APIRouter(tags=["API v1"])

class SlotStatusUpdate(BaseModel):
    slot_id: Optional[int] = None
    id: Optional[int] = None
    status: int
    vehicle_reg_no: Optional[str] = None
    ticket_id: Optional[str] = None

@router.get("/api/v1/")
def api_health():
    return {"status": "ok", "success": True}

@router.get("/api/v1/parking/lots/nearby")
def nearby_lots_v1(
    latitude: float = 28.6315,
    longitude: float = 77.2167,
    radius: float = 20000,
    db: Session = Depends(get_db),
):
    try:
        sql = text("""
            SELECT * FROM (
                SELECT parkinglot_id, parking_name, address, landmark, city,
                       latitude, longitude, car_capacity, available_car_slots,
                       two_wheeler_capacity, available_two_wheeler_slots,
                       car_parking_charge, parking_type, parking_timing,
                       has_cctv, has_boom_barrier, vehicle_types,
                       (6371000 * acos(
                           LEAST(1.0, cos(radians(:lat)) * cos(radians(latitude::float)) *
                           cos(radians(longitude::float) - radians(:lng)) +
                           sin(radians(:lat)) * sin(radians(latitude::float)))
                       )) AS distance
                FROM parkinglots_details
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ) subq
            WHERE distance <= :radius
            ORDER BY distance
            LIMIT 100
        """)
        rows = db.execute(sql, {"lat": latitude, "lng": longitude, "radius": radius}).fetchall()
        return {"success": True, "count": len(rows), "data": [{
            "id": r.parkinglot_id, "name": r.parking_name, "address": r.address or "",
            "landmark": r.landmark or "", "city": r.city or "",
            "latitude": float(r.latitude), "longitude": float(r.longitude),
            "total_slots": r.car_capacity or 0, "available_slots": r.available_car_slots or 0,
            "two_wheeler_capacity": r.two_wheeler_capacity or 0,
            "available_two_wheeler_slots": r.available_two_wheeler_slots or 0,
            "price_per_hour": 0, "car_parking_charge": r.car_parking_charge or "N/A",
            "parking_type": r.parking_type or "Unknown", "parking_timing": r.parking_timing or "N/A",
            "has_cctv": r.has_cctv or "No", "has_boom_barrier": r.has_boom_barrier or "No",
            "vehicle_types": r.vehicle_types or "Car", "distance": round(float(r.distance)/1000, 2),
        } for r in rows]}
    except Exception as e:
        logger.error(f"nearby_lots_v1 error: {e}")
        return {"success": False, "error": str(e)}

@router.post("/api/v1/slots/update_status")
def iot_update_slot(
    body: SlotStatusUpdate,
    x_api_key: Optional[str] = Header(None, alias="X-API-KEY"),
    db: Session = Depends(get_db),
):
    if not x_api_key:
        raise HTTPException(401, detail={"success": False, "message": "API key required"})
    if x_api_key != settings.RPI_API_KEY:
        raise HTTPException(401, detail={"success": False, "message": "Invalid API key"})
    slot_id = body.slot_id or body.id
    if slot_id is None or body.status is None:
        raise HTTPException(400, detail={"success": False, "message": "slot_id and status are required"})
    slot = db.get(models.Slot, slot_id)
    if not slot:
        raise HTTPException(404, detail={"success": False, "message": "Slot not found"})
    slot.status = body.status
    slot.vehicle_reg_no = body.vehicle_reg_no
    slot.ticket_id = body.ticket_id
    db.commit()
    return {"success": True, "message": "slot status updated", "slot_id": slot_id, "status": body.status}
