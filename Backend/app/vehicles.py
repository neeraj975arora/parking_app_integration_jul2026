from flask import Blueprint, request, jsonify
from .models import UserVehicle, User
from . import db, ma
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import post_load, validates, ValidationError
from .admin import role_required
from .config import setup_logging
import logging
import re

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Create blueprint
vehicles_bp = Blueprint('vehicles', __name__, url_prefix='/user')

# Marshmallow Schema for UserVehicle
class UserVehicleSchema(ma.Schema):
    vehicle_id = ma.Int(dump_only=True)
    user_id = ma.Int(dump_only=True)  # Will be set from JWT
    registration_number = ma.Str(required=True)
    vehicle_name = ma.Str()
    make = ma.Str()
    model = ma.Str()
    year = ma.Int()
    vehicle_type = ma.Str()
    color = ma.Str()
    is_active = ma.Bool(dump_only=True)
    created_at = ma.DateTime(dump_only=True)
    updated_at = ma.DateTime(dump_only=True)

    @validates('registration_number')
    def validate_registration_number(self, value):
        if not value or len(value.strip()) == 0:
            raise ValidationError('Registration number is required')
        
        # Remove spaces and convert to uppercase for consistency
        cleaned_value = value.strip().upper().replace(' ', '')
        
        # Basic validation - should contain alphanumeric characters
        if not re.match(r'^[A-Z0-9]+$', cleaned_value):
            raise ValidationError('Registration number should contain only letters and numbers')
        
        if len(cleaned_value) < 4 or len(cleaned_value) > 15:
            raise ValidationError('Registration number should be between 4 and 15 characters')
        
        return cleaned_value

    @post_load
    def normalize_registration_number(self, data, **kwargs):
        """Normalize registration number after validation"""
        if 'registration_number' in data:
            data['registration_number'] = data['registration_number'].strip().upper().replace(' ', '')
        return data

    @validates('year')
    def validate_year(self, value):
        if value is not None:
            current_year = 2024
            if value < 1900 or value > current_year + 1:
                raise ValidationError(f'Year should be between 1900 and {current_year + 1}')
        return value

    @validates('vehicle_type')
    def validate_vehicle_type(self, value):
        if value is not None:
            allowed_types = ['car', 'two-wheeler', 'motorcycle', 'scooter', 'bike']
            if value.lower() not in allowed_types:
                raise ValidationError(f'Vehicle type must be one of: {", ".join(allowed_types)}')
        return value.lower() if value else 'car'

# Initialize schema instances
user_vehicle_schema = UserVehicleSchema()
user_vehicles_schema = UserVehicleSchema(many=True)

@vehicles_bp.route('/vehicles', methods=['GET'])
@jwt_required()
def get_user_vehicles():
    """
    Get all vehicles for authenticated user
    ---
    tags:
      - Vehicle Management
    security:
      - JWT: []
    definitions:
      UserVehicle:
        type: object
        properties:
          vehicle_id:
            type: integer
          user_id:
            type: integer
          registration_number:
            type: string
          vehicle_name:
            type: string
          make:
            type: string
          model:
            type: string
          year:
            type: integer
          vehicle_type:
            type: string
          color:
            type: string
          is_active:
            type: boolean
          created_at:
            type: string
            format: date-time
          updated_at:
            type: string
            format: date-time
    responses:
      200:
        description: List of user vehicles
        schema:
          type: object
          properties:
            success:
              type: boolean
            data:
              type: array
              items:
                $ref: '#/definitions/UserVehicle'
      401:
        description: Unauthorized
    """
    try:
        user_id = get_jwt_identity()
        logger.info(f"Fetching vehicles for user {user_id}")
        
        vehicles = UserVehicle.query.filter_by(
            user_id=user_id, 
            is_active=True
        ).order_by(UserVehicle.created_at.desc()).all()
        
        logger.info(f"Found {len(vehicles)} vehicles for user {user_id}")
        
        return jsonify({
            "success": True,
            "data": user_vehicles_schema.dump(vehicles)
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching vehicles for user {user_id}: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to fetch vehicles"
        }), 500

@vehicles_bp.route('/vehicles', methods=['POST'])
@jwt_required()
def create_vehicle():
    """
    Register a new vehicle for user
    ---
    tags:
      - Vehicle Management
    security:
      - JWT: []
    parameters:
      - in: body
        name: vehicle
        description: Vehicle information
        required: true
        schema:
          type: object
          required:
            - registration_number
            - vehicle_name
          properties:
            registration_number:
              type: string
              example: "ABC123"
            vehicle_name:
              type: string
              example: "My Car"
            make:
              type: string
              example: "Toyota"
            model:
              type: string
              example: "Camry"
            year:
              type: integer
              example: 2020
            vehicle_type:
              type: string
              example: "car"
            color:
              type: string
              example: "Blue"
    responses:
      201:
        description: Vehicle created successfully
      400:
        description: Validation error
      409:
        description: Vehicle already registered
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        logger.info(f"Creating vehicle for user {user_id}: {data}")
        
        # Validate input data
        try:
            validated_data = user_vehicle_schema.load(data)
        except ValidationError as err:
            logger.warning(f"Validation error for user {user_id}: {err.messages}")
            return jsonify({
                "success": False,
                "error": "Validation failed",
                "details": err.messages
            }), 400
        
        # Check for duplicate registration for this user
        existing = UserVehicle.query.filter_by(
            user_id=user_id,
            registration_number=validated_data['registration_number'],
            is_active=True
        ).first()
        
        if existing:
            logger.warning(f"Duplicate vehicle registration attempt by user {user_id}: {validated_data['registration_number']}")
            return jsonify({
                "success": False,
                "error": "Vehicle with this registration number is already registered"
            }), 409
        
        # Create new vehicle
        vehicle = UserVehicle(
            user_id=user_id,
            registration_number=validated_data['registration_number'],
            vehicle_name=validated_data.get('vehicle_name'),
            make=validated_data.get('make'),
            model=validated_data.get('model'),
            year=validated_data.get('year'),
            vehicle_type=validated_data.get('vehicle_type', 'car'),
            color=validated_data.get('color')
        )
        
        db.session.add(vehicle)
        db.session.commit()
        
        logger.info(f"Vehicle created successfully for user {user_id}: {vehicle.vehicle_id}")
        
        return jsonify({
            "success": True,
            "data": user_vehicle_schema.dump(vehicle),
            "message": "Vehicle registered successfully"
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating vehicle for user {user_id}: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to register vehicle"
        }), 500

@vehicles_bp.route('/vehicles/<int:vehicle_id>', methods=['PUT'])
@jwt_required()
def update_vehicle(vehicle_id):
    """
    Update a vehicle for user
    ---
    tags:
      - Vehicle Management
    security:
      - JWT: []
    parameters:
      - in: path
        name: vehicle_id
        type: integer
        required: true
        description: Vehicle ID
      - in: body
        name: vehicle
        description: Updated vehicle information
        required: true
        schema:
          type: object
          properties:
            vehicle_name:
              type: string
              example: "My Updated Car"
            make:
              type: string
              example: "Honda"
            model:
              type: string
              example: "Civic"
            year:
              type: integer
              example: 2021
            vehicle_type:
              type: string
              example: "car"
            color:
              type: string
              example: "Red"
    responses:
      200:
        description: Vehicle updated successfully
      400:
        description: Validation error
      404:
        description: Vehicle not found
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        logger.info(f"Updating vehicle {vehicle_id} for user {user_id}")
        
        # Find vehicle
        vehicle = UserVehicle.query.filter_by(
            vehicle_id=vehicle_id,
            user_id=user_id,
            is_active=True
        ).first()
        
        if not vehicle:
            logger.warning(f"Vehicle {vehicle_id} not found for user {user_id}")
            return jsonify({
                "success": False,
                "error": "Vehicle not found"
            }), 404
        
        # Validate input data (excluding registration_number for updates)
        update_data = {k: v for k, v in data.items() if k != 'registration_number'}
        
        try:
            validated_data = user_vehicle_schema.load(update_data, partial=True)
        except ValidationError as err:
            logger.warning(f"Validation error for vehicle {vehicle_id}: {err.messages}")
            return jsonify({
                "success": False,
                "error": "Validation failed",
                "details": err.messages
            }), 400
        
        # Update vehicle fields
        for field, value in validated_data.items():
            if hasattr(vehicle, field):
                setattr(vehicle, field, value)
        
        db.session.commit()
        
        logger.info(f"Vehicle {vehicle_id} updated successfully for user {user_id}")
        
        return jsonify({
            "success": True,
            "data": user_vehicle_schema.dump(vehicle),
            "message": "Vehicle updated successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating vehicle {vehicle_id} for user {user_id}: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to update vehicle"
        }), 500

@vehicles_bp.route('/vehicles/<int:vehicle_id>', methods=['DELETE'])
@jwt_required()
def delete_vehicle(vehicle_id):
    """
    Delete (soft delete) a vehicle for user
    ---
    tags:
      - Vehicle Management
    security:
      - JWT: []
    parameters:
      - in: path
        name: vehicle_id
        type: integer
        required: true
        description: Vehicle ID
    responses:
      200:
        description: Vehicle deleted successfully
      404:
        description: Vehicle not found
      409:
        description: Cannot delete vehicle with active sessions
    """
    try:
        user_id = get_jwt_identity()
        logger.info(f"Deleting vehicle {vehicle_id} for user {user_id}")
        
        # Find vehicle
        vehicle = UserVehicle.query.filter_by(
            vehicle_id=vehicle_id,
            user_id=user_id,
            is_active=True
        ).first()
        
        if not vehicle:
            logger.warning(f"Vehicle {vehicle_id} not found for user {user_id}")
            return jsonify({
                "success": False,
                "error": "Vehicle not found"
            }), 404
        
        # Check for active sessions
        from .models import ParkingSession
        active_sessions = ParkingSession.query.filter_by(
            vehicle_id=vehicle_id,
            session_status='active'
        ).count()
        
        if active_sessions > 0:
            logger.warning(f"Cannot delete vehicle {vehicle_id} - has {active_sessions} active sessions")
            return jsonify({
                "success": False,
                "error": "Cannot delete vehicle with active parking sessions"
            }), 409
        
        # Soft delete
        vehicle.is_active = False
        db.session.commit()
        
        logger.info(f"Vehicle {vehicle_id} deleted successfully for user {user_id}")
        
        return jsonify({
            "success": True,
            "message": "Vehicle deleted successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting vehicle {vehicle_id} for user {user_id}: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to delete vehicle"
        }), 500