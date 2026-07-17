
#!/usr/bin/env python3
"""
Generator script: writes all remaining FastAPI files.
Run from Backend/ directory:  python3 generate_fastapi_files.py
"""
import os, textwrap

BASE = os.path.join(os.path.dirname(__file__), "fastapi_app")

def write(rel_path, content):
    full = os.path.join(BASE, rel_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f:
        f.write(textwrap.dedent(content).lstrip("\n"))
    print(f"  wrote  {rel_path}  ({os.path.getsize(full)} bytes)")

# ─────────────────────────────────────────────────────────────────────────────
# routers/parking.py
# ─────────────────────────────────────────────────────────────────────────────
PARKING = r'''
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
'''

write("routers/parking.py", PARKING)

# ─────────────────────────────────────────────────────────────────────────────
# routers/admin.py
# ─────────────────────────────────────────────────────────────────────────────
ADMIN = r'''
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
'''

write("routers/admin.py", ADMIN)

# ─────────────────────────────────────────────────────────────────────────────
# routers/api_v1.py  (IoT slot update + duplicate nearby endpoint)
# ─────────────────────────────────────────────────────────────────────────────
API_V1 = r'''
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
'''

write("routers/api_v1.py", API_V1)

# ─────────────────────────────────────────────────────────────────────────────
# main.py  – FastAPI app factory
# ─────────────────────────────────────────────────────────────────────────────
MAIN = r'''
"""FastAPI application entry point."""
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import setup_logging
from .database import engine
from . import models
from .routers import auth, vehicles, sessions, parking, admin, api_v1

setup_logging()
logger = logging.getLogger(__name__)

# Create all tables on startup (same behaviour as Flask db.create_all())
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Parking App API",
    description="FastAPI backend – drop-in replacement for Flask backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS (same as Flask CORS(app)) ───────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(sessions.router)
app.include_router(parking.router)
app.include_router(admin.router)
app.include_router(api_v1.router)

# ── Health check (same path as Flask) ────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Parking App API is running"}

@app.get("/")
def root():
    return {"status": "healthy", "message": "Parking App API is running"}

# ── Global error handlers ─────────────────────────────────────────────────────
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"msg": "Resource not found"})

@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    return JSONResponse(status_code=500, content={"msg": "Internal server error"})
'''

write("main.py", MAIN)

# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
DOCKERFILE = r'''
FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY fastapi_app/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["uvicorn", "fastapi_app.main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "2"]
'''

DOCKER_COMPOSE = r'''
version: "3.8"

services:
  app:
    build: .
    container_name: fastapi_app
    volumes:
      - .:/app
    ports:
      - "5000:5000"
    networks:
      - backend
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://parking_user:parking_password@db:5432/parking_db
      - SECRET_KEY=my-super-secret-key-that-is-not-safe
      - JWT_SECRET_KEY=my-super-secret-key-that-is-not-safe
      - RPI_API_KEY=super-secret-rpi-key
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:17
    container_name: postgres_db
    environment:
      - POSTGRES_DB=parking_db
      - POSTGRES_USER=parking_user
      - POSTGRES_PASSWORD=parking_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U parking_user -d parking_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend
    ports:
      - "5432:5432"

  pgadmin:
    image: dpage/pgadmin4
    container_name: pgadmin
    restart: always
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - db
    networks:
      - backend
    volumes:
      - pgadmin_data:/var/lib/pgadmin

  nginx:
    image: nginx:stable
    container_name: nginx_server
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    networks:
      - backend
    depends_on:
      - app

networks:
  backend:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  pgadmin_data:
    driver: local
'''

# Write Dockerfile and docker-compose to Backend root (replacing Flask ones)
import os
backend_dir = os.path.dirname(os.path.abspath(__file__))

dockerfile_path = os.path.join(backend_dir, "Dockerfile.fastapi")
with open(dockerfile_path, "w") as f:
    f.write(DOCKERFILE.lstrip("\n"))
print(f"  wrote  Dockerfile.fastapi  ({os.path.getsize(dockerfile_path)} bytes)")

compose_path = os.path.join(backend_dir, "docker-compose.fastapi.yml")
with open(compose_path, "w") as f:
    f.write(DOCKER_COMPOSE.lstrip("\n"))
print(f"  wrote  docker-compose.fastapi.yml  ({os.path.getsize(compose_path)} bytes)")

# ─────────────────────────────────────────────────────────────────────────────
# .env.example for fastapi
# ─────────────────────────────────────────────────────────────────────────────
ENV_EXAMPLE = r'''
DATABASE_URL=postgresql://parking_user:parking_password@postgres_db:5432/parking_db
SECRET_KEY=change-me-in-production
JWT_SECRET_KEY=change-me-in-production
RPI_API_KEY=super-secret-rpi-key
'''
write(".env.example", ENV_EXAMPLE)

print("\n✅  All FastAPI files generated successfully!")
print("\nTo run locally (without Docker):")
print("  cd parking_app_integration/Backend")
print("  pip install -r fastapi_app/requirements.txt")
print("  uvicorn fastapi_app.main:app --host 0.0.0.0 --port 5000 --reload")
print("\nTo run with Docker:")
print("  cd parking_app_integration/Backend")
print("  docker compose -f docker-compose.fastapi.yml up --build")
print("\nAPI docs available at: http://localhost:5000/docs")
