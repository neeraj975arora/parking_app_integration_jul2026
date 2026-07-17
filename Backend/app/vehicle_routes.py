from flask import Blueprint, request, jsonify
from . import db
from .models import UserVehicle

vehicle_bp = Blueprint('vehicle', __name__, url_prefix='/api/v1/user')

@vehicle_bp.route('/vehicles', methods=['POST'])
def add_vehicle():
    data = request.get_json()
    print(f"Add vehicle request: {data}")
    
    return jsonify({
        "success": True,
        "message": "Vehicle added successfully",
        "data": {
            "id": 1,
            "vehicle_number": data.get('vehicle_number', ''),
            "vehicle_type": data.get('vehicle_type', ''),
            "vehicle_model": data.get('vehicle_model', ''),
            "vehicle_color": data.get('vehicle_color', ''),
            "is_default": data.get('is_default', False)
        }
    }), 201

@vehicle_bp.route('/vehicles', methods=['GET'])
def get_vehicles():
    vehicles = []
    return jsonify({"success": True, "data": vehicles, "count": len(vehicles)})
