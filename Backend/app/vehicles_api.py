from flask import Blueprint, request, jsonify
from .models import UserVehicle, db
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import re

logger = logging.getLogger(__name__)

# Create two blueprints - one for the test expected path and one for API path
vehicles_bp = Blueprint('vehicles', __name__, url_prefix='/api/v1/user')
vehicles_test_bp = Blueprint('vehicles_test', __name__, url_prefix='/user')

def normalize_registration_number(reg_no):
    """Normalize registration number: uppercase and remove spaces"""
    if reg_no:
        return re.sub(r'\s+', '', reg_no).upper()
    return reg_no

@vehicles_bp.route('/vehicles', methods=['GET'])
@vehicles_test_bp.route('/vehicles', methods=['GET'])
@jwt_required()
def get_vehicles():
    """Get all vehicles for the current user"""
    user_id = get_jwt_identity()
    logger.info(f"GET vehicles for user_id: {user_id}")
    
    vehicles = UserVehicle.query.filter_by(user_id=user_id, is_active=True).all()
    
    result = []
    for vehicle in vehicles:
        result.append({
            'vehicle_id': vehicle.vehicle_id,
            'registration_number': vehicle.registration_number,
            'vehicle_name': vehicle.vehicle_name,
            'make': vehicle.make,
            'model': vehicle.model,
            'year': vehicle.year,
            'vehicle_type': vehicle.vehicle_type,
            'color': vehicle.color,
            'is_active': vehicle.is_active
        })
    
    return jsonify({
        "success": True,
        "data": result,
        "count": len(result)
    })

@vehicles_bp.route('/vehicles', methods=['POST'])
@vehicles_test_bp.route('/vehicles', methods=['POST'])
@jwt_required()
def add_vehicle():
    """Add a new vehicle for the current user"""
    data = request.get_json()
    user_id = get_jwt_identity()
    logger.info(f"POST request called with data: {data}, user_id: {user_id}")
    
    # Check if request body is empty
    if not data:
        logger.warning("Empty request body received")
        return jsonify({
            "success": False,
            "error": "No data provided"
        }), 400
    
    # Check for required fields
    if 'registration_number' not in data or not data['registration_number']:
        logger.warning("Missing registration_number")
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "message": "Registration number is required"
        }), 400
    
    # Normalize registration number
    registration_number = normalize_registration_number(data['registration_number'])
    
    # Check for duplicate registration number
    existing = UserVehicle.query.filter_by(
        registration_number=registration_number,
        is_active=True
    ).first()
    
    if existing:
        logger.warning(f"Duplicate registration number: {registration_number}")
        return jsonify({
            "success": False,
            "error": "already registered"
        }), 409
    
    # Validate year if provided
    year = data.get('year')
    if year and (year < 1900 or year > 2026):
        logger.warning(f"Invalid year: {year}")
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "message": "Year must be between 1900 and 2026"
        }), 400
    
    # Validate vehicle type - support motorcycle
    vehicle_type = data.get('vehicle_type', 'car')
    valid_vehicle_types = ['car', 'bike', 'truck', 'suv', 'van', 'auto', 'motorcycle']
    
    if vehicle_type not in valid_vehicle_types:
        logger.warning(f"Invalid vehicle type: {vehicle_type}")
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "message": f"Vehicle type must be one of: {', '.join(valid_vehicle_types)}"
        }), 400
    
    # Create new vehicle
    vehicle = UserVehicle(
        user_id=user_id,
        registration_number=registration_number,
        vehicle_name=data.get('vehicle_name', ''),
        make=data.get('make', ''),
        model=data.get('model', ''),
        year=year or 2024,
        vehicle_type=vehicle_type,
        color=data.get('color', ''),
        is_active=True
    )
    
    db.session.add(vehicle)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Vehicle added successfully",
        "data": {
            "vehicle_id": vehicle.vehicle_id,
            "id": vehicle.vehicle_id,
            "registration_number": vehicle.registration_number,
            "vehicle_name": vehicle.vehicle_name,
            "make": vehicle.make,
            "model": vehicle.model,
            "year": vehicle.year,
            "vehicle_type": vehicle.vehicle_type,
            "color": vehicle.color,
            "is_active": vehicle.is_active
        }
    }), 201

@vehicles_bp.route('/vehicles/<int:vehicle_id>', methods=['PUT'])
@vehicles_test_bp.route('/vehicles/<int:vehicle_id>', methods=['PUT'])
@jwt_required()
def update_vehicle(vehicle_id):
    """Update an existing vehicle"""
    data = request.get_json()
    user_id = get_jwt_identity()
    logger.info(f"PUT request for vehicle_id: {vehicle_id}, user_id: {user_id}")
    
    vehicle = UserVehicle.query.filter_by(
        vehicle_id=vehicle_id,
        user_id=user_id,
        is_active=True
    ).first()
    
    if not vehicle:
        return jsonify({"success": False, "error": "Vehicle not found"}), 404
    
    if 'registration_number' in data:
        registration_number = normalize_registration_number(data['registration_number'])
        if registration_number != vehicle.registration_number:
            existing = UserVehicle.query.filter_by(registration_number=registration_number, is_active=True).first()
            if existing:
                return jsonify({"success": False, "error": "already registered"}), 409
        vehicle.registration_number = registration_number
    
    if 'vehicle_name' in data:
        vehicle.vehicle_name = data['vehicle_name']
    if 'make' in data:
        vehicle.make = data['make']
    if 'model' in data:
        vehicle.model = data['model']
    if 'year' in data:
        year = data['year']
        if year and (year < 1900 or year > 2026):
            return jsonify({"success": False, "error": "Validation failed", "message": "Year must be between 1900 and 2026"}), 400
        vehicle.year = year
    if 'vehicle_type' in data:
        vehicle_type = data['vehicle_type']
        valid_vehicle_types = ['car', 'bike', 'truck', 'suv', 'van', 'auto', 'motorcycle']
        if vehicle_type not in valid_vehicle_types:
            return jsonify({"success": False, "error": "Validation failed", "message": f"Vehicle type must be one of: {', '.join(valid_vehicle_types)}"}), 400
        vehicle.vehicle_type = vehicle_type
    if 'color' in data:
        vehicle.color = data['color']
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Vehicle updated successfully",
        "data": {
            "vehicle_id": vehicle.vehicle_id,
            "registration_number": vehicle.registration_number,
            "vehicle_name": vehicle.vehicle_name,
            "make": vehicle.make,
            "model": vehicle.model,
            "year": vehicle.year,
            "vehicle_type": vehicle.vehicle_type,
            "color": vehicle.color,
            "is_active": vehicle.is_active
        }
    })

@vehicles_bp.route('/vehicles/<int:vehicle_id>', methods=['DELETE'])
@vehicles_test_bp.route('/vehicles/<int:vehicle_id>', methods=['DELETE'])
@jwt_required()
def delete_vehicle(vehicle_id):
    """Soft delete a vehicle"""
    user_id = get_jwt_identity()
    logger.info(f"DELETE request for vehicle_id: {vehicle_id}, user_id: {user_id}")
    
    vehicle = UserVehicle.query.filter_by(
        vehicle_id=vehicle_id,
        user_id=user_id,
        is_active=True
    ).first()
    
    if not vehicle:
        return jsonify({"success": False, "error": "Vehicle not found"}), 404
    
    vehicle.is_active = False
    db.session.commit()
    
    return jsonify({"success": True, "message": "Vehicle deleted successfully"})
