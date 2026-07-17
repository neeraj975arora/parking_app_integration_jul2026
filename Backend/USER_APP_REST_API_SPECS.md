# User App REST API Specifications

**Base URL**: `http://localhost` or your deployed server URL  
**Authentication**: JWT Bearer Token (except for `/auth` endpoints)  
**Content-Type**: `application/json`

---

## Table of Contents
1. [Authentication](#authentication)
2. [Vehicle Management](#vehicle-management)
3. [Parking Discovery](#parking-discovery)
4. [Session Management](#session-management)

---

## Authentication

### 1. Register User
**Endpoint**: `POST /auth/register`  
**Authentication**: None  
**Description**: Register a new user account (mobile app users only)

**Request Body**:
```json
{
  "user_name": "John Doe",
  "user_email": "john@example.com",
  "user_password": "password123",
  "user_phone_no": "1234567890",
  "user_address": "123 Main St, New Delhi"
}
```

**Success Response** (201):
```json
{
  "msg": "User registered successfully",
  "role": "user"
}
```

**Error Responses**:
- `400`: Missing required fields or invalid email format
- `409`: User with email or phone already exists

---

### 2. Login
**Endpoint**: `POST /auth/login`  
**Authentication**: None  
**Description**: Login and receive JWT access token

**Request Body**:
```json
{
  "user_email": "john@example.com",
  "user_password": "password123",
  "role": "user"
}
```

**Success Response** (200):
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "username": "John Doe",
  "user_email": "john@example.com",
  "user_id": 20,
  "user_address": "123 Main St, New Delhi",
  "user_phone_no": "1234567890",
  "role": "user"
}
```

**Error Responses**:
- `400`: Missing email or password
- `401`: Invalid credentials or role mismatch

**Note**: Use the `access_token` in all subsequent requests:
```
Authorization: Bearer <access_token>
```

---

## Vehicle Management

### 1. Get User Vehicles
**Endpoint**: `GET /user/vehicles`  
**Authentication**: Required (JWT)  
**Description**: Get all registered vehicles for the authenticated user

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "vehicle_id": 1,
      "registration_number": "DL02AB1234",
      "vehicle_name": "My Honda City",
      "make": "Honda",
      "model": "City",
      "year": 2020,
      "vehicle_type": "car",
      "color": "Silver",
      "is_active": true,
      "created_at": "2024-10-15T10:30:00Z",
      "updated_at": "2024-10-15T10:30:00Z"
    }
  ]
}
```

---

### 2. Register Vehicle
**Endpoint**: `POST /user/vehicles`  
**Authentication**: Required (JWT)  
**Description**: Register a new vehicle

**Request Body**:
```json
{
  "registration_number": "DL02AB1234",
  "vehicle_name": "My Honda City",
  "make": "Honda",
  "model": "City",
  "year": 2020,
  "vehicle_type": "car",
  "color": "Silver"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "vehicle_id": 1,
    "registration_number": "DL02AB1234",
    "vehicle_name": "My Honda City",
    "make": "Honda",
    "model": "City",
    "year": 2020,
    "vehicle_type": "car",
    "color": "Silver",
    "is_active": true,
    "created_at": "2024-10-28T10:30:00Z",
    "updated_at": "2024-10-28T10:30:00Z"
  },
  "message": "Vehicle registered successfully"
}
```

**Error Responses**:
- `400`: Validation failed (invalid registration number, year, etc.)
- `409`: Vehicle with this registration number already registered

**Validation Rules**:
- `registration_number`: Required, 4-15 alphanumeric characters
- `vehicle_type`: Must be one of: car, two-wheeler, motorcycle, scooter, bike
- `year`: Between 1900 and 2025

---

### 3. Update Vehicle
**Endpoint**: `PUT /user/vehicles/{vehicle_id}`  
**Authentication**: Required (JWT)  
**Description**: Update vehicle information (cannot change registration number)

**Request Body**:
```json
{
  "vehicle_name": "My Updated Car",
  "make": "Honda",
  "model": "Civic",
  "year": 2021,
  "color": "Red"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "vehicle_id": 1,
    "registration_number": "DL02AB1234",
    "vehicle_name": "My Updated Car",
    "make": "Honda",
    "model": "Civic",
    "year": 2021,
    "vehicle_type": "car",
    "color": "Red",
    "is_active": true
  },
  "message": "Vehicle updated successfully"
}
```

**Error Responses**:
- `404`: Vehicle not found
- `400`: Validation failed

---

### 4. Delete Vehicle
**Endpoint**: `DELETE /user/vehicles/{vehicle_id}`  
**Authentication**: Required (JWT)  
**Description**: Delete (soft delete) a vehicle

**Success Response** (200):
```json
{
  "success": true,
  "message": "Vehicle deleted successfully"
}
```

**Error Responses**:
- `404`: Vehicle not found
- `409`: Cannot delete vehicle with active parking sessions

---

## Parking Discovery

### 1. Find Nearby Parking Lots
**Endpoint**: `GET /parking/lots/nearby`  
**Authentication**: Required (JWT)  
**Description**: Find parking lots near user's location with real-time availability

**Query Parameters**:
- `latitude` (required): User's current latitude
- `longitude` (required): User's current longitude
- `radius` (optional): Search radius in meters (default: 3000, max: 50000)
- `vehicle_type` (optional): car, bike, motorcycle (default: car)
- `max_price` (optional): Maximum hourly price filter
- `min_availability` (optional): Minimum number of available slots

**Example Request**:
```
GET /parking/lots/nearby?latitude=28.6139&longitude=77.2090&radius=5000&vehicle_type=car
```

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "parkinglot_id": 1,
      "name": "Jahangirpuri - Metro Authorised Parking",
      "address": "Jahangir puri metro, Parking agency- m/s manoj computer",
      "city": "New Delhi",
      "landmark": "Jahangirpuri",
      "latitude": 28.72542191,
      "longitude": 77.16333008,
      "distance": 2.45,
      "car_capacity": 200,
      "available_car_slots": 150,
      "two_wheeler_capacity": 500,
      "available_two_wheeler_slots": 450,
      "car_fee": "20 up to 6 hours, 30 for 12 hours",
      "two_wheeler_fee": "10 up to 6 hours, 15 up to 12",
      "payment_mode": "Cash",
      "parking_type": "Paid",
      "has_cctv": false,
      "has_boom_barrier": true,
      "ticket_generated": "Stand Alone printer",
      "entry_exit_gates": "Multi gates for Entry as well as Exit",
      "weekly_off": "Open All Days",
      "parking_timing": "06:00:00 AM - 11:00:00 PM",
      "vehicle_types": "Car, 2 Weelers",
      "allows_prepaid_passes": "Monthly Pass",
      "provides_valet_services": "No",
      "value_added_services": "No",
      "total_car_slots": 200,
      "total_two_wheeler_slots": 500,
      "availability_status": "available",
      "hourly_rate": 20.0,
      "is_open": true
    }
  ],
  "total_count": 15,
  "search_params": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "radius": 5000,
    "vehicle_type": "car",
    "max_price": null,
    "min_availability": null
  }
}
```

**Error Responses**:
- `400`: Missing latitude/longitude or invalid radius

---

### 2. Get Parking Lot Details
**Endpoint**: `GET /parking/lots/{lot_id}/details`  
**Authentication**: Required (JWT)  
**Description**: Get comprehensive details about a specific parking lot

**Query Parameters**:
- `vehicle_type` (optional): car, bike, motorcycle (default: car)

**Example Request**:
```
GET /parking/lots/1/details?vehicle_type=car
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "parkinglot_id": 1,
    "name": "Jahangirpuri - Metro Authorised Parking",
    "address": "Jahangir puri metro",
    "city": "New Delhi",
    "latitude": 28.72542191,
    "longitude": 77.16333008,
    "operating_hours": {
      "is_24x7": false,
      "opening_time": "06:00",
      "closing_time": "23:00",
      "weekly_off": "None",
      "timing_text": "06:00:00 AM - 11:00:00 PM"
    },
    "pricing_tiers": {
      "car_pricing": {
        "hourly_rate": 20.0,
        "daily_max": 160.0,
        "currency": "EUR",
        "pricing_text": "20 up to 6 hours, 30 for 12 hours"
      },
      "two_wheeler_pricing": {
        "hourly_rate": 10.0,
        "daily_max": 80.0,
        "currency": "EUR",
        "pricing_text": "10 up to 6 hours, 15 up to 12"
      },
      "payment_modes": ["Cash"],
      "allows_prepaid_passes": true
    },
    "capacity_info": {
      "total_capacity": 700,
      "car_capacity": 200,
      "two_wheeler_capacity": 500
    },
    "real_time_availability": {
      "available_slots": 150,
      "availability_status": "available",
      "last_updated": "2024-10-28T10:30:00Z"
    },
    "facilities": {
      "security": {
        "has_cctv": false,
        "has_boom_barrier": true,
        "security_features": ["Boom Barrier"]
      },
      "services": {
        "provides_valet_services": false,
        "ticket_generated": true,
        "value_added_services": []
      },
      "infrastructure": {
        "parking_surface": "Cemented",
        "entry_exit_gates": "Multi gates for Entry as well as Exit",
        "physical_appearance": "Open - Covered bounderies"
      }
    }
  }
}
```

---

## Session Management

### 1. Check-In (Start Parking Session)
**Endpoint**: `POST /user/sessions/check-in`  
**Authentication**: Required (JWT)  
**Description**: Start a new parking session by allocating a slot

**Request Body**:
```json
{
  "vehicle_id": 1,
  "parkinglot_id": 1
}
```

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "ticketId": "TKT20251028045557YG7JSE",
    "userId": 20,
    "vehicleId": 1,
    "parkinglotId": 1,
    "parkingLotName": "Jahangirpuri - Metro Authorised Parking",
    "parkingLotAddress": "Jahangir puri metro",
    "vehicleRegNo": "DL02AB1234",
    "vehicleType": "car",
    "startTime": "2024-10-28T10:30:00Z",
    "endTime": null,
    "durationHrs": 0.0,
    "totalAmount": 0.0,
    "paymentStatus": "pending",
    "paymentMethod": null,
    "receiptUrl": null,
    "sessionStatus": "active",
    "slotLocation": {
      "slotId": 10111,
      "floorId": 101,
      "rowId": 1011,
      "floorName": "Ground",
      "rowName": "Row-A",
      "slotName": "S1"
    }
  },
  "message": "Parking session started successfully"
}
```

**Error Responses**:
- `400`: Validation failed or no data provided
- `404`: Vehicle or parking lot not found
- `409`: Vehicle already has active session or no available slots

---

### 2. Check-Out (End Parking Session)
**Endpoint**: `POST /user/sessions/checkout`  
**Authentication**: Required (JWT)  
**Description**: End parking session and process payment

**Request Body**:
```json
{
  "ticket_id": "TKT20251028045557YG7JSE",
  "payment_method": "card"
}
```

**Payment Methods**: card, upi, cash, wallet

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "ticket_id": "TKT20251028045557YG7JSE",
    "start_time": "2024-10-28T10:30:00Z",
    "end_time": "2024-10-28T12:45:00Z",
    "duration": "2h 15m",
    "duration_hours": 2.25,
    "total_amount": 45.0,
    "payment_status": "completed",
    "payment_method": "card",
    "receipt_url": "/receipts/20/20241028",
    "slot_location": {
      "floor_name": "Ground",
      "row_name": "Row-A",
      "slot_name": "S1"
    },
    "parking_lot_name": "Jahangirpuri - Metro Authorised Parking"
  },
  "message": "Parking session completed successfully"
}
```

**Error Responses**:
- `400`: Validation failed
- `404`: Active session not found
- `402`: Payment processing failed

---

### 3. Get Active Sessions
**Endpoint**: `GET /user/sessions/active`  
**Authentication**: Required (JWT)  
**Description**: Get all active parking sessions for the user

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "ticket_id": "TKT20251028045557YG7JSE",
      "parking_lot_name": "Jahangirpuri - Metro Authorised Parking",
      "parking_lot_address": "Jahangir puri metro",
      "vehicle_reg_no": "DL02AB1234",
      "vehicle_info": {
        "registration_number": "DL02AB1234",
        "vehicle_type": "car"
      },
      "start_time": "2024-10-28T10:30:00Z",
      "current_duration": "2h 15m",
      "duration_hours": 2.25,
      "estimated_cost": 45.0,
      "slot_location": {
        "floor_name": "Ground",
        "row_name": "Row-A",
        "slot_name": "S1"
      },
      "status": "active"
    }
  ]
}
```

---

### 4. Get Session History
**Endpoint**: `GET /user/sessions/history`  
**Authentication**: Required (JWT)  
**Description**: Get past parking sessions with pagination

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status (completed, cancelled)

**Example Request**:
```
GET /user/sessions/history?page=1&per_page=20&status=completed
```

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "ticket_id": "TKT20251027123456ABCDEF",
      "parking_lot_name": "Jahangirpuri - Metro Authorised Parking",
      "parking_lot_address": "Jahangir puri metro",
      "vehicle_reg_no": "DL02AB1234",
      "vehicle_info": {
        "registration_number": "DL02AB1234",
        "vehicle_name": "My Honda City",
        "vehicle_type": "car"
      },
      "start_time": "2024-10-27T14:00:00Z",
      "end_time": "2024-10-27T16:30:00Z",
      "duration": "2h 30m",
      "duration_hours": 2.5,
      "total_amount": 50.0,
      "payment_status": "completed",
      "payment_method": "card",
      "session_status": "completed",
      "slot_location": {
        "floor_name": "Ground",
        "row_name": "Row-B",
        "slot_name": "S5"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Or with validation details:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field_name": ["Error message for this field"]
  }
}
```

---

## Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input or validation failed
- `401 Unauthorized`: Missing or invalid JWT token
- `402 Payment Required`: Payment processing failed
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists or conflict
- `500 Internal Server Error`: Server error

---

## Notes

1. **JWT Token**: Include in all authenticated requests:
   ```
   Authorization: Bearer <your_access_token>
   ```

2. **Token Expiry**: Tokens expire after 12 hours. Re-login to get a new token.

3. **Timestamps**: All timestamps are in ISO 8601 format (UTC)

4. **Distance**: Returned in kilometers (km)

5. **Currency**: Prices are in local currency (INR for India, EUR for Europe)

6. **Pagination**: Default page size is 20, maximum is 100

7. **Real-time Data**: Availability and slot status are updated in real-time

8. **Vehicle Types**: Supported types are: car, two-wheeler, motorcycle, scooter, bike

9. **Payment Methods**: Supported methods are: card, upi, cash, wallet

10. **Session Status**: active, completed, cancelled

11. **Payment Status**: pending, completed, failed
