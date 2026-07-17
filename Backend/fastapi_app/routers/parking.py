"""Parking lot routes – ported 1-to-1 from Flask parking.py."""
import logging, math, re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import setup_logging
from ..database import get_db
from .. import models
from ..auth_utils import get_current_user_id, require_role

setup_logging()
logger = logging.getLogger(__name__)
router = APIRouter(tags=["Parking"])

# ── helpers ──────────────────────────────────────────────────────────────────

def _dist(lat1, lon1, lat2, lon2):
    lat1,lon1,lat2,lon2 = map(math.radians,[lat1,lon1,lat2,lon2])
    dlat,dlon = lat2-lat1, lon2-lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return 2*math.asin(math.sqrt(a))*6371000

def _avail(lot_id, db):
    return db.query(models.Slot).filter_by(parkinglot_id=lot_id, status=0).count()

def _avail_status(n):
    return "full" if n==0 else ("limited" if n<=3 else "available")

def _rate(lot, vtype="car"):
    try:
        txt = lot.car_parking_charge if vtype.lower()=="car" else (lot.two_wheeler_parking_charge or lot.car_parking_charge)
        if txt:
            nums = re.findall(r"[\u20ac$]?(\d+\.?\d*)", txt)
            if nums: return float(nums[0])
    except Exception: pass
    return 2.50

def _open(timing):
    if not timing: return True
    return "24" in timing.lower() or "always" in timing.lower() or True

def _op_hours(timing):
    if not timing:
        return {"is_24x7":False,"opening_time":"06:00","closing_time":"22:00","weekly_off":"None","timing_text":"Not specified"}
    if "24" in timing.lower() or "always" in timing.lower():
        return {"is_24x7":True,"opening_time":"00:00","closing_time":"23:59","weekly_off":"None","timing_text":"Open 24/7"}
    ot,ct = "06:00","22:00"
    tp = re.findall(r"(\d{1,2}):?(\d{0,2})\s*(AM|PM)?", timing.upper())
    if len(tp)>=2:
        h1,m1,p1=tp[0]; h2,m2,p2=tp[1]
        if p1=="PM" and int(h1)!=12: h1=str(int(h1)+12)
        elif p1=="AM" and int(h1)==12: h1="00"
        if p2=="PM" and int(h2)!=12: h2=str(int(h2)+12)
        elif p2=="AM" and int(h2)==12: h2="00"
        ot=f"{h1.zfill(2)}:{m1.zfill(2) if m1 else '00'}"
        ct=f"{h2.zfill(2)}:{m2.zfill(2) if m2 else '00'}"
    return {"is_24x7":False,"opening_time":ot,"closing_time":ct,"weekly_off":"None","timing_text":timing}

def _veh_price(txt, vtype):
    defs={"car":{"hourly_rate":2.50,"daily_max":20.0},"two_wheeler":{"hourly_rate":1.50,"daily_max":12.0}}
    try:
        if not txt: return {**defs.get(vtype,defs["car"]),"currency":"EUR","pricing_text":"Standard rates"}
        nums=re.findall(r"[\u20ac$]?(\d+\.?\d*)",txt)
        info={"currency":"EUR","pricing_text":txt}
        if nums:
            info["hourly_rate"]=float(nums[0])
            info["daily_max"]=float(nums[1]) if len(nums)>1 else float(nums[0])*8
        else:
            info["hourly_rate"]=2.50 if vtype=="car" else 1.50
            info["daily_max"]=20.0 if vtype=="car" else 12.0
        return info
    except Exception:
        return {**defs.get(vtype,defs["car"]),"currency":"EUR","pricing_text":txt or "Standard rates"}

def _pricing(lot):
    return {
        "car_pricing":_veh_price(lot.car_parking_charge,"car"),
        "two_wheeler_pricing":_veh_price(lot.two_wheeler_parking_charge,"two_wheeler"),
        "payment_modes":lot.payment_modes.split(",") if lot.payment_modes else ["Cash","Card"],
        "allows_prepaid_passes": lot.allows_prepaid_passes=="Yes" if lot.allows_prepaid_passes else False,
    }

def _facilities(lot):
    cctv = lot.has_cctv=="Yes" if lot.has_cctv else False
    boom = lot.has_boom_barrier=="Yes" if lot.has_boom_barrier else False
    feats=[]
    if cctv: feats.append("CCTV Surveillance")
    if boom: feats.append("Boom Barrier")
    return {
        "security":{"has_cctv":cctv,"has_boom_barrier":boom,"security_features":feats},
        "services":{
            "provides_valet_services": lot.provides_valet_services=="Yes" if lot.provides_valet_services else False,
            "ticket_generated": lot.ticket_generated=="Yes" if lot.ticket_generated else False,
            "value_added_services": lot.value_added_services.split(",") if lot.value_added_services else [],
        },
        "infrastructure":{
            "parking_surface": lot.parking_surface or "Not specified",
            "entry_exit_gates": lot.entry_exit_gates or "Standard gates",
            "physical_appearance": lot.physical_appearance or "Standard parking lot",
        },
    }

def _lot_summary(lot):
    return {
        "id":lot.id,"parkinglot_id":lot.id,"name":lot.name,"city":lot.city,
        "landmark":lot.landmark,"address":lot.address,
        "latitude":float(lot.latitude) if lot.latitude else None,
        "longitude":float(lot.longitude) if lot.longitude else None,
        "physical_appearance":lot.physical_appearance,"parking_ownership":lot.parking_ownership,
        "parking_surface":lot.parking_surface,"has_cctv":lot.has_cctv,
        "has_boom_barrier":lot.has_boom_barrier,"ticket_generated":lot.ticket_generated,
        "entry_exit_gates":lot.entry_exit_gates,"weekly_off":lot.weekly_off,
        "parking_timing":lot.parking_timing,"vehicle_types":lot.vehicle_types,
        "car_capacity":lot.car_capacity,"available_car_slots":lot.available_car_slots,
        "two_wheeler_capacity":lot.two_wheeler_capacity,
        "available_two_wheeler_slots":lot.available_two_wheeler_slots,
        "parking_type":lot.parking_type,"payment_modes":lot.payment_modes,
        "car_parking_charge":lot.car_parking_charge,
        "two_wheeler_parking_charge":lot.two_wheeler_parking_charge,
        "allows_prepaid_passes":lot.allows_prepaid_passes,
        "provides_valet_services":lot.provides_valet_services,
        "value_added_services":lot.value_added_services,
    }

def _lot_detail(lot):
    d = _lot_summary(lot)
    d["floors"] = [_floor_dict(f) for f in lot.floors]
    return d

def _slot_dict(s):
    return {"id":s.id,"name":s.name,"status":s.status,"vehicle_reg_no":s.vehicle_reg_no,
            "ticket_id":s.ticket_id,"row_id":s.row_id,"floor_id":s.floor_id,"parkinglot_id":s.parkinglot_id}

def _row_dict(r):
    return {"id":r.id,"name":r.name,"floor_id":r.floor_id,"parkinglot_id":r.parkinglot_id,
            "slots":[_slot_dict(s) for s in r.slots]}

def _floor_dict(f):
    return {"id":f.id,"name":f.name,"parkinglot_id":f.parkinglot_id,
            "rows":[_row_dict(r) for r in f.rows]}

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class LotCreate(BaseModel):
    name: Optional[str]=None; city: Optional[str]=None; landmark: Optional[str]=None
    address: Optional[str]=None; latitude: Optional[float]=None; longitude: Optional[float]=None
    physical_appearance: Optional[str]=None; parking_ownership: Optional[str]=None
    parking_surface: Optional[str]=None; has_cctv: Optional[str]=None
    has_boom_barrier: Optional[str]=None; ticket_generated: Optional[str]=None
    entry_exit_gates: Optional[str]=None; weekly_off: Optional[str]=None
    parking_timing: Optional[str]=None; vehicle_types: Optional[str]=None
    car_capacity: Optional[int]=None; available_car_slots: Optional[int]=None
    two_wheeler_capacity: Optional[int]=None; available_two_wheeler_slots: Optional[int]=None
    parking_type: Optional[str]=None; payment_modes: Optional[str]=None
    car_parking_charge: Optional[str]=None; two_wheeler_parking_charge: Optional[str]=None
    allows_prepaid_passes: Optional[str]=None; provides_valet_services: Optional[str]=None
    value_added_services: Optional[str]=None

class FloorCreate(BaseModel):
    name: str

class RowCreate(BaseModel):
    name: str

class SlotCreate(BaseModel):
    name: str
    status: Optional[int]=0

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/parking/lots/nearby")
def get_nearby_lots(
    latitude: Optional[float]=None, longitude: Optional[float]=None,
    radius: int=3000, max_price: Optional[float]=None,
    min_availability: Optional[int]=None, vehicle_type: str="car",
    payload: dict=Depends(require_role("user")),
    db: Session=Depends(get_db),
):
    if latitude is None or longitude is None:
        raise HTTPException(400, detail={"success":False,"error":"Latitude and longitude are required"})
    if radius<=0 or radius>50000:
        raise HTTPException(400, detail={"success":False,"error":"Radius must be between 1 and 50000 meters"})
    lots = db.query(models.ParkingLotDetails).all()
    results=[]
    for lot in lots:
        if not lot.latitude or not lot.longitude: continue
        dist = _dist(latitude, longitude, float(lot.latitude), float(lot.longitude))
        if dist > radius: continue
        avail = _avail(lot.id, db)
        if min_availability and avail < min_availability: continue
        hr = _rate(lot, vehicle_type)
        if max_price and hr > max_price: continue
        results.append({
            "id":lot.id,"parkinglot_id":lot.id,
            "name":lot.name or f"Parking Lot {lot.id}",
            "address":lot.address or "Address not available",
            "city":lot.city or "New Delhi",
            "landmark":lot.landmark or "Landmark not available",
            "latitude":float(lot.latitude),"longitude":float(lot.longitude),
            "distance":round(dist/1000,2),
            "car_capacity":lot.car_capacity or 0,
            "available_car_slots":avail if vehicle_type.lower()=="car" else (lot.available_car_slots or 0),
            "two_wheeler_capacity":lot.two_wheeler_capacity or 0,
            "available_two_wheeler_slots":avail if vehicle_type.lower() in ("bike","motorcycle","two_wheeler") else (lot.available_two_wheeler_slots or 0),
            "car_fee":lot.car_parking_charge or "Free",
            "two_wheeler_fee":lot.two_wheeler_parking_charge or "Free",
            "payment_mode":lot.payment_modes or "Cash",
            "parking_type":lot.parking_type or "Free",
            "has_cctv":lot.has_cctv=="Yes" if lot.has_cctv else False,
            "has_boom_barrier":lot.has_boom_barrier=="Yes" if lot.has_boom_barrier else False,
            "ticket_generated":lot.ticket_generated or "No ticket",
            "entry_exit_gates":lot.entry_exit_gates or "Standard gates",
            "weekly_off":lot.weekly_off or "Open All Days",
            "parking_timing":lot.parking_timing or "24x7",
            "vehicle_types":lot.vehicle_types or "Car, 2 Wheelers",
            "allows_prepaid_passes":lot.allows_prepaid_passes or "No",
            "provides_valet_services":lot.provides_valet_services or "No",
            "value_added_services":lot.value_added_services or "No",
            "total_car_slots":lot.car_capacity or 0,
            "total_two_wheeler_slots":lot.two_wheeler_capacity or 0,
            "availability":avail,"availability_status":_avail_status(avail),
            "hourly_rate":hr,"is_open":_open(lot.parking_timing),
        })
    results.sort(key=lambda x: x["distance"])
    return {"success":True,"data":results,"total_count":len(results),
            "search_params":{"latitude":latitude,"longitude":longitude,"radius":radius,
                             "vehicle_type":vehicle_type,"max_price":max_price,"min_availability":min_availability}}

@router.post("/parking/lots", status_code=201)
def create_lot(body: LotCreate, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    lot = models.ParkingLotDetails(**body.model_dump(exclude_none=True))
    db.add(lot); db.commit(); db.refresh(lot)
    return _lot_summary(lot)

@router.get("/parking/lots")
def list_lots(payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    return [_lot_summary(l) for l in db.query(models.ParkingLotDetails).all()]

@router.get("/parking/lots/{lot_id}")
def get_lot(lot_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    lot = db.get(models.ParkingLotDetails, lot_id)
    if not lot: raise HTTPException(404, detail={"error":"Parking lot not found"})
    return _lot_detail(lot)

@router.get("/parking/lots/{lot_id}/details")
def get_lot_details(lot_id: int, vehicle_type: str="car",
                    user_id: int=Depends(get_current_user_id), db: Session=Depends(get_db)):
    lot = db.get(models.ParkingLotDetails, lot_id)
    if not lot: raise HTTPException(404, detail={"success":False,"error":"Parking lot not found"})
    total = db.query(models.Slot).filter_by(parkinglot_id=lot_id).count()
    avail = _avail(lot_id, db)
    occ = total - avail
    op_hours = _op_hours(lot.parking_timing)
    op_hours["weekly_off"] = lot.weekly_off or "None"
    return {"success":True,"data":{
        "parkinglot_id":lot.id,"name":lot.name,"address":lot.address,"city":lot.city,
        "landmark":lot.landmark,
        "latitude":float(lot.latitude) if lot.latitude else None,
        "longitude":float(lot.longitude) if lot.longitude else None,
        "description":lot.physical_appearance,
        "operating_hours":op_hours,
        "pricing_tiers":_pricing(lot),
        "capacity_info":{
            "total_capacity":total,"car_capacity":lot.car_capacity or 0,
            "two_wheeler_capacity":lot.two_wheeler_capacity or 0,
            "available_car_slots":lot.available_car_slots or avail if vehicle_type=="car" else None,
            "available_two_wheeler_slots":lot.available_two_wheeler_slots or avail if vehicle_type in ("bike","motorcycle","two_wheeler") else None,
        },
        "real_time_availability":{
            "total_slots":total,"available_slots":avail,"occupied_slots":occ,
            "availability_status":_avail_status(avail),
            "availability_percentage":round(avail/total*100 if total>0 else 0,1),
            "last_updated":datetime.utcnow().isoformat(),
            "is_currently_open":_open(lot.parking_timing),
        },
        "facilities":_facilities(lot),
        "parking_type":lot.parking_type,"parking_surface":lot.parking_surface,
        "parking_ownership":lot.parking_ownership,
        "vehicle_types_supported":lot.vehicle_types.split(",") if lot.vehicle_types else ["car"],
        "structure_info":{"total_floors":len(lot.floors),"floor_names":[f.name for f in lot.floors]},
    }}

@router.get("/parking/lots/{lot_id}/stats")
def lot_stats(lot_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    if not db.get(models.ParkingLotDetails, lot_id):
        raise HTTPException(404, detail={"error":"Parking lot not found"})
    total = db.query(models.Slot).filter_by(parkinglot_id=lot_id).count()
    avail = db.query(models.Slot).filter_by(parkinglot_id=lot_id, status=0).count()
    return {"parkinglot_id":lot_id,"total_slots":total,"available_slots":avail,"occupied_slots":total-avail}

@router.put("/parking/lots/{lot_id}")
def update_lot(lot_id: int, body: LotCreate, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    lot = db.get(models.ParkingLotDetails, lot_id)
    if not lot: raise HTTPException(404, detail={"error":"Parking lot not found"})
    for k,v in body.model_dump(exclude_none=True).items():
        setattr(lot, k, v)
    db.commit(); db.refresh(lot)
    return _lot_summary(lot)

@router.delete("/parking/lots/{lot_id}")
def delete_lot(lot_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    lot = db.get(models.ParkingLotDetails, lot_id)
    if not lot: raise HTTPException(404, detail={"error":"Parking lot not found"})
    db.delete(lot); db.commit()
    return {"message":"Parking lot deleted successfully"}

# ── Floors ────────────────────────────────────────────────────────────────────

@router.post("/parking/lots/{lot_id}/floors", status_code=201)
def create_floor(lot_id: int, body: FloorCreate, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    if not db.get(models.ParkingLotDetails, lot_id):
        raise HTTPException(404, detail={"error":"Parking lot not found"})
    f = models.Floor(name=body.name, parkinglot_id=lot_id)
    db.add(f); db.commit(); db.refresh(f)
    return {"id":f.id,"name":f.name,"parkinglot_id":f.parkinglot_id,"rows":[]}

@router.get("/parking/lots/{lot_id}/floors")
def list_floors(lot_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    lot = db.get(models.ParkingLotDetails, lot_id)
    if not lot: raise HTTPException(404, detail={"error":"Parking lot not found"})
    return [_floor_dict(f) for f in lot.floors]

@router.get("/parking/floors/{floor_id}")
def get_floor(floor_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    f = db.get(models.Floor, floor_id)
    if not f: raise HTTPException(404, detail={"error":"Floor not found"})
    return _floor_dict(f)

@router.put("/parking/floors/{floor_id}")
def update_floor(floor_id: int, body: FloorCreate, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    f = db.get(models.Floor, floor_id)
    if not f: raise HTTPException(404, detail={"error":"Floor not found"})
    f.name = body.name; db.commit(); db.refresh(f)
    return _floor_dict(f)

@router.delete("/parking/floors/{floor_id}")
def delete_floor(floor_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    f = db.get(models.Floor, floor_id)
    if not f: raise HTTPException(404, detail={"error":"Floor not found"})
    db.delete(f); db.commit()
    return {"message":"Floor deleted successfully"}

# ── Rows ──────────────────────────────────────────────────────────────────────

@router.post("/parking/floors/{floor_id}/rows", status_code=201)
def create_row(floor_id: int, body: RowCreate, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    f = db.get(models.Floor, floor_id)
    if not f: raise HTTPException(404, detail={"error":"Floor not found"})
    r = models.Row(name=body.name, floor_id=floor_id, parkinglot_id=f.parkinglot_id)
    db.add(r); db.commit(); db.refresh(r)
    return _row_dict(r)

@router.get("/parking/floors/{floor_id}/rows")
def list_rows(floor_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    f = db.get(models.Floor, floor_id)
    if not f: raise HTTPException(404, detail={"error":"Floor not found"})
    return [_row_dict(r) for r in f.rows]

@router.get("/parking/rows/{row_id}")
def get_row(row_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    r = db.get(models.Row, row_id)
    if not r: raise HTTPException(404, detail={"error":"Row not found"})
    return _row_dict(r)

@router.put("/parking/rows/{row_id}")
def update_row(row_id: int, body: RowCreate, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    r = db.get(models.Row, row_id)
    if not r: raise HTTPException(404, detail={"error":"Row not found"})
    r.name = body.name; db.commit(); db.refresh(r)
    return _row_dict(r)

@router.delete("/parking/rows/{row_id}")
def delete_row(row_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    r = db.get(models.Row, row_id)
    if not r: raise HTTPException(404, detail={"error":"Row not found"})
    db.delete(r); db.commit()
    return {"message":"Row deleted successfully"}

# ── Slots ─────────────────────────────────────────────────────────────────────

@router.post("/parking/rows/{row_id}/slots", status_code=201)
def create_slot(row_id: int, body: SlotCreate, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    r = db.get(models.Row, row_id)
    if not r: raise HTTPException(404, detail={"error":"Row not found"})
    s = models.Slot(name=body.name, status=body.status or 0, row_id=row_id, floor_id=r.floor_id, parkinglot_id=r.parkinglot_id)
    db.add(s); db.commit(); db.refresh(s)
    return _slot_dict(s)

@router.get("/parking/rows/{row_id}/slots")
def list_slots(row_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    r = db.get(models.Row, row_id)
    if not r: raise HTTPException(404, detail={"error":"Row not found"})
    return [_slot_dict(s) for s in r.slots]

@router.get("/parking/slots/{slot_id}")
def get_slot(slot_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    s = db.get(models.Slot, slot_id)
    if not s: raise HTTPException(404, detail={"error":"Slot not found"})
    return _slot_dict(s)

@router.put("/parking/slots/{slot_id}")
def update_slot(slot_id: int, body: SlotCreate, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    s = db.get(models.Slot, slot_id)
    if not s: raise HTTPException(404, detail={"error":"Slot not found"})
    s.name = body.name
    if body.status is not None: s.status = body.status
    db.commit(); db.refresh(s)
    return _slot_dict(s)

@router.delete("/parking/slots/{slot_id}")
def delete_slot(slot_id: int, payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    s = db.get(models.Slot, slot_id)
    if not s: raise HTTPException(404, detail={"error":"Slot not found"})
    db.delete(s); db.commit()
    return {"message":"Slot deleted successfully"}

@router.get("/parking/lots/bulk-stats")
def bulk_stats(payload: dict=Depends(require_role("user")), db: Session=Depends(get_db)):
    lots = db.query(models.ParkingLotDetails).all()
    result=[]
    for lot in lots:
        total = db.query(models.Slot).filter_by(parkinglot_id=lot.id).count()
        avail = db.query(models.Slot).filter_by(parkinglot_id=lot.id, status=0).count()
        result.append({"parkinglot_id":lot.id,"name":lot.name,"total_slots":total,
                        "available_slots":avail,"occupied_slots":total-avail})
    return {"success":True,"data":result}
