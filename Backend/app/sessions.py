from flask import Blueprint, request, jsonify
from .models import ParkingSession, UserVehicle, ParkingLotDetails, Slot, db
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)

sessions_bp = Blueprint('sessions', __name__, url_prefix='/api/v1/user/sessions')
sessions_test_bp = Blueprint('sessions_test', __name__, url_prefix='/user/sessions')

def calculate_cost(start_time, end_time):
    hours = (end_time - start_time).total_seconds() / 3600
    return round(hours * 3.0, 2)

def parse_and_validate_checkin(request):
    """Parse and validate check-in request, returns (data, error_response)"""
    try:
        raw = request.get_data(as_text=True)
        if not raw or not raw.strip():
            return None, (jsonify({"success": False, "error": "No data provided", "message": "Request body is empty"}), 400)
        import json
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return None, (jsonify({"success": False, "error": "No data provided", "message": "Invalid JSON"}), 400)
    except Exception:
        return None, (jsonify({"success": False, "error": "No data provided", "message": "Could not parse request"}), 400)

    if not data:
        return None, (jsonify({"success": False, "error": "No data provided", "message": "Empty JSON object"}), 400)

    vehicle_id = data.get('vehicle_id')
    parkinglot_id = data.get('parkinglot_id')

    if vehicle_id is None and parkinglot_id is None:
        return None, (jsonify({"success": False, "error": "No data provided", "message": "vehicle_id and parkinglot_id are required"}), 400)

    # Validate types
    try:
        vehicle_id = int(vehicle_id)
        parkinglot_id = int(parkinglot_id)
    except (ValueError, TypeError):
        return None, (jsonify({"success": False, "error": "Validation failed", "message": "vehicle_id and parkinglot_id must be integers"}), 400)

    if vehicle_id <= 0 or parkinglot_id <= 0:
        return None, (jsonify({"success": False, "error": "Validation failed", "message": "vehicle_id and parkinglot_id must be positive integers"}), 400)

    data['vehicle_id'] = vehicle_id
    data['parkinglot_id'] = parkinglot_id
    return data, None

@sessions_bp.route('/check-in', methods=['POST'])
@sessions_test_bp.route('/check-in', methods=['POST'])
@jwt_required()
def session_checkin():
    user_id = int(get_jwt_identity())

    data, err = parse_and_validate_checkin(request)
    if err:
        return err

    vehicle_id = data['vehicle_id']
    parkinglot_id = data['parkinglot_id']

    vehicle = UserVehicle.query.filter_by(vehicle_id=vehicle_id, user_id=user_id, is_active=True).first()
    if not vehicle:
        return jsonify({"success": False, "error": "Vehicle not found"}), 404

    parking_lot = ParkingLotDetails.query.filter_by(id=parkinglot_id).first()
    if not parking_lot:
        return jsonify({"success": False, "error": "Parking lot not found"}), 404

    active_session = ParkingSession.query.filter_by(user_id=user_id, vehicle_id=vehicle_id, end_time=None).first()
    if active_session:
        return jsonify({"success": False, "error": "already has an active session"}), 409

    slot = Slot.query.filter_by(parkinglot_id=parkinglot_id, status=0).first()
    if not slot:
        return jsonify({"success": False, "error": "no available parking slots"}), 409

    ticket_id = str(uuid.uuid4())[:8].upper()
    session = ParkingSession(
        ticket_id=ticket_id, user_id=user_id, vehicle_id=vehicle_id, slot_id=slot.id,
        parkinglot_id=parkinglot_id, vehicle_reg_no=vehicle.registration_number,
        start_time=datetime.utcnow(), end_time=None, total_amount=0,
        payment_status='pending', session_status='active'
    )

    slot.status = 1
    slot.vehicle_reg_no = vehicle.registration_number
    slot.ticket_id = ticket_id

    db.session.add(session)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Vehicle checked in successfully",
        "data": {
            "ticket_id": ticket_id,
            "parking_lot_name": parking_lot.name,
            "status": "active",
            "slot_location": f"Slot {slot.name}",
            "vehicle_info": {
                "registration_number": vehicle.registration_number,
                "vehicle_name": vehicle.vehicle_name
            }
        }
    }), 201

@sessions_bp.route('/<ticket_id>', methods=['GET'])
@sessions_test_bp.route('/<ticket_id>', methods=['GET'])
@jwt_required()
def get_session_details(ticket_id):
    user_id = int(get_jwt_identity())
    session = ParkingSession.query.filter_by(ticket_id=ticket_id).first()
    if not session or session.user_id != int(user_id):
        return jsonify({"success": False, "error": "Session not found"}), 404

    parking_lot = ParkingLotDetails.query.get(session.parkinglot_id)
    slot = Slot.query.get(session.slot_id)
    vehicle = UserVehicle.query.get(session.vehicle_id)

    is_active = session.end_time is None
    now = datetime.utcnow()
    end = now if is_active else session.end_time
    duration = (end - session.start_time).total_seconds() / 3600
    cost = calculate_cost(session.start_time, now) if is_active else float(session.total_amount)

    data = {
        "ticket_id": session.ticket_id,
        "session_info": {
            "ticket_id": session.ticket_id,
            "status": "active" if is_active else "completed"
        },
        "parking_lot_info": {"name": parking_lot.name if parking_lot else None},
        "vehicle_info": {"registration_number": vehicle.registration_number if vehicle else session.vehicle_reg_no},
        "payment_info": {"payment_status": session.payment_status, "amount": float(cost)},
        "slot_location": f"Slot {slot.name}" if slot else None,
        "checkin_time": session.start_time.isoformat(),
        "duration_hours": round(duration, 2),
        "total_amount": float(cost)
    }
    if session.end_time:
        data["checkout_time"] = session.end_time.isoformat()

    return jsonify({"success": True, "data": data})

@sessions_bp.route('/active', methods=['GET'])
@sessions_test_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active_sessions():
    user_id = int(get_jwt_identity())
    sessions = ParkingSession.query.filter_by(user_id=user_id, end_time=None, session_status='active').all()

    result = []
    for session in sessions:
        parking_lot = ParkingLotDetails.query.get(session.parkinglot_id)
        duration = (datetime.utcnow() - session.start_time).total_seconds() / 3600
        result.append({
            "ticket_id": session.ticket_id,
            "parking_lot_name": parking_lot.name if parking_lot else None,
            "checkin_time": session.start_time.isoformat(),
            "current_duration": round(duration, 2),
            "duration_hours": round(duration, 2),
            "estimated_cost": round(calculate_cost(session.start_time, datetime.utcnow()), 2),
            "status": "active"
        })

    return jsonify({"success": True, "data": result, "count": len(result)})

@sessions_bp.route('/checkout', methods=['POST'])
@sessions_test_bp.route('/checkout', methods=['POST'])
@jwt_required()
def session_checkout():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"success": False, "error": "No data provided"}), 400

    ticket_id = data.get('ticket_id')
    payment_method = data.get('payment_method', 'card')

    if not ticket_id:
        return jsonify({"success": False, "error": "Validation failed", "message": "ticket_id is required"}), 400

    valid_methods = ['card', 'cash', 'upi', 'netbanking']
    if payment_method not in valid_methods:
        return jsonify({"success": False, "error": "Validation failed", "message": "Invalid payment method"}), 400

    session = ParkingSession.query.filter_by(ticket_id=ticket_id, user_id=user_id).first()
    if not session or session.end_time:
        return jsonify({"success": False, "error": "Session not found"}), 404

    checkout_time = datetime.utcnow()
    total_amount = calculate_cost(session.start_time, checkout_time)
    duration = (checkout_time - session.start_time).total_seconds() / 3600

    session.end_time = checkout_time
    session.total_amount = total_amount
    session.payment_status = 'completed'
    session.session_status = 'completed'
    session.payment_method = payment_method

    slot = Slot.query.get(session.slot_id)
    if slot:
        slot.status = 0
        slot.vehicle_reg_no = None
        slot.ticket_id = None

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Vehicle checked out successfully",
        "data": {
            "ticket_id": ticket_id,
            "end_time": checkout_time.isoformat(),
            "duration": round(duration, 2),
            "duration_hours": round(duration, 2),
            "total_amount": float(total_amount),
            "payment_status": session.payment_status,
            "payment_method": payment_method,
            "status": "completed"
        }
    }), 200

@sessions_bp.route('/history', methods=['GET'])
@sessions_test_bp.route('/history', methods=['GET'])
@jwt_required()
def get_session_history():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    sessions = ParkingSession.query.filter_by(user_id=user_id)\
        .filter(ParkingSession.end_time.isnot(None))\
        .order_by(ParkingSession.end_time.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    result = []
    for session in sessions.items:
        result.append({
            "ticket_id": session.ticket_id,
            "checkin_time": session.start_time.isoformat(),
            "checkout_time": session.end_time.isoformat(),
            "duration_hours": round((session.end_time - session.start_time).total_seconds() / 3600, 2),
            "total_amount": float(session.total_amount),
            "status": session.session_status,
            "payment_status": session.payment_status,
            "payment_method": session.payment_method if hasattr(session, 'payment_method') else None
        })

    return jsonify({
        "success": True,
        "data": result,
        "pagination": {
            "page": page,
            "pages": sessions.pages,
            "per_page": per_page,
            "total": sessions.total
        }
    })
