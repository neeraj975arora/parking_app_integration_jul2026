# Future Parking Bookings — Feature Documentation

## Overview

BookMyShow-style advance slot reservation system. Users can reserve a parking slot at a specific lot for a future date and time window — before physically arriving.

---

## Architecture

```
Android App
    │
    ├── Check Availability  ──►  GET  /api/v1/parking/lots/{id}/availability
    ├── Create Booking      ──►  POST /api/v1/user/bookings
    ├── View Bookings       ──►  GET  /api/v1/user/bookings
    ├── View Upcoming       ──►  GET  /api/v1/user/bookings/upcoming
    ├── Check In            ──►  POST /api/v1/user/bookings/{id}/checkin
    ├── Check Out           ──►  POST /api/v1/user/bookings/{id}/checkout
    └── Cancel              ──►  DELETE /api/v1/user/bookings/{id}
```

---

## Database Table

**Table:** `parking_bookings`

| Column | Type | Description |
|--------|------|-------------|
| `booking_id` | VARCHAR(20) PK | e.g. `BK-A1B2C3` |
| `user_id` | INTEGER FK | References `users.user_id` |
| `vehicle_id` | INTEGER FK | References `user_vehicles.vehicle_id` |
| `parkinglot_id` | INTEGER FK | References `parkinglots_details.parkinglot_id` |
| `slot_id` | INTEGER FK | Reserved slot (assigned on confirm) |
| `scheduled_start` | TIMESTAMP | Booking start time |
| `scheduled_end` | TIMESTAMP | Booking end time |
| `duration_hours` | NUMERIC(6,2) | Duration in hours |
| `vehicle_type` | VARCHAR(20) | car / bike / etc. |
| `vehicle_reg_no` | VARCHAR(20) | Vehicle registration number |
| `booking_status` | VARCHAR(20) | `confirmed` → `checked_in` → `completed` / `cancelled` |
| `estimated_amount` | NUMERIC(10,2) | Estimated cost in Rs. |
| `payment_status` | VARCHAR(20) | `pending` / `paid` / `refunded` |
| `payment_method` | VARCHAR(50) | upi / card / netbanking / wallet |
| `created_at` | TIMESTAMP | When booking was created |
| `updated_at` | TIMESTAMP | Last update time |
| `cancelled_at` | TIMESTAMP | When cancelled (nullable) |
| `cancel_reason` | TEXT | Cancellation reason (nullable) |

**Indexes:**
- `idx_bookings_user_id` on `user_id`
- `idx_bookings_lot_id` on `parkinglot_id`
- `idx_bookings_status` on `booking_status`

---

## Booking Lifecycle

```
[confirmed] ──► [checked_in] ──► [completed]
     │
     └──► [cancelled]
```

| Status | Meaning |
|--------|---------|
| `confirmed` | Slot reserved, user hasn't arrived yet |
| `checked_in` | User arrived, active parking session created |
| `completed` | User checked out, payment done |
| `cancelled` | User cancelled before check-in |

---

## API Endpoints

### 1. Check Availability
```
GET /api/v1/parking/lots/{lot_id}/availability
    ?date=2026-05-20
    &start_time=10:00
    &end_time=13:00
    &vehicle_type=car
```

**Response:**
```json
{
  "success": true,
  "data": {
    "parkinglot_id": 1,
    "parking_lot_name": "Jahangirpuri Metro Parking",
    "available_slots": 120,
    "is_available": true,
    "hourly_rate": 20.0,
    "estimated_cost": 60.0,
    "duration_hours": 3.0
  }
}
```

---

### 2. Create Booking
```
POST /api/v1/user/bookings
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "parkinglot_id": 1,
  "vehicle_id": 11,
  "scheduled_start": "2026-05-20T10:00:00",
  "scheduled_end": "2026-05-20T13:00:00",
  "payment_method": "card"
}
```

**Validations:**
- Start time cannot be more than 15 minutes in the past
- End time must be after start time
- Minimum duration: 30 minutes
- Maximum duration: 24 hours
- Cannot book more than 30 days in advance
- Vehicle must belong to the authenticated user
- No overlapping bookings at the same lot

**Response (201):**
```json
{
  "success": true,
  "message": "Parking slot booked successfully",
  "data": {
    "booking_id": "BK-A1B2C3",
    "parking_lot_name": "Jahangirpuri Metro Parking",
    "slot_id": 1,
    "scheduled_start": "2026-05-20T10:00:00",
    "scheduled_end": "2026-05-20T13:00:00",
    "duration_hours": 3.0,
    "estimated_amount": 60.0,
    "booking_status": "confirmed"
  }
}
```

---

### 3. Get All Bookings
```
GET /api/v1/user/bookings
GET /api/v1/user/bookings?status=confirmed
Authorization: Bearer <token>
```

---

### 4. Get Upcoming Bookings
```
GET /api/v1/user/bookings/upcoming
Authorization: Bearer <token>
```
Returns only `confirmed` bookings with `scheduled_start > now`.

---

### 5. Get Booking Detail
```
GET /api/v1/user/bookings/{booking_id}
Authorization: Bearer <token>
```

---

### 6. Check In Against Booking
```
POST /api/v1/user/bookings/{booking_id}/checkin
Authorization: Bearer <token>
```

**Behaviour:**
- Booking must be `confirmed`
- Can check in anytime before `scheduled_end`
- Creates a real `ParkingSession` linked to the reserved slot
- Marks slot as occupied
- Changes booking status to `checked_in`

**Response (200):**
```json
{
  "success": true,
  "message": "Checked in successfully against your booking",
  "data": {
    "booking_id": "BK-A1B2C3",
    "ticket_id": "BK-BK-A1B2C3-4F2A",
    "parking_lot_name": "Jahangirpuri Metro Parking",
    "slot_location": "Slot S1",
    "start_time": "2026-05-20T10:05:00",
    "status": "active"
  }
}
```

---

### 7. Check Out
```
POST /api/v1/user/bookings/{booking_id}/checkout
Authorization: Bearer <token>
```

**Request Body:**
```json
{ "payment_method": "card" }
```

**Behaviour:**
- Booking must be `checked_in`
- Calculates actual duration and cost
- Frees the slot
- Marks booking as `completed` and payment as `paid`

---

### 8. Cancel Booking
```
DELETE /api/v1/user/bookings/{booking_id}?reason=Changed+plans
Authorization: Bearer <token>
```

**Behaviour:**
- Only `confirmed` bookings can be cancelled
- Cannot cancel after check-in
- Payment status set to `refunded` if already paid

---

## Slot Availability Algorithm

A slot is considered **free** for a time window if:
1. It is not currently occupied (`status = 0`)
2. No other confirmed/checked-in booking overlaps the requested window

```python
# Overlap check (SQL)
scheduled_start < requested_end AND scheduled_end > requested_start
```

---

## Android UI Files

| File | Purpose |
|------|---------|
| `activities/BookingsActivity.java` | Main bookings screen with tabs |
| `adapters/BookingAdapter.java` | RecyclerView adapter for booking cards |
| `models/ParkingBooking.java` | Booking data model |
| `res/layout/activity_bookings.xml` | Bookings screen layout |
| `res/layout/item_booking_card.xml` | Individual booking card layout |
| `res/layout/dialog_create_booking.xml` | New booking dialog |

---

## Backend Files

| File | Purpose |
|------|---------|
| `fastapi_app/routers/bookings.py` | All booking API endpoints |
| `fastapi_app/models.py` | `ParkingBooking` SQLAlchemy model |
| `fastapi_app/tests/test_bookings.py` | Pytest test suite |

---

## Error Codes

| HTTP | Scenario |
|------|----------|
| 400 | Invalid date/time, duration too short/long, too far in future |
| 401 | Missing or invalid JWT token |
| 404 | Booking, vehicle, or parking lot not found |
| 409 | Overlapping booking, already checked in, already cancelled |
