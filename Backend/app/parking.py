from flask import Blueprint, request, jsonify
from .models import ParkingLotDetails, Floor, Row, Slot
from . import db, ma
from flask_jwt_extended import jwt_required
from marshmallow import post_load
from .admin import role_required
import math
import re
from datetime import datetime, time
from sqlalchemy import func

# Marshmallow Schemas
class SlotSchema(ma.Schema):
    id = ma.Int(dump_only=True)
    name = ma.Str(required=True)
    status = ma.Int()
    vehicle_reg_no = ma.Str()
    ticket_id = ma.Str()
    row_id = ma.Int(load_only=True, required=True)
    floor_id = ma.Int(load_only=True, required=True)
    parkinglot_id = ma.Int(load_only=True, required=True)

    @post_load
    def make_slot(self, data, **kwargs):
        return Slot(**data)

class RowSchema(ma.Schema):
    id = ma.Int(dump_only=True)
    name = ma.Str(required=True)
    floor_id = ma.Int(load_only=True, required=True)
    parkinglot_id = ma.Int(load_only=True, required=True)
    slots = ma.Nested(SlotSchema, many=True, dump_only=True)

    @post_load
    def make_row(self, data, **kwargs):
        return Row(**data)

class FloorSchema(ma.Schema):
    id = ma.Int(dump_only=True)
    name = ma.Str(required=True)
    parkinglot_id = ma.Int(load_only=True, required=True)
    rows = ma.Nested(RowSchema, many=True, dump_only=True)

    @post_load
    def make_floor(self, data, **kwargs):
        return Floor(**data)

class ParkingLotDetailsSchema(ma.Schema):
    id = ma.Int(dump_only=True)
    name = ma.Str(required=True)
    city = ma.Str()
    landmark = ma.Str()
    address = ma.Str(required=True)
    latitude = ma.Float()
    longitude = ma.Float()
    physical_appearance = ma.Str()
    parking_ownership = ma.Str()
    parking_surface = ma.Str()
    has_cctv = ma.Str()
    has_boom_barrier = ma.Str()
    ticket_generated = ma.Str()
    entry_exit_gates = ma.Str()
    weekly_off = ma.Str()
    parking_timing = ma.Str()
    vehicle_types = ma.Str()
    car_capacity = ma.Int()
    available_car_slots = ma.Int()
    two_wheeler_capacity = ma.Int()
    available_two_wheeler_slots = ma.Int()
    parking_type = ma.Str()
    payment_modes = ma.Str()
    car_parking_charge = ma.Str()
    two_wheeler_parking_charge = ma.Str()
    allows_prepaid_passes = ma.Str()
    provides_valet_services = ma.Str()
    value_added_services = ma.Str()
    opening_time = ma.Time()
    closing_time = ma.Time()
    total_floors = ma.Int()
    total_rows = ma.Int()
    total_slots = ma.Int()
    created_at = ma.DateTime(dump_only=True)
    updated_at = ma.DateTime(dump_only=True)
    floors = ma.Nested(FloorSchema, many=True, dump_only=True)

    @post_load
    def make_parking_lot(self, data, **kwargs):
        return ParkingLotDetails(**data)

# Schema for list view (without nested details)
parking_lot_summary_schema = ParkingLotDetailsSchema(exclude=("floors",))
parking_lots_summary_schema = ParkingLotDetailsSchema(many=True, exclude=("floors",))

# Schema for detail view (with all nested details)
parking_lot_detail_schema = ParkingLotDetailsSchema()

slot_schema = SlotSchema()
slots_schema = SlotSchema(many=True)
row_schema = RowSchema()
rows_schema = RowSchema(many=True)
floor_schema = FloorSchema()
floors_schema = FloorSchema(many=True)

parking_bp = Blueprint('parking', __name__, url_prefix='/parking')

# Helper functions for enhanced nearby parking lots API

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) using Haversine formula
    Returns distance in meters
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in meters
    r = 6371000
    return c * r

def get_real_time_availability(parkinglot_id, vehicle_type='car'):
    """
    Calculate real-time availability for a parking lot based on slot status
    """
    try:
        if vehicle_type.lower() == 'car':
            # Count available car slots (status = 0 means free)
            available_slots = Slot.query.filter_by(
                parkinglot_id=parkinglot_id,
                status=0
            ).count()
        else:
            # For other vehicle types, use the same logic for now
            available_slots = Slot.query.filter_by(
                parkinglot_id=parkinglot_id,
                status=0
            ).count()
        
        return available_slots
    except Exception as e:
        # Return 0 if there's an error calculating availability
        return 0

def get_availability_status(availability):
    """
    Determine availability status based on number of available slots
    """
    if availability == 0:
        return "full"
    elif availability <= 3:
        return "limited"
    else:
        return "available"

def get_hourly_rate(parking_lot, vehicle_type='car'):
    """
    Extract hourly rate from parking lot charge information
    """
    try:
        if vehicle_type.lower() == 'car' and parking_lot.car_parking_charge:
            charge_text = parking_lot.car_parking_charge
        elif vehicle_type.lower() in ['bike', 'motorcycle', 'two_wheeler'] and parking_lot.two_wheeler_parking_charge:
            charge_text = parking_lot.two_wheeler_parking_charge
        else:
            charge_text = parking_lot.car_parking_charge or "€2.50/hr"
        
        # Extract first number from charge text (e.g., "€2.50/hr" -> 2.50)
        if charge_text:
            # Look for patterns like €2.50, $2.50, 2.50, etc.
            rates = re.findall(r'[€$]?(\d+\.?\d*)', charge_text)
            if rates:
                return float(rates[0])
        
        # Default rate if parsing fails
        return 2.50
    except Exception:
        return 2.50

def is_currently_open(parking_timing):
    """
    Check if parking lot is currently open based on timing information
    """
    try:
        if not parking_timing:
            return True  # Assume open if no timing info
        
        # Handle 24x7 or similar patterns
        if '24' in parking_timing.lower() or 'always' in parking_timing.lower():
            return True
        
        # For now, return True for all other cases
        # In a real implementation, you'd parse the timing string and check current time
        return True
    except Exception:
        return True

def parse_operating_hours(parking_timing):
    """
    Parse parking timing information into structured operating hours
    """
    try:
        if not parking_timing:
            return {
                "is_24x7": False,
                "opening_time": "06:00",
                "closing_time": "22:00",
                "weekly_off": "None",
                "timing_text": "Operating hours not specified"
            }
        
        # Check for 24x7 operation
        is_24x7 = '24' in parking_timing.lower() or 'always' in parking_timing.lower()
        
        if is_24x7:
            return {
                "is_24x7": True,
                "opening_time": "00:00",
                "closing_time": "23:59",
                "weekly_off": "None",
                "timing_text": "Open 24/7"
            }
        
        # Try to extract time patterns (basic implementation)
        # This could be enhanced with more sophisticated parsing
        opening_time = "06:00"
        closing_time = "22:00"
        
        # Look for time patterns like "6:00 AM - 10:00 PM"
        time_pattern = re.findall(r'(\d{1,2}):?(\d{0,2})\s*(AM|PM)?', parking_timing.upper())
        if len(time_pattern) >= 2:
            # Extract opening time
            hour1, min1, period1 = time_pattern[0]
            if period1 == 'PM' and int(hour1) != 12:
                hour1 = str(int(hour1) + 12)
            elif period1 == 'AM' and int(hour1) == 12:
                hour1 = '00'
            opening_time = f"{hour1.zfill(2)}:{min1.zfill(2) if min1 else '00'}"
            
            # Extract closing time
            hour2, min2, period2 = time_pattern[1]
            if period2 == 'PM' and int(hour2) != 12:
                hour2 = str(int(hour2) + 12)
            elif period2 == 'AM' and int(hour2) == 12:
                hour2 = '00'
            closing_time = f"{hour2.zfill(2)}:{min2.zfill(2) if min2 else '00'}"
        
        return {
            "is_24x7": False,
            "opening_time": opening_time,
            "closing_time": closing_time,
            "weekly_off": "None",  # Could be parsed from parking_timing if available
            "timing_text": parking_timing
        }
        
    except Exception:
        return {
            "is_24x7": False,
            "opening_time": "06:00",
            "closing_time": "22:00",
            "weekly_off": "None",
            "timing_text": parking_timing or "Operating hours not specified"
        }

def parse_pricing_tiers(lot):
    """
    Parse pricing information into structured pricing tiers
    """
    try:
        pricing_tiers = {
            "car_pricing": parse_vehicle_pricing(lot.car_parking_charge, 'car'),
            "two_wheeler_pricing": parse_vehicle_pricing(lot.two_wheeler_parking_charge, 'two_wheeler'),
            "payment_modes": lot.payment_modes.split(',') if lot.payment_modes else ['Cash', 'Card'],
            "allows_prepaid_passes": lot.allows_prepaid_passes == 'Yes' if lot.allows_prepaid_passes else False
        }
        
        return pricing_tiers
    except Exception:
        return {
            "car_pricing": {"hourly_rate": 2.50, "daily_max": 20.00, "currency": "EUR"},
            "two_wheeler_pricing": {"hourly_rate": 1.50, "daily_max": 12.00, "currency": "EUR"},
            "payment_modes": ['Cash', 'Card'],
            "allows_prepaid_passes": False
        }

def parse_vehicle_pricing(pricing_text, vehicle_type):
    """
    Parse vehicle-specific pricing information
    """
    try:
        if not pricing_text:
            default_rates = {
                'car': {"hourly_rate": 2.50, "daily_max": 20.00},
                'two_wheeler': {"hourly_rate": 1.50, "daily_max": 12.00}
            }
            return {**default_rates.get(vehicle_type, default_rates['car']), "currency": "EUR", "pricing_text": "Standard rates"}
        
        # Extract rates using regex
        rates = re.findall(r'[€$]?(\d+\.?\d*)', pricing_text)
        
        pricing_info = {
            "currency": "EUR",
            "pricing_text": pricing_text
        }
        
        if rates:
            # First rate is typically hourly
            pricing_info["hourly_rate"] = float(rates[0])
            
            # If multiple rates, second might be daily max
            if len(rates) > 1:
                pricing_info["daily_max"] = float(rates[1])
            else:
                # Estimate daily max as 8x hourly rate
                pricing_info["daily_max"] = float(rates[0]) * 8
        else:
            # Default rates if no numbers found
            pricing_info["hourly_rate"] = 2.50 if vehicle_type == 'car' else 1.50
            pricing_info["daily_max"] = 20.00 if vehicle_type == 'car' else 12.00
        
        return pricing_info
        
    except Exception:
        return {
            "hourly_rate": 2.50 if vehicle_type == 'car' else 1.50,
            "daily_max": 20.00 if vehicle_type == 'car' else 12.00,
            "currency": "EUR",
            "pricing_text": pricing_text or "Standard rates"
        }

def parse_facilities(lot):
    """
    Parse facilities and services information
    """
    try:
        facilities = {
            "security": {
                "has_cctv": lot.has_cctv == 'Yes' if lot.has_cctv else False,
                "has_boom_barrier": lot.has_boom_barrier == 'Yes' if lot.has_boom_barrier else False,
                "security_features": []
            },
            "services": {
                "provides_valet_services": lot.provides_valet_services == 'Yes' if lot.provides_valet_services else False,
                "ticket_generated": lot.ticket_generated == 'Yes' if lot.ticket_generated else False,
                "value_added_services": lot.value_added_services.split(',') if lot.value_added_services else []
            },
            "infrastructure": {
                "parking_surface": lot.parking_surface or "Not specified",
                "entry_exit_gates": lot.entry_exit_gates or "Standard gates",
                "physical_appearance": lot.physical_appearance or "Standard parking lot"
            }
        }
        
        # Add security features based on available data
        if facilities["security"]["has_cctv"]:
            facilities["security"]["security_features"].append("CCTV Surveillance")
        if facilities["security"]["has_boom_barrier"]:
            facilities["security"]["security_features"].append("Boom Barrier")
        
        return facilities
        
    except Exception:
        return {
            "security": {
                "has_cctv": False,
                "has_boom_barrier": False,
                "security_features": []
            },
            "services": {
                "provides_valet_services": False,
                "ticket_generated": True,
                "value_added_services": []
            },
            "infrastructure": {
                "parking_surface": "Not specified",
                "entry_exit_gates": "Standard gates",
                "physical_appearance": "Standard parking lot"
            }
        }

def get_hourly_rate_filter(max_price, vehicle_type):
    """
    Create a filter condition for maximum price
    This is a simplified version - in a real implementation you'd need more complex parsing
    """
    # For now, we'll filter based on the text content
    # This is a basic implementation that could be improved
    if vehicle_type.lower() == 'car':
        return ParkingLotDetails.car_parking_charge.isnot(None)
    else:
        return ParkingLotDetails.two_wheeler_parking_charge.isnot(None)

@parking_bp.route('/lots/nearby', methods=['GET'])
@jwt_required()
def get_nearby_parking_lots():
    """
    Get nearby parking lots with enhanced filtering and real-time availability
    ---
    tags:
      - Parking
    security:
      - JWT: []
    parameters:
      - in: query
        name: latitude
        type: number
        required: true
        description: User's current latitude
      - in: query
        name: longitude
        type: number
        required: true
        description: User's current longitude
      - in: query
        name: radius
        type: integer
        default: 3000
        description: Search radius in meters (default 3km)
      - in: query
        name: max_price
        type: number
        description: Maximum hourly price filter
      - in: query
        name: min_availability
        type: integer
        description: Minimum number of available slots
      - in: query
        name: vehicle_type
        type: string
        default: car
        description: Vehicle type (car, bike, motorcycle)
    responses:
      200:
        description: List of nearby parking lots with availability and distance
        schema:
          type: object
          properties:
            success:
              type: boolean
            data:
              type: array
              items:
                type: object
                properties:
                  parkinglot_id:
                    type: integer
                  name:
                    type: string
                  address:
                    type: string
                  latitude:
                    type: number
                  longitude:
                    type: number
                  distance:
                    type: number
                  availability:
                    type: integer
                  availability_status:
                    type: string
                  hourly_rate:
                    type: number
                  is_open:
                    type: boolean
      400:
        description: Invalid parameters
    """
    try:
        # Get required parameters
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)
        
        if latitude is None or longitude is None:
            return jsonify({
                "success": False,
                "error": "Latitude and longitude are required parameters"
            }), 400
        
        # Get optional parameters
        radius = request.args.get('radius', 3000, type=int)  # 3km default
        max_price = request.args.get('max_price', type=float)
        min_availability = request.args.get('min_availability', type=int)
        vehicle_type = request.args.get('vehicle_type', 'car')
        
        # Validate radius
        if radius <= 0 or radius > 50000:  # Max 50km
            return jsonify({
                "success": False,
                "error": "Radius must be between 1 and 50000 meters"
            }), 400
        
        # Get all parking lots
        lots = ParkingLotDetails.query.all()
        
        results = []
        for lot in lots:
            # Skip lots without coordinates
            if not lot.latitude or not lot.longitude:
                continue
            
            # Calculate distance
            distance = calculate_distance(
                latitude, longitude, 
                float(lot.latitude), float(lot.longitude)
            )
            
            # Skip lots outside radius
            if distance > radius:
                continue
            
            # Get real-time availability
            availability = get_real_time_availability(lot.id, vehicle_type)
            
            # Apply minimum availability filter
            if min_availability and availability < min_availability:
                continue
            
            # Get hourly rate
            hourly_rate = get_hourly_rate(lot, vehicle_type)
            
            # Apply maximum price filter
            if max_price and hourly_rate > max_price:
                continue
            
            # Check if currently open
            is_open = is_currently_open(lot.parking_timing)
            
            # Build result object compatible with Android ParkingLot model
            lot_data = {
                "id": lot.id,  # Android expects 'id', not 'parkinglot_id'
                "parkinglot_id": lot.id,  # Keep for backward compatibility
                "name": lot.name or f"Parking Lot {lot.id}",
                "address": lot.address or "Address not available",
                "city": lot.city or "New Delhi",
                "landmark": lot.landmark or "Landmark not available",
                "latitude": float(lot.latitude) if lot.latitude else 28.6139,
                "longitude": float(lot.longitude) if lot.longitude else 77.2090,
                "distance": round(distance / 1000, 2),  # Convert meters to km for Android
                
                # Capacity and availability - match Android JSON structure
                "car_capacity": lot.car_capacity or 0,
                "available_car_slots": availability if vehicle_type.lower() == 'car' else lot.available_car_slots or 0,
                "two_wheeler_capacity": lot.two_wheeler_capacity or 0,
                "available_two_wheeler_slots": availability if vehicle_type.lower() in ['bike', 'motorcycle', 'two_wheeler'] else lot.available_two_wheeler_slots or 0,
                
                # Pricing - match Android JSON structure
                "car_fee": lot.car_parking_charge or "Free",
                "two_wheeler_fee": lot.two_wheeler_parking_charge or "Free",
                "payment_mode": lot.payment_modes or "Cash",
                
                # Additional fields Android expects
                "parking_type": lot.parking_type or "Free",
                "has_cctv": lot.has_cctv == 'Yes' if lot.has_cctv else False,
                "has_boom_barrier": lot.has_boom_barrier == 'Yes' if lot.has_boom_barrier else False,
                "ticket_generated": lot.ticket_generated or "No ticket",
                "entry_exit_gates": lot.entry_exit_gates or "Standard gates",
                "weekly_off": lot.weekly_off or "Open All Days",
                "parking_timing": lot.parking_timing or "24x7",
                "vehicle_types": lot.vehicle_types or "Car, 2 Wheelers",
                "allows_prepaid_passes": lot.allows_prepaid_passes or "No",
                "provides_valet_services": lot.provides_valet_services or "No",
                "value_added_services": lot.value_added_services or "No",
                
                # Ensure all required fields are present for Android compatibility
                "total_car_slots": lot.car_capacity or 0,
                "total_two_wheeler_slots": lot.two_wheeler_capacity or 0,
                
                # Additional API-specific fields
                "availability": availability,  # Number of available slots
                "availability_status": get_availability_status(availability),
                "hourly_rate": hourly_rate,
                "is_open": is_open
            }
            
            results.append(lot_data)
        
        # Sort by distance (closest first)
        results.sort(key=lambda x: x['distance'])
        
        return jsonify({
            "success": True,
            "data": results,
            "total_count": len(results),
            "search_params": {
                "latitude": latitude,
                "longitude": longitude,
                "radius": radius,
                "vehicle_type": vehicle_type,
                "max_price": max_price,
                "min_availability": min_availability
            }
        }), 200
        
    except ValueError as e:
        return jsonify({
            "success": False,
            "error": f"Invalid parameter value: {str(e)}"
        }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch nearby parking lots"
        }), 500

@parking_bp.route('/lots', methods=['POST'])
@role_required("user")
def create_parking_lot():
    """
    Create a new parking lot.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
            address:
              type: string
            city:
              type: string
            landmark:
              type: string
            latitude:
              type: number
            longitude:
              type: number
            # ... (other fields as per ParkingLotDetailsSchema)
    responses:
      201:
        description: Parking lot created
      400:
        description: Invalid input
      403:
        description: Forbidden
    """
    data = request.get_json()
    try:
        new_lot = parking_lot_summary_schema.load(data)
        db.session.add(new_lot)
        db.session.commit()
        return jsonify(parking_lot_summary_schema.dump(new_lot)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@parking_bp.route('/lots', methods=['GET'])
@role_required("user")
def get_parking_lots():
    """
    Get a list of all parking lots (summary view).
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of parking lots
    """
    lots = ParkingLotDetails.query.all()
    return jsonify(parking_lots_summary_schema.dump(lots))

@parking_bp.route('/lots/<int:lot_id>', methods=['GET'])
@role_required("user")
def get_parking_lot(lot_id):
    """
    Get detailed information about a specific parking lot, including nested floors, rows, and slots.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: lot_id
        type: integer
        required: true
    responses:
      200:
        description: Parking lot details
      404:
        description: Parking lot not found
    """
    lot = db.session.get(ParkingLotDetails, lot_id)
    if not lot:
        return jsonify({"error": "Parking lot not found"}), 404
    return jsonify(parking_lot_detail_schema.dump(lot))

@parking_bp.route('/lots/<int:lot_id>/details', methods=['GET'])
@jwt_required()
def get_parking_lot_details(lot_id):
    """
    Get comprehensive detailed information about a specific parking lot with real-time availability,
    operating hours, pricing tiers, and capacity information.
    ---
    tags:
      - Parking
    security:
      - JWT: []
    parameters:
      - in: path
        name: lot_id
        type: integer
        required: true
        description: Parking lot ID
      - in: query
        name: vehicle_type
        type: string
        default: car
        description: Vehicle type for pricing and availability (car, bike, motorcycle)
    responses:
      200:
        description: Comprehensive parking lot details with real-time information
        schema:
          type: object
          properties:
            success:
              type: boolean
            data:
              type: object
              properties:
                parkinglot_id:
                  type: integer
                name:
                  type: string
                address:
                  type: string
                city:
                  type: string
                latitude:
                  type: number
                longitude:
                  type: number
                operating_hours:
                  type: object
                  properties:
                    is_24x7:
                      type: boolean
                    opening_time:
                      type: string
                    closing_time:
                      type: string
                    weekly_off:
                      type: string
                pricing_tiers:
                  type: object
                  properties:
                    car_pricing:
                      type: object
                    two_wheeler_pricing:
                      type: object
                    payment_modes:
                      type: array
                capacity_info:
                  type: object
                  properties:
                    total_capacity:
                      type: integer
                    car_capacity:
                      type: integer
                    two_wheeler_capacity:
                      type: integer
                real_time_availability:
                  type: object
                  properties:
                    available_slots:
                      type: integer
                    availability_status:
                      type: string
                    last_updated:
                      type: string
                facilities:
                  type: object
                  properties:
                    has_cctv:
                      type: boolean
                    has_boom_barrier:
                      type: boolean
                    provides_valet_services:
                      type: boolean
                    value_added_services:
                      type: array
      404:
        description: Parking lot not found
      500:
        description: Server error
    """
    try:
        # Get parking lot basic information
        lot = db.session.get(ParkingLotDetails, lot_id)
        if not lot:
            # Return 404 for non-existent parking lots
            return jsonify({
                "success": False,
                "error": "Parking lot not found"
            }), 404
        
        # Get vehicle type for specific pricing and availability
        vehicle_type = request.args.get('vehicle_type', 'car')
        
        # Calculate real-time availability
        total_slots = Slot.query.filter_by(parkinglot_id=lot_id).count()
        available_slots = get_real_time_availability(lot_id, vehicle_type)
        occupied_slots = total_slots - available_slots
        availability_status = get_availability_status(available_slots)
        
        # Parse operating hours
        operating_hours = parse_operating_hours(lot.parking_timing)
        # Add weekly_off from the lot object
        operating_hours['weekly_off'] = lot.weekly_off if lot.weekly_off else "None"
        
        # Parse pricing information
        pricing_tiers = parse_pricing_tiers(lot)
        
        # Get capacity information
        capacity_info = {
            "total_capacity": total_slots,
            "car_capacity": lot.car_capacity or 0,
            "two_wheeler_capacity": lot.two_wheeler_capacity or 0,
            "available_car_slots": lot.available_car_slots or available_slots if vehicle_type == 'car' else None,
            "available_two_wheeler_slots": lot.available_two_wheeler_slots or available_slots if vehicle_type in ['bike', 'motorcycle', 'two_wheeler'] else None
        }
        
        # Parse facilities information
        facilities = parse_facilities(lot)
        
        # Build comprehensive response
        detailed_info = {
            "parkinglot_id": lot.id,
            "name": lot.name,
            "address": lot.address,
            "city": lot.city,
            "landmark": lot.landmark,
            "latitude": float(lot.latitude) if lot.latitude else None,
            "longitude": float(lot.longitude) if lot.longitude else None,
            "description": lot.physical_appearance,
            
            # Operating hours information
            "operating_hours": operating_hours,
            
            # Pricing information
            "pricing_tiers": pricing_tiers,
            
            # Capacity and availability
            "capacity_info": capacity_info,
            "real_time_availability": {
                "total_slots": total_slots,
                "available_slots": available_slots,
                "occupied_slots": occupied_slots,
                "availability_status": availability_status,
                "availability_percentage": round((available_slots / total_slots * 100) if total_slots > 0 else 0, 1),
                "last_updated": datetime.utcnow().isoformat(),
                "is_currently_open": is_currently_open(lot.parking_timing)
            },
            
            # Facilities and services
            "facilities": facilities,
            
            # Additional information
            "parking_type": lot.parking_type,
            "parking_surface": lot.parking_surface,
            "parking_ownership": lot.parking_ownership,
            "vehicle_types_supported": lot.vehicle_types.split(',') if lot.vehicle_types else ['car'],
            
            # Floor structure (if needed for navigation)
            "structure_info": {
                "total_floors": len(lot.floors) if lot.floors else 0,
                "floor_names": [floor.name for floor in lot.floors] if lot.floors else []
            }
        }
        
        return jsonify({
            "success": True,
            "data": detailed_info
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch parking lot details"
        }), 500

@parking_bp.route('/lots/<int:lot_id>/stats', methods=['GET'])
@role_required("user")
def get_parking_lot_stats(lot_id):
    """
    Get statistics (total, occupied, available slots) for a specific parking lot.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: lot_id
        type: integer
        required: true
    responses:
      200:
        description: Parking lot statistics
      404:
        description: Parking lot not found
    """
    if not db.session.get(ParkingLotDetails, lot_id):
        return jsonify({"error": "Parking lot not found"}), 404

    total_slots = Slot.query.filter_by(parkinglot_id=lot_id).count()
    available_slots = Slot.query.filter_by(parkinglot_id=lot_id, status=0).count()
    occupied_slots = total_slots - available_slots

    stats = {
        'parkinglot_id': lot_id,
        'total_slots': total_slots,
        'available_slots': available_slots,
        'occupied_slots': occupied_slots
    }
    return jsonify(stats)

@parking_bp.route('/lots/<int:lot_id>', methods=['PUT'])
@role_required("user")
def update_parking_lot(lot_id):
    """
    Update a parking lot's details.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: lot_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
            address:
              type: string
            # ... (other updatable fields)
    responses:
      200:
        description: Parking lot updated
      400:
        description: Invalid input
      404:
        description: Parking lot not found
    """
    lot = db.session.get(ParkingLotDetails, lot_id)
    if not lot:
        return jsonify({"error": "Parking lot not found"}), 404
    
    data = request.get_json()
    try:
        updated_lot = parking_lot_summary_schema.load(data, instance=lot, partial=True)
        db.session.commit()
        return jsonify(parking_lot_summary_schema.dump(updated_lot))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@parking_bp.route('/lots/<int:lot_id>', methods=['DELETE'])
@role_required("user")
def delete_parking_lot(lot_id):
    """
    Delete a parking lot.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: lot_id
        type: integer
        required: true
    responses:
      200:
        description: Parking lot deleted
      404:
        description: Parking lot not found
    """
    lot = db.session.get(ParkingLotDetails, lot_id)
    if not lot:
        return jsonify({"error": "Parking lot not found"}), 404
    
    db.session.delete(lot)
    db.session.commit()
    return jsonify({"message": "Parking lot deleted successfully"})

# Floor CRUD Endpoints
@parking_bp.route('/lots/<int:lot_id>/floors', methods=['POST'])
@role_required("user")
def create_floor(lot_id):
    """
    Create a new floor within a parking lot.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: lot_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
    responses:
      201:
        description: Floor created
      400:
        description: Invalid input
      404:
        description: Parking lot not found
    """
    if not db.session.get(ParkingLotDetails, lot_id):
        return jsonify({"error": "Parking lot not found"}), 404
        
    data = request.get_json()
    data['parkinglot_id'] = lot_id
    try:
        new_floor = floor_schema.load(data)
        db.session.add(new_floor)
        db.session.commit()
        return jsonify(floor_schema.dump(new_floor)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@parking_bp.route('/lots/<int:lot_id>/floors', methods=['GET'])
@role_required("user")
def get_floors_for_lot(lot_id):
    """
    Get all floors for a specific parking lot.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: lot_id
        type: integer
        required: true
    responses:
      200:
        description: List of floors
      404:
        description: Parking lot not found
    """
    lot = db.session.get(ParkingLotDetails, lot_id)
    if not lot:
        return jsonify({"error": "Parking lot not found"}), 404
    return jsonify(floors_schema.dump(lot.floors))

@parking_bp.route('/floors/<int:floor_id>', methods=['GET'])
@role_required("user")
def get_floor(floor_id):
    """
    Get details of a specific floor.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: floor_id
        type: integer
        required: true
    responses:
      200:
        description: Floor details
      404:
        description: Floor not found
    """
    floor = db.session.get(Floor, floor_id)
    if not floor:
        return jsonify({"error": "Floor not found"}), 404
    return jsonify(floor_schema.dump(floor))

@parking_bp.route('/floors/<int:floor_id>', methods=['PUT'])
@role_required("user")
def update_floor(floor_id):
    """
    Update a floor's details.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: floor_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
    responses:
      200:
        description: Floor updated
      400:
        description: Invalid input
      404:
        description: Floor not found
    """
    floor = db.session.get(Floor, floor_id)
    if not floor:
        return jsonify({"error": "Floor not found"}), 404
    
    data = request.get_json()
    try:
        updated_floor = floor_schema.load(data, instance=floor, partial=True)
        db.session.commit()
        return jsonify(floor_schema.dump(updated_floor))
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@parking_bp.route('/floors/<int:floor_id>', methods=['DELETE'])
@role_required("user")
def delete_floor(floor_id):
    """
    Delete a floor.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: floor_id
        type: integer
        required: true
    responses:
      200:
        description: Floor deleted
      404:
        description: Floor not found
    """
    floor = db.session.get(Floor, floor_id)
    if not floor:
        return jsonify({"error": "Floor not found"}), 404
    
    db.session.delete(floor)
    db.session.commit()
    return jsonify({"message": "Floor deleted successfully"})

# Row CRUD Endpoints
@parking_bp.route('/floors/<int:floor_id>/rows', methods=['POST'])
@role_required("user")
def create_row(floor_id):
    """
    Create a new row within a floor.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: floor_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
    responses:
      201:
        description: Row created
      400:
        description: Invalid input
      404:
        description: Floor not found
    """
    floor = db.session.get(Floor, floor_id)
    if not floor:
        return jsonify({"error": "Floor not found"}), 404
        
    data = request.get_json()
    data['floor_id'] = floor_id
    data['parkinglot_id'] = floor.parkinglot_id
    try:
        new_row = row_schema.load(data)
        db.session.add(new_row)
        db.session.commit()
        return jsonify(row_schema.dump(new_row)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@parking_bp.route('/floors/<int:floor_id>/rows', methods=['GET'])
@role_required("user")
def get_rows_for_floor(floor_id):
    """
    Get all rows for a specific floor.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: floor_id
        type: integer
        required: true
    responses:
      200:
        description: List of rows
      404:
        description: Floor not found
    """
    floor = db.session.get(Floor, floor_id)
    if not floor:
        return jsonify({"error": "Floor not found"}), 404
    return jsonify(rows_schema.dump(floor.rows))

@parking_bp.route('/rows/<int:row_id>', methods=['GET'])
@role_required("user")
def get_row(row_id):
    """
    Get details of a specific row.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: row_id
        type: integer
        required: true
    responses:
      200:
        description: Row details
      404:
        description: Row not found
    """
    row = db.session.get(Row, row_id)
    if not row:
        return jsonify({"error": "Row not found"}), 404
    return jsonify(row_schema.dump(row))

@parking_bp.route('/rows/<int:row_id>', methods=['PUT'])
@role_required("user")
def update_row(row_id):
    """
    Update a row's details.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: row_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
    responses:
      200:
        description: Row updated
      400:
        description: Invalid input
      404:
        description: Row not found
    """
    row = db.session.get(Row, row_id)
    if not row:
        return jsonify({"error": "Row not found"}), 404
    
    data = request.get_json()
    try:
        updated_row = row_schema.load(data, instance=row, partial=True)
        db.session.commit()
        return jsonify(row_schema.dump(updated_row))
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@parking_bp.route('/rows/<int:row_id>', methods=['DELETE'])
@role_required("user")
def delete_row(row_id):
    """
    Delete a row.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: row_id
        type: integer
        required: true
    responses:
      200:
        description: Row deleted
      404:
        description: Row not found
    """
    row = db.session.get(Row, row_id)
    if not row:
        return jsonify({"error": "Row not found"}), 404
    
    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Row deleted successfully"})

# Slot CRUD Endpoints
@parking_bp.route('/rows/<int:row_id>/slots', methods=['POST'])
@role_required("user")
def create_slot(row_id):
    """
    Create a new slot within a row.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: row_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
    responses:
      201:
        description: Slot created
      400:
        description: Invalid input
      404:
        description: Row not found
    """
    row = db.session.get(Row, row_id)
    if not row:
        return jsonify({"error": "Row not found"}), 404

    data = request.get_json()
    data['row_id'] = row_id
    data['floor_id'] = row.floor_id
    data['parkinglot_id'] = row.parkinglot_id
    try:
        new_slot = slot_schema.load(data)
        db.session.add(new_slot)
        db.session.commit()
        return jsonify(slot_schema.dump(new_slot)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@parking_bp.route('/rows/<int:row_id>/slots', methods=['GET'])
@role_required("user")
def get_slots_for_row(row_id):
    """
    Get all slots for a specific row.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: row_id
        type: integer
        required: true
    responses:
      200:
        description: List of slots
      404:
        description: Row not found
    """
    row = db.session.get(Row, row_id)
    if not row:
        return jsonify({"error": "Row not found"}), 404
    return jsonify(slots_schema.dump(row.slots))

@parking_bp.route('/slots/<int:slot_id>', methods=['GET'])
@role_required("user")
def get_slot(slot_id):
    """
    Get details of a specific slot.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: slot_id
        type: integer
        required: true
    responses:
      200:
        description: Slot details
      404:
        description: Slot not found
    """
    slot = db.session.get(Slot, slot_id)
    if not slot:
        return jsonify({"error": "Slot not found"}), 404
    return jsonify(slot_schema.dump(slot))

@parking_bp.route('/slots/<int:slot_id>', methods=['PUT'])
@role_required("user")
def update_slot(slot_id):
    """
    Update a slot's details.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: slot_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
            status:
              type: integer
    responses:
      200:
        description: Slot updated
      400:
        description: Invalid input
      404:
        description: Slot not found
    """
    slot = db.session.get(Slot, slot_id)
    if not slot:
        return jsonify({"error": "Slot not found"}), 404
    
    data = request.get_json()
    try:
        updated_slot = slot_schema.load(data, instance=slot, partial=True)
        db.session.commit()
        return jsonify(slot_schema.dump(updated_slot))
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@parking_bp.route('/slots/<int:slot_id>', methods=['DELETE'])
@role_required("user")
def delete_slot(slot_id):
    """
    Delete a slot.
    ---
    tags:
      - Parking
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: slot_id
        type: integer
        required: true
    responses:
      200:
        description: Slot deleted
      404:
        description: Slot not found
    """
    slot = db.session.get(Slot, slot_id)
    if not slot:
        return jsonify({"error": "Slot not found"}), 404
    
    db.session.delete(slot)
    db.session.commit()
    return jsonify({"message": "Slot deleted successfully"})
@parking_bp.route('/lots/bulk-stats', methods=['GET'])
@role_required("user")
def get_bulk_parking_stats():
    """Get stats for all parking lots in a single query."""
    try:
        from sqlalchemy import func, case
        results = db.session.query(
            Slot.parkinglot_id,
            func.count(Slot.id).label('total_slots'),
            func.sum(case((Slot.status == 0, 1), else_=0)).label('available_slots'),
            func.sum(case((Slot.status == 1, 1), else_=0)).label('occupied_slots')
        ).group_by(Slot.parkinglot_id).all()
        
        stats = {}
        for r in results:
            stats[r.parkinglot_id] = {
                'total_slots': r.total_slots,
                'available_slots': r.available_slots,
                'occupied_slots': r.occupied_slots
            }
        return jsonify({"success": True, "data": stats})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": True, "data": {}}), 200
