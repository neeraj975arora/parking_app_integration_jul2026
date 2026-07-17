from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint, request, jsonify
from . import db
from .models import UserVehicle
import logging
import jwt
from flask import current_app

logger = logging.getLogger(__name__)

api_v1_bp = Blueprint('api_v1', __name__, url_prefix='/api/v1')

@api_v1_bp.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "success": True})

@api_v1_bp.route('/parking/lots/nearby', methods=['GET'])
def get_nearby_parking_lots():
    try:
        lat = float(request.args.get('latitude', 28.6315))
        lng = float(request.args.get('longitude', 77.2167))
        radius = float(request.args.get('radius', 20000))
        from sqlalchemy import text
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
        result = db.session.execute(sql, {'lat': lat, 'lng': lng, 'radius': radius})
        rows = result.fetchall()
        parking_lots = []
        for r in rows:
            parking_lots.append({
                "id": r.parkinglot_id,
                "name": r.parking_name,
                "address": r.address or '',
                "landmark": r.landmark or '',
                "city": r.city or '',
                "latitude": float(r.latitude),
                "longitude": float(r.longitude),
                "total_slots": r.car_capacity or 0,
                "available_slots": r.available_car_slots or 0,
                "two_wheeler_capacity": r.two_wheeler_capacity or 0,
                "available_two_wheeler_slots": r.available_two_wheeler_slots or 0,
                "price_per_hour": 0,
                "car_parking_charge": r.car_parking_charge or 'N/A',
                "parking_type": r.parking_type or 'Unknown',
                "parking_timing": r.parking_timing or 'N/A',
                "has_cctv": r.has_cctv or 'No',
                "has_boom_barrier": r.has_boom_barrier or 'No',
                "vehicle_types": r.vehicle_types or 'Car',
                "distance": round(float(r.distance) / 1000, 2)
            })
        return jsonify({"success": True, "data": parking_lots, "count": len(parking_lots)})
    except Exception as e:
        print(f"[nearby lots] ERROR: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@api_v1_bp.route('/user/vehicles', methods=['GET'])
@jwt_required()
def get_user_vehicles():
    try:
        user_id = get_jwt_identity()
        vehicles = UserVehicle.query.filter_by(user_id=user_id, is_active=True).all()
        vehicles_list = [{
            "id": v.vehicle_id,
            "vehicle_id": v.vehicle_id,
            "registration_number": v.registration_number,
            "vehicle_name": v.vehicle_name,
            "make": v.make,
            "model": v.model,
            "year": v.year,
            "vehicle_type": v.vehicle_type,
            "color": v.color,
            "is_active": v.is_active
        } for v in vehicles]
        return jsonify({"success": True, "data": vehicles_list, "count": len(vehicles_list)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_v1_bp.route('/user/vehicles', methods=['POST'])
@jwt_required()
def add_user_vehicle():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        vehicle = UserVehicle(
            user_id=user_id,
            registration_number=data.get('registration_number', ''),
            vehicle_name=data.get('vehicle_name', ''),
            make=data.get('make', ''),
            model=data.get('model', ''),
            year=data.get('year', 2024),
            vehicle_type=data.get('vehicle_type', 'car'),
            color=data.get('color', ''),
            is_active=True
        )
        db.session.add(vehicle)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Vehicle added successfully",
            "data": {
                "id": vehicle.vehicle_id,
                "vehicle_id": vehicle.vehicle_id,
                "registration_number": vehicle.registration_number,
                "vehicle_name": vehicle.vehicle_name,
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "vehicle_type": vehicle.vehicle_type,
                "color": vehicle.color
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@api_v1_bp.route('/user/sessions/check-in', methods=['POST'])
@jwt_required()
def checkin_session():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        vehicle_id = data.get('vehicle_id')
        parkinglot_id = data.get('parkinglot_id')
        from sqlalchemy import text
        import uuid
        from datetime import datetime
        ticket_id = str(uuid.uuid4())[:8].upper()
        veh = db.session.execute(
            text("SELECT registration_number, vehicle_type FROM user_vehicles WHERE vehicle_id = :vid"),
            {'vid': vehicle_id}
        ).fetchone()
        reg_no = veh.registration_number if veh else 'UNKNOWN'
        veh_type = veh.vehicle_type if veh else 'car'
        db.session.execute(text("""
            INSERT INTO parking_sessions
            (ticket_id, user_id, vehicle_id, parkinglot_id, vehicle_reg_no,
             start_time, session_status, vehicle_type, amount_paid)
            VALUES (:ticket_id, :user_id, :vehicle_id, :lot_id, :reg_no,
                    :now, 'active', :vtype, 0)
        """), {
            'ticket_id': ticket_id, 'user_id': user_id,
            'vehicle_id': vehicle_id, 'lot_id': parkinglot_id,
            'reg_no': reg_no, 'now': datetime.utcnow(), 'vtype': veh_type
        })
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Parking session started",
            "data": {
                "ticket_id": ticket_id,
                "vehicle_id": vehicle_id,
                "parkinglot_id": parkinglot_id,
                "start_time": datetime.utcnow().isoformat(),
                "session_status": "active"
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"[check-in] ERROR: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@api_v1_bp.route('/user/sessions/checkout', methods=['POST'])
@jwt_required()
def checkout_session():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        ticket_id = data.get('ticket_id')
        from sqlalchemy import text
        from datetime import datetime
        db.session.execute(text("""
            UPDATE parking_sessions
            SET end_time = :now, session_status = 'completed'
            WHERE ticket_id = :ticket_id AND user_id = :user_id
        """), {'ticket_id': ticket_id, 'user_id': user_id, 'now': datetime.utcnow()})
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Parking session ended",
            "data": {"ticket_id": ticket_id, "session_status": "completed"}
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@api_v1_bp.route('/user/sessions/active', methods=['GET'])
@jwt_required()
def get_active_sessions():
    try:
        user_id = get_jwt_identity()
        from sqlalchemy import text
        result = db.session.execute(text("""
            SELECT ps.ticket_id, ps.vehicle_id, ps.parkinglot_id, ps.vehicle_reg_no,
                   ps.start_time, ps.session_status, ps.vehicle_type,
                   ps.amount_paid, ps.total_amount, ps.payment_status,
                   ps.floor_id, ps.row_id, ps.slot_id,
                   pd.parking_name AS parking_lot_name,
                   pd.address AS parking_lot_address,
                   pd.car_parking_charge, pd.two_wheeler_parking_charge,
                   f.floor_name, r.row_name, s.slot_name
            FROM parking_sessions ps
            LEFT JOIN parkinglots_details pd ON ps.parkinglot_id = pd.parkinglot_id
            LEFT JOIN floors f ON ps.floor_id = f.floor_id
            LEFT JOIN rows r ON ps.row_id = r.row_id
            LEFT JOIN slots s ON ps.slot_id = s.slot_id
            WHERE ps.session_status = 'active'
        """), {'user_id': user_id})
        sessions = []
        from datetime import datetime
        for r in result.fetchall():
            row = dict(r._mapping)
            if row.get('start_time'):
                row['start_time'] = row['start_time'].strftime('%Y-%m-%dT%H:%M:%S')
                elapsed_hrs = (datetime.utcnow() - r.start_time).total_seconds() / 3600
                vehicle_type = row.get('vehicle_type', 'car')
                def safe_rate(val, default):
                    try:
                        return float(val) if val else default
                    except (ValueError, TypeError):
                        return default
                if vehicle_type == 'two_wheeler':
                    rate = safe_rate(row.get('two_wheeler_parking_charge'), 10)
                else:
                    rate = safe_rate(row.get('car_parking_charge'), 20)
                row['total_amount'] = round(elapsed_hrs * rate, 2)
                row['duration_hrs'] = round(elapsed_hrs, 2)
            if row.get('end_time') and row['end_time']:
                row['end_time'] = row['end_time'].strftime('%Y-%m-%dT%H:%M:%S')
            floor = row.get('floor_name') or row.get('floor_id')
            rowname = row.get('row_name') or row.get('row_id')
            slot = row.get('slot_name') or row.get('slot_id')
            if floor or rowname or slot:
                row['slot_location'] = {
                    'floorName': str(floor) if floor else None,
                    'rowName': str(rowname) if rowname else None,
                    'slotName': str(slot) if slot else None
                }
            if row.get('parking_lot_address'):
                row['parking_lot_address'] = row['parking_lot_address'].replace(', nan', '').replace('nan, ', '').replace('nan', '').strip()
            sessions.append(row)
        return jsonify({"success": True, "data": sessions, "count": len(sessions)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_v1_bp.route('/user/sessions/history', methods=['GET'])
@jwt_required()
def get_session_history():
    try:
        user_id = get_jwt_identity()
        from sqlalchemy import text
        result = db.session.execute(text("""
            SELECT ps.ticket_id, ps.vehicle_id, ps.parkinglot_id, ps.vehicle_reg_no,
                   ps.start_time, ps.end_time, ps.session_status, ps.vehicle_type,
                   ps.amount_paid, ps.total_amount, ps.payment_status,
                   pd.parking_name AS parking_lot_name,
                   pd.address AS parking_lot_address
            FROM parking_sessions ps
            LEFT JOIN parkinglots_details pd ON ps.parkinglot_id = pd.parkinglot_id
            WHERE ps.user_id = :user_id
            AND ps.session_status != 'active'
            ORDER BY ps.start_time DESC
            LIMIT 50
        """), {'user_id': user_id})
        sessions = []
        for r in result.fetchall():
            row = dict(r._mapping)
            # Format dates as ISO string
            if row.get('start_time'):
                row['start_time'] = row['start_time'].strftime('%Y-%m-%dT%H:%M:%S')
            if row.get('end_time'):
                row['end_time'] = row['end_time'].strftime('%Y-%m-%dT%H:%M:%S')
            sessions.append(row)
        return jsonify({"success": True, "data": sessions, "count": len(sessions)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_v1_bp.route('/slots/update_status', methods=['POST'])
def iot_update_slot_status():
    """IoT endpoint to update slot status using API key authentication."""
    from flask import current_app
    
    # Check API key
    api_key = request.headers.get('X-API-KEY')
    valid_key = current_app.config.get('RPI_API_KEY', 'super-secret-rpi-key')
    
    if not api_key:
        return jsonify({"success": False, "message": "API key required"}), 401
    
    if api_key != valid_key:
        return jsonify({"success": False, "message": "Invalid API key"}), 401
    
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400
    
    slot_id = data.get('slot_id') or data.get('id')
    status = data.get('status')
    
    if slot_id is None or status is None:
        return jsonify({"success": False, "message": "slot_id and status are required"}), 400
    
    from .models import Slot
    slot = Slot.query.get(slot_id)
    if not slot:
        return jsonify({"success": False, "message": "Slot not found"}), 404
    
    slot.status = status
    slot.vehicle_reg_no = data.get('vehicle_reg_no')
    slot.ticket_id = data.get('ticket_id')
    
    from . import db
    db.session.commit()
    
    return jsonify({"success": True, "message": "slot status updated", "slot_id": slot_id, "status": status}), 200
