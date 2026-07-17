# 🚗 Vision Parking API Testing Guide - Complete Postman Tutorial

This guide will walk you through testing **ALL APIs** used in the Vision Parking Android app step by step, like explaining to a child. Follow each step carefully!

**🎯 This guide covers EVERY API endpoint that your Android app uses:**
- Authentication APIs (Login/Register)
- Parking Lot Discovery APIs (Map & Search)
- Vehicle Management APIs (CRUD operations)
- Session Management APIs (Check-in/Check-out)
- Real-time Data APIs (Active sessions, History)

## 📋 Table of Contents
1. [Setup Postman Environment](#setup-postman-environment)
2. [Step 1: User Registration & Login](#step-1-user-registration--login)
3. [Step 2: Parking Lot Discovery](#step-2-parking-lot-discovery)
4. [Step 3: Vehicle Management](#step-3-vehicle-management)
5. [Step 4: Session Management](#step-4-session-management)
6. [Step 5: Additional APIs](#step-5-additional-apis)
7. [Step 6: Troubleshooting](#step-6-troubleshooting)
8. [Complete API Reference](#complete-api-reference)

---

## 🛠️ Setup Postman Environment

### 1. Create a New Environment in Postman
1. Open Postman
2. Click on "Environments" in the left sidebar
3. Click "Create Environment"
4. Name it: `Vision Parking Local`
5. Add these variables:

| Variable Name | Initial Value | Current Value |
|---------------|---------------|---------------|
| `base_url` | `http://localhost:5000` | `http://localhost:5000` |
| `auth_token` | | (leave empty - will be set automatically) |
| `user_id` | | (leave empty - will be set automatically) |
| `vehicle_id` | | (leave empty - will be set automatically) |
| `ticket_id` | | (leave empty - will be set automatically) |
| `parking_lot_id` | | (leave empty - will be set automatically) |
| `latitude` | `18.920388` | `18.920388` |
| `longitude` | `72.830130` | `72.830130` |

6. Click "Save"
7. Select this environment from the dropdown in the top right

### 🌍 Available Test Cities & Coordinates

Your test database contains parking lots in multiple Indian cities. You can test different locations by updating the latitude/longitude variables:

#### **Mumbai (3 parking lots) - DEFAULT**
```
latitude: 18.920388
longitude: 72.830130
```
- Nariman Point Parking
- Bandra West Parking  
- Andheri East Multi

#### **Delhi NCR (2 parking lots)**
```
latitude: 28.6329
longitude: 77.2188
```
- Connaught Place Parking (New Delhi)
- DLF Cyber Hub Parking (Gurgaon)

#### **Bengaluru (2 parking lots)**
```
latitude: 12.9721
longitude: 77.5933
```
- MG Road Parking
- Koramangala Parking

#### **Other Cities (1 parking lot each)**
- **Kolkata**: `22.5597, 88.3636` - Park Street Parking
- **Pune**: `18.5204, 73.8567` - Pune Camp Parking  
- **Chennai**: `13.0489, 80.2824` - Chennai Marina Parking

**💡 Pro Tip:** Start with Mumbai coordinates (default) as it has the most parking lots for comprehensive testing!

---

## 🔐 Step 1: User Registration & Login

### 1.1 Register a New User

**Method:** `POST`  
**URL:** `{{base_url}}/auth/register`  
**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "user_name": "John Doe",
  "user_email": "john.doe@example.com",
  "user_password": "password123",
  "user_phone_no": "1234567890",
  "user_address": "123 Main Street, City"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": 1,
    "user_name": "John Doe",
    "user_email": "john.doe@example.com"
  }
}
```

### 1.2 Login to Get JWT Token

**Method:** `POST`  
**URL:** `{{base_url}}/auth/login`  
**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "user_email": "john.doe@example.com",
  "user_password": "password123"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "user_id": 1,
      "user_name": "John Doe",
      "user_email": "john.doe@example.com"
    }
  }
}
```

**🔥 IMPORTANT: Save the Token Automatically**
1. Go to the "Tests" tab in this request
2. Add this script:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    if (response.success && response.data.access_token) {
        pm.environment.set("auth_token", response.data.access_token);
        pm.environment.set("user_id", response.data.user.user_id);
        console.log("Token saved:", response.data.access_token);
    }
}
```

---

## 🗺️ Step 2: Parking Lot Discovery

### 2.1 Get Nearby Parking Lots (Map View)

**Method:** `GET`  
**URL:** `{{base_url}}/parking/lots/nearby`  
**Headers:**
```
Authorization: Bearer {{auth_token}}
```

**Query Parameters:**
```
latitude: {{latitude}}
longitude: {{longitude}}
radius: 3000
vehicle_type: car
```

**Full URL Example:**
`{{base_url}}/parking/lots/nearby?latitude={{latitude}}&longitude={{longitude}}&radius=3000&vehicle_type=car`

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "parkinglot_id": 1,
      "name": "Nariman Point Parking",
      "address": "Nariman Point, Mumbai",
      "city": "Mumbai",
      "latitude": 18.920388,
      "longitude": 72.830130,
      "distance": 150.5,
      "availability": 25,
      "availability_status": "available",
      "hourly_rate": 2.5,
      "is_open": true,
      "vehicle_types": "car,motorcycle",
      "parking_timing": "24x7",
      "payment_modes": "Cash,Card,UPI",
      "has_cctv": "Yes",
      "has_boom_barrier": "Yes"
    }
  ],
  "total_count": 1,
  "search_params": {
    "latitude": 18.920388,
    "longitude": 72.830130,
    "radius": 3000,
    "vehicle_type": "car",
    "max_price": null,
    "min_availability": null
  }
}
```

**🔥 Save Parking Lot ID Automatically**
Add this to the "Tests" tab:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    if (response.success && response.data && response.data.length > 0) {
        pm.environment.set("parking_lot_id", response.data[0].parkinglot_id);
        console.log("Parking Lot ID saved:", response.data[0].parkinglot_id);
    }
}
```

### 2.2 Get Parking Lot Details

**Method:** `GET`  
**URL:** `{{base_url}}/parking/lots/{{parking_lot_id}}/details`  
**Headers:**
```
Authorization: Bearer {{auth_token}}
```

**Query Parameters (Optional):**
```
vehicle_type: car
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "parkinglot_id": 1,
    "name": "Nariman Point Parking",
    "address": "Nariman Point, Mumbai",
    "city": "Mumbai",
    "latitude": 18.920388,
    "longitude": 72.830130,
    "description": "Modern multi-level parking facility",
    "operating_hours": {
      "is_24x7": true,
      "opening_time": "00:00",
      "closing_time": "23:59",
      "weekly_off": "None",
      "timing_text": "Open 24/7"
    },
    "pricing_tiers": {
      "car_pricing": {
        "hourly_rate": 2.5,
        "daily_max": 20.0,
        "currency": "EUR",
        "pricing_text": "First hour: €2.50, Each additional hour: €1.50"
      },
      "two_wheeler_pricing": {
        "hourly_rate": 1.5,
        "daily_max": 12.0,
        "currency": "EUR"
      },
      "payment_modes": ["Cash", "Card", "UPI"],
      "allows_prepaid_passes": false
    },
    "capacity_info": {
      "total_capacity": 100,
      "car_capacity": 80,
      "two_wheeler_capacity": 20,
      "available_car_slots": 25,
      "available_two_wheeler_slots": 15
    },
    "real_time_availability": {
      "total_slots": 100,
      "available_slots": 25,
      "occupied_slots": 75,
      "availability_status": "available",
      "availability_percentage": 25.0,
      "last_updated": "2024-10-30T12:34:56.789Z",
      "is_currently_open": true
    },
    "facilities": {
      "security": {
        "has_cctv": true,
        "has_boom_barrier": true,
        "security_features": ["CCTV Surveillance", "Boom Barrier"]
      },
      "services": {
        "provides_valet_services": false,
        "ticket_generated": true,
        "value_added_services": []
      },
      "infrastructure": {
        "parking_surface": "Concrete",
        "entry_exit_gates": "Automated gates",
        "physical_appearance": "Multi-level concrete structure"
      }
    },
    "parking_type": "Multi-level",
    "vehicle_types_supported": ["car", "motorcycle"],
    "structure_info": {
      "total_floors": 3,
      "floor_names": ["Ground Floor", "First Floor", "Second Floor"]
    }
  }
}
```

### 2.3 Get Nearby Parking Lots with Filters

**Method:** `GET`  
**URL:** `{{base_url}}/parking/lots/nearby`  
**Headers:**
```
Authorization: Bearer {{auth_token}}
```

**Query Parameters with Filters:**
```
latitude: {{latitude}}
longitude: {{longitude}}
radius: 5000
max_price: 3.0
min_availability: 10
vehicle_type: car
```

**Full URL Example:**
`{{base_url}}/parking/lots/nearby?latitude={{latitude}}&longitude={{longitude}}&radius=5000&max_price=3.0&min_availability=10&vehicle_type=car`

---

## 🚗 Step 3: Vehicle Management

### 3.1 Create a Vehicle

**Method:** `POST`  
**URL:** `{{base_url}}/user/vehicles`  
**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{auth_token}}
```

**Body (JSON):**
```json
{
  "registration_number": "ABC123",
  "vehicle_name": "My Car",
  "make": "Toyota",
  "model": "Camry",
  "year": 2020,
  "vehicle_type": "car",
  "color": "Blue"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Vehicle registered successfully",
  "data": {
    "vehicle_id": 1,
    "registration_number": "ABC123",
    "vehicle_name": "My Car",
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "vehicle_type": "car",
    "color": "Blue",
    "is_active": true
  }
}
```

**🔥 Save Vehicle ID Automatically**
Add this to the "Tests" tab:
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    if (response.success && response.data.vehicle_id) {
        pm.environment.set("vehicle_id", response.data.vehicle_id);
        console.log("Vehicle ID saved:", response.data.vehicle_id);
    }
}
```

### 3.2 Get All User Vehicles

**Method:** `GET`  
**URL:** `{{base_url}}/user/vehicles`  
**Headers:**
```
Authorization: Bearer {{auth_token}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "vehicle_id": 1,
      "registration_number": "ABC123",
      "vehicle_name": "My Car",
      "make": "Toyota",
      "model": "Camry",
      "year": 2020,
      "vehicle_type": "car",
      "color": "Blue",
      "is_active": true
    }
  ]
}
```

### 3.3 Update a Vehicle

**Method:** `PUT`  
**URL:** `{{base_url}}/user/vehicles/{{vehicle_id}}`  
**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{auth_token}}
```

**Body (JSON):**
```json
{
  "vehicle_name": "My Updated Car",
  "make": "Honda",
  "model": "Civic",
  "year": 2021,
  "color": "Red"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Vehicle updated successfully",
  "data": {
    "vehicle_id": 1,
    "registration_number": "ABC123",
    "vehicle_name": "My Updated Car",
    "make": "Honda",
    "model": "Civic",
    "year": 2021,
    "vehicle_type": "car",
    "color": "Red",
    "is_active": true
  }
}
```

### 3.4 Delete a Vehicle

**Method:** `DELETE`  
**URL:** `{{base_url}}/user/vehicles/{{vehicle_id}}`  
**Headers:**
```
Authorization: Bearer {{auth_token}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Vehicle deleted successfully"
}
```

**Expected Error (409) - Vehicle has active sessions:**
```json
{
  "success": false,
  "error": "Cannot delete vehicle with active parking sessions"
}
```

---

## 🅿️ Step 4: Session Management

### 4.1 Start a Parking Session (Check-in)

**Method:** `POST`  
**URL:** `{{base_url}}/user/sessions/check-in`  
**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{auth_token}}
```

**Body (JSON):**
```json
{
  "vehicle_id": {{vehicle_id}},
  "parkinglot_id": {{parking_lot_id}}
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Parking session started successfully",
  "data": {
    "ticket_id": "TKT20241030123456ABC123",
    "session_id": "TKT20241030123456ABC123",
    "parking_lot_name": "Central Plaza Parking",
    "slot_location": {
      "floor_name": "Ground Floor",
      "row_name": "A",
      "slot_name": "Slot 1"
    },
    "start_time": "2024-10-30T12:34:56.789Z",
    "vehicle_info": {
      "vehicle_id": 1,
      "registration_number": "ABC123",
      "vehicle_name": "My Car",
      "make": "Toyota",
      "model": "Camry",
      "vehicle_type": "car"
    },
    "status": "active"
  }
}
```

**🔥 Save Ticket ID Automatically**
Add this to the "Tests" tab:
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    if (response.success && response.data.ticket_id) {
        pm.environment.set("ticket_id", response.data.ticket_id);
        console.log("Ticket ID saved:", response.data.ticket_id);
    }
}
```

### 4.2 Get Active Sessions

**Method:** `GET`  
**URL:** `{{base_url}}/user/sessions/active`  
**Headers:**
```
Authorization: Bearer {{auth_token}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "ticket_id": "TKT20241030123456ABC123",
      "parking_lot_name": "Central Plaza Parking",
      "parking_lot_address": "123 Main Street, Downtown",
      "vehicle_reg_no": "ABC123",
      "vehicle_info": {
        "registration_number": "ABC123",
        "vehicle_type": "car"
      },
      "start_time": "2024-10-30T12:34:56.789Z",
      "current_duration": "2h 15m",
      "duration_hours": 2.25,
      "estimated_cost": 5.0,
      "slot_location": {
        "floor_name": "Ground Floor",
        "row_name": "A",
        "slot_name": "Slot 1"
      },
      "status": "active"
    }
  ]
}
```

### 4.3 End Parking Session (Check-out)

**Method:** `POST`  
**URL:** `{{base_url}}/user/sessions/checkout`  
**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{auth_token}}
```

**Body (JSON):**
```json
{
  "ticket_id": "{{ticket_id}}",
  "payment_method": "card"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Parking session completed successfully",
  "data": {
    "ticket_id": "TKT20241030123456ABC123",
    "start_time": "2024-10-30T12:34:56.789Z",
    "end_time": "2024-10-30T14:49:56.789Z",
    "duration": "2h 15m",
    "duration_hours": 2.25,
    "total_amount": 5.0,
    "payment_status": "completed",
    "payment_method": "card",
    "receipt_url": "/receipts/1/20241030",
    "slot_location": {
      "floor_name": "Ground Floor",
      "row_name": "A",
      "slot_name": "Slot 1"
    },
    "parking_lot_name": "Central Plaza Parking"
  }
}
```

### 4.4 Get Session History

**Method:** `GET`  
**URL:** `{{base_url}}/user/sessions/history`  
**Headers:**
```
Authorization: Bearer {{auth_token}}
```

**Query Parameters (Optional):**
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20, max: 100)
- `status`: Filter by status (`completed` or `cancelled`)

**Example with parameters:**
`{{base_url}}/user/sessions/history?page=1&per_page=10&status=completed`

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "ticket_id": "TKT20241030123456ABC123",
      "parking_lot_name": "Central Plaza Parking",
      "parking_lot_address": "123 Main Street, Downtown",
      "vehicle_reg_no": "ABC123",
      "vehicle_info": {
        "registration_number": "ABC123",
        "vehicle_name": "My Car",
        "vehicle_type": "car"
      },
      "start_time": "2024-10-30T12:34:56.789Z",
      "end_time": "2024-10-30T14:49:56.789Z",
      "duration": "2h 15m",
      "duration_hours": 2.25,
      "total_amount": 5.0,
      "payment_status": "completed",
      "payment_method": "card",
      "receipt_url": "/receipts/1/20241030",
      "session_status": "completed",
      "slot_location": {
        "floor_name": "Ground Floor",
        "row_name": "A",
        "slot_name": "Slot 1"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1,
    "pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

### 4.5 Get Session Details

**Method:** `GET`  
**URL:** `{{base_url}}/user/sessions/{{ticket_id}}`  
**Headers:**
```
Authorization: Bearer {{auth_token}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "ticket_id": "TKT20241030123456ABC123",
    "parking_lot_info": {
      "id": 1,
      "name": "Central Plaza Parking",
      "address": "123 Main Street, Downtown",
      "city": "Downtown",
      "parking_timing": "24/7"
    },
    "vehicle_info": {
      "vehicle_id": 1,
      "registration_number": "ABC123",
      "vehicle_name": "My Car",
      "make": "Toyota",
      "model": "Camry",
      "vehicle_type": "car"
    },
    "session_info": {
      "start_time": "2024-10-30T12:34:56.789Z",
      "end_time": "2024-10-30T14:49:56.789Z",
      "duration": "2h 15m",
      "duration_hours": 2.25,
      "status": "completed"
    },
    "payment_info": {
      "total_amount": 5.0,
      "payment_status": "completed",
      "payment_method": "card",
      "receipt_url": "/receipts/1/20241030"
    },
    "slot_location": {
      "floor_name": "Ground Floor",
      "row_name": "A",
      "slot_name": "Slot 1",
      "floor_id": 1,
      "row_id": 1,
      "slot_id": 1
    }
  }
}
```

---

## 🔧 Step 5: Additional APIs

### 5.1 Check Super Admin Status

**Method:** `GET`  
**URL:** `{{base_url}}/auth/super-admin-status`  
**Headers:** None required

**Expected Response (200):**
```json
{
  "super_admin_exists": false,
  "can_register": true
}
```

### 5.2 Health Check

**Method:** `GET`  
**URL:** `{{base_url}}/health`  
**Headers:** None required

**Expected Response (200):**
```
OK
```

### 5.3 Update Slot Status (IoT/RPi API)

**Method:** `POST`  
**URL:** `{{base_url}}/api/v1/slots/update_status`  
**Headers:**
```
Content-Type: application/json
X-API-KEY: super-secret-rpi-key
```

**Body (JSON):**
```json
{
  "id": 1,
  "status": 1
}
```

**Expected Response (200):**
```json
{
  "message": "Slot 1 status updated to 1"
}
```

### 5.4 Get Parking Lot Statistics

**Method:** `GET`  
**URL:** `{{base_url}}/parking/lots/{{parking_lot_id}}/stats`  
**Headers:**
```
Authorization: Bearer {{auth_token}}
```

**Expected Response (200):**
```json
{
  "parkinglot_id": 1,
  "total_slots": 100,
  "available_slots": 25,
  "occupied_slots": 75
}
```

---

## 🚨 Step 6: Troubleshooting

**Method:** `GET`  
**URL:** `{{base_url}}/user/sessions/{{ticket_id}}`  
**Headers:**
```
Authorization: Bearer {{auth_token}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "ticket_id": "TKT20241030123456ABC123",
    "parking_lot_info": {
      "id": 1,
      "name": "Central Plaza Parking",
      "address": "123 Main Street, Downtown",
      "city": "Downtown",
      "parking_timing": "24/7"
    },
    "vehicle_info": {
      "vehicle_id": 1,
      "registration_number": "ABC123",
      "vehicle_name": "My Car",
      "make": "Toyota",
      "model": "Camry",
      "vehicle_type": "car"
    },
    "session_info": {
      "start_time": "2024-10-30T12:34:56.789Z",
      "end_time": "2024-10-30T14:49:56.789Z",
      "duration": "2h 15m",
      "duration_hours": 2.25,
      "status": "completed"
    },
    "payment_info": {
      "total_amount": 5.0,
      "payment_status": "completed",
      "payment_method": "card",
      "receipt_url": "/receipts/1/20241030"
    },
    "slot_location": {
      "floor_name": "Ground Floor",
      "row_name": "A",
      "slot_name": "Slot 1",
      "floor_id": 1,
      "row_id": 1,
      "slot_id": 1
    }
  }
}
```

---

## 🚨 Step 6: Troubleshooting

### Common Error Responses

#### 1. **401 Unauthorized**
```json
{
  "msg": "Missing Authorization Header"
}
```
**Solution:** Make sure you have the `Authorization: Bearer {{auth_token}}` header and the token is valid.

#### 2. **400 Bad Request - Validation Error**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "vehicle_id": ["Valid vehicle_id is required"]
  }
}
```
**Solution:** Check your request body format and required fields.

#### 3. **404 Not Found - Vehicle Not Found**
```json
{
  "success": false,
  "error": "Vehicle not found"
}
```
**Solution:** Make sure the vehicle_id exists and belongs to the authenticated user.

#### 4. **409 Conflict - Vehicle Already Has Active Session**
```json
{
  "success": false,
  "error": "Vehicle already has an active parking session"
}
```
**Solution:** Check out the existing session first, or use a different vehicle.

#### 5. **409 Conflict - No Available Slots**
```json
{
  "success": false,
  "error": "No available parking slots"
}
```
**Solution:** Try a different parking lot or wait for slots to become available.

### Debugging Steps

1. **Check Backend Server Status:**
   - Make sure your Flask backend is running on `http://localhost:5000`
   - Test with: `GET {{base_url}}/health` (should return "OK")

2. **Verify Database Connection:**
   - Ensure PostgreSQL is running
   - Check if tables exist (users, user_vehicles, parking_session, etc.)

3. **Check Token Expiration:**
   - JWT tokens expire after some time
   - If you get 401 errors, try logging in again

4. **Verify Parking Lot Data:**
   - Make sure parking lot with ID 1 exists in the database
   - Check if there are available slots
   - Ensure you're using correct coordinates for Indian cities (Mumbai: 18.920388, 72.830130)

---

## 📚 Complete API Reference

### Base URL
```
http://localhost:5000
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | User login | No |
| GET | `/auth/super-admin-status` | Check super admin status | No |

### Parking Lot Discovery Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/parking/lots/nearby` | Get nearby parking lots | Yes |
| GET | `/parking/lots/{id}/details` | Get parking lot details | Yes |
| GET | `/parking/lots/{id}/stats` | Get parking lot statistics | Yes |

### Vehicle Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/user/vehicles` | Get user vehicles | Yes |
| POST | `/user/vehicles` | Create new vehicle | Yes |
| PUT | `/user/vehicles/{id}` | Update vehicle | Yes |
| DELETE | `/user/vehicles/{id}` | Delete vehicle | Yes |

### Session Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/user/sessions/check-in` | Start parking session | Yes |
| POST | `/user/sessions/checkout` | End parking session | Yes |
| GET | `/user/sessions/active` | Get active sessions | Yes |
| GET | `/user/sessions/history` | Get session history | Yes |
| GET | `/user/sessions/{ticket_id}` | Get session details | Yes |

### System & IoT Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/api/v1/slots/update_status` | Update slot status (IoT) | API Key |

### Required Headers for Authenticated Requests
```
Content-Type: application/json
Authorization: Bearer {your_jwt_token}
```

---

## 🎯 Complete Testing Workflow Summary

### 🔄 Full Android App Workflow Testing:

1. **Setup Environment** → Create Postman environment with all variables
2. **Health Check** → Verify backend is running (`GET /health`)
3. **Register User** → Create account with email/password
4. **Login** → Get JWT token (auto-saved to environment)
5. **Discover Parking** → Find nearby parking lots (`GET /parking/lots/nearby`)
6. **Get Lot Details** → View detailed parking information (`GET /parking/lots/{id}/details`)
7. **Create Vehicle** → Register your vehicle (auto-save vehicle_id)
8. **Start Session** → Check-in to parking lot (auto-save ticket_id)
9. **Check Active Sessions** → Verify session is running
10. **Get Session Details** → View detailed session information
11. **End Session** → Check-out and process payment
12. **View History** → See completed sessions
13. **Update Vehicle** → Test vehicle management
14. **Delete Vehicle** → Test vehicle deletion (if no active sessions)

### 🧪 Additional Testing Scenarios:

- **Filter Testing** → Test parking lot filters (price, availability, distance)
- **Error Testing** → Test invalid data, missing auth, conflicts
- **Edge Cases** → Test with no parking lots, no vehicles, no sessions
- **IoT Testing** → Test slot status updates (if you have IoT devices)

## 💡 Pro Tips

1. **Use Environment Variables:** Always use `{{variable_name}}` instead of hardcoding values
2. **Auto-Save Important Data:** Use the Tests tab to automatically save tokens and IDs
3. **Test Error Cases:** Try invalid data to see how the API handles errors
4. **Check Response Times:** Monitor API performance in Postman
5. **Use Collections:** Organize your requests in Postman collections for easy reuse

---

## 🔧 Complete Setup Checklist

### Backend Setup:
- [ ] Backend server running on localhost:5000 (`docker-compose up -d`)
- [ ] PostgreSQL database running and accessible
- [ ] Health endpoint responding (`GET /health` returns "OK")
- [ ] Database has parking lot data (at least one parking lot with slots)

### Postman Setup:
- [ ] Postman environment created with all variables
- [ ] Base URL set to `http://localhost:5000`
- [ ] Latitude/longitude set to Mumbai coordinates (18.920388, 72.830130) for testing
- [ ] Auto-save scripts added to login and vehicle creation requests

### Testing Data:
- [ ] User registered and logged in
- [ ] JWT token saved in environment
- [ ] At least one parking lot exists in database
- [ ] Parking lot has available slots (status = 0)
- [ ] Vehicle created and vehicle_id saved
- [ ] Ready to test complete Android app workflow!

### Verification Steps:
- [ ] Can login and get JWT token
- [ ] Can discover nearby parking lots
- [ ] Can get parking lot details
- [ ] Can create and manage vehicles
- [ ] Can start and end parking sessions
- [ ] Can view session history

**Happy Testing! 🚀**

If you encounter any issues, check the troubleshooting section or verify that your backend server is running correctly.