"""Tests for /api/v1/user/bookings and /api/v1/parking/lots/{id}/availability."""
import uuid
import pytest
from datetime import datetime, timedelta


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _future(hours=24):
    return (datetime.utcnow() + timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%S")

def _future_end(start_hours=24, duration_hours=3):
    return (datetime.utcnow() + timedelta(hours=start_hours + duration_hours)).strftime("%Y-%m-%dT%H:%M:%S")

def _add_vehicle(client, headers, reg=None):
    reg = reg or f"BK{uuid.uuid4().hex[:6].upper()}"
    resp = client.post("/user/vehicles", json={
        "registration_number": reg,
        "vehicle_name": "Booking Car",
        "vehicle_type": "car",
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["vehicle_id"]

def _create_lot_with_slots(client, headers, n_slots=5):
    lot = client.post("/parking/lots", json={
        "name": "Booking Test Lot",
        "address": "1 Booking St",
        "city": "Test City",
        "latitude": 28.6315,
        "longitude": 77.2167,
        "car_parking_charge": "20/hr",
        "two_wheeler_parking_charge": "10/hr",
        "car_capacity": n_slots,
        "available_car_slots": n_slots,
        "two_wheeler_capacity": n_slots,
        "available_two_wheeler_slots": n_slots,
        "parking_timing": "24x7",
        "vehicle_types": "Car,Bike",
    }, headers=headers)
    assert lot.status_code == 201, lot.text
    lot_id = lot.json()["id"]

    floor = client.post(f"/parking/lots/{lot_id}/floors",
                        json={"name": "G"}, headers=headers)
    floor_id = floor.json()["id"]
    row = client.post(f"/parking/floors/{floor_id}/rows",
                      json={"name": "R1"}, headers=headers)
    row_id = row.json()["id"]
    for i in range(n_slots):
        client.post(f"/parking/rows/{row_id}/slots",
                    json={"name": f"S{i+1}", "status": 0}, headers=headers)
    return lot_id

def _create_booking(client, headers, lot_id, vehicle_id, start_hours=24, duration=3):
    return client.post("/api/v1/user/bookings", json={
        "parkinglot_id": lot_id,
        "vehicle_id": vehicle_id,
        "scheduled_start": _future(start_hours),
        "scheduled_end": _future_end(start_hours, duration),
        "payment_method": "upi",
    }, headers=headers)


# ---------------------------------------------------------------------------
# Availability
# ---------------------------------------------------------------------------

class TestAvailability:

    def test_availability_returns_correct_structure(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers, n_slots=10)
        tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(
            f"/api/v1/parking/lots/{lot_id}/availability"
            f"?date={tomorrow}&start_time=10:00&end_time=13:00",
            headers=user_headers,
        )
        assert resp.status_code == 200
        d = resp.json()["data"]
        assert d["parkinglot_id"] == lot_id
        assert d["total_slots"] == 10
        assert d["available_slots"] == 10
        assert d["is_available"] is True
        assert d["estimated_cost"] > 0
        assert d["duration_hours"] == 3.0

    def test_availability_nonexistent_lot_returns_404(self, client, user_headers):
        resp = client.get(
            "/api/v1/parking/lots/99999/availability?date=2026-06-01&start_time=10:00&end_time=12:00",
            headers=user_headers,
        )
        assert resp.status_code == 404

    def test_availability_end_before_start_returns_400(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        resp = client.get(
            f"/api/v1/parking/lots/{lot_id}/availability"
            f"?date=2026-06-01&start_time=14:00&end_time=10:00",
            headers=user_headers,
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Create Booking
# ---------------------------------------------------------------------------

class TestCreateBooking:

    def test_create_booking_success(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        resp = _create_booking(client, user_headers, lot_id, vehicle_id)
        assert resp.status_code == 201
        d = resp.json()["data"]
        assert d["booking_status"] == "confirmed"
        assert d["parkinglot_id"] == lot_id
        assert d["vehicle_id"] == vehicle_id
        assert d["estimated_amount"] > 0
        assert d["booking_id"].startswith("BK-")
        assert d["slot_id"] is not None

    def test_create_booking_invalid_vehicle_returns_404(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        resp = _create_booking(client, user_headers, lot_id, 99999)
        assert resp.status_code == 404

    def test_create_booking_invalid_lot_returns_404(self, client, user_headers):
        vehicle_id = _add_vehicle(client, user_headers)
        resp = _create_booking(client, user_headers, 99999, vehicle_id)
        assert resp.status_code == 404

    def test_create_booking_end_before_start_returns_400(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        resp = client.post("/api/v1/user/bookings", json={
            "parkinglot_id": lot_id,
            "vehicle_id": vehicle_id,
            "scheduled_start": _future(48),
            "scheduled_end": _future(24),   # end before start
        }, headers=user_headers)
        assert resp.status_code == 400

    def test_create_booking_too_far_in_future_returns_400(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        resp = client.post("/api/v1/user/bookings", json={
            "parkinglot_id": lot_id,
            "vehicle_id": vehicle_id,
            "scheduled_start": _future(24 * 35),   # 35 days ahead
            "scheduled_end": _future(24 * 35 + 2),
        }, headers=user_headers)
        assert resp.status_code == 400

    def test_create_booking_too_short_returns_400(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        start = datetime.utcnow() + timedelta(hours=24)
        end = start + timedelta(minutes=10)   # only 10 min
        resp = client.post("/api/v1/user/bookings", json={
            "parkinglot_id": lot_id,
            "vehicle_id": vehicle_id,
            "scheduled_start": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "scheduled_end": end.strftime("%Y-%m-%dT%H:%M:%S"),
        }, headers=user_headers)
        assert resp.status_code == 400

    def test_duplicate_booking_same_lot_same_time_returns_409(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        v1 = _add_vehicle(client, user_headers)
        v2 = _add_vehicle(client, user_headers)
        _create_booking(client, user_headers, lot_id, v1, start_hours=24)
        resp = _create_booking(client, user_headers, lot_id, v2, start_hours=24)
        # Second booking for same user at same lot same time should conflict
        assert resp.status_code == 409

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/api/v1/user/bookings", json={
            "parkinglot_id": 1, "vehicle_id": 1,
            "scheduled_start": _future(24), "scheduled_end": _future_end(24, 2),
        })
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Get Bookings
# ---------------------------------------------------------------------------

class TestGetBookings:

    def test_get_all_bookings_empty(self, client, user_headers):
        resp = client.get("/api/v1/user/bookings", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["success"] is True
        assert resp.json()["data"] == []

    def test_get_all_bookings_shows_created(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        _create_booking(client, user_headers, lot_id, vehicle_id)
        resp = client.get("/api/v1/user/bookings", headers=user_headers)
        assert resp.json()["count"] == 1

    def test_get_upcoming_bookings(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        _create_booking(client, user_headers, lot_id, vehicle_id)
        resp = client.get("/api/v1/user/bookings/upcoming", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["count"] == 1

    def test_get_booking_detail(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        create = _create_booking(client, user_headers, lot_id, vehicle_id)
        booking_id = create.json()["data"]["booking_id"]
        resp = client.get(f"/api/v1/user/bookings/{booking_id}", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["booking_id"] == booking_id

    def test_get_nonexistent_booking_returns_404(self, client, user_headers):
        resp = client.get("/api/v1/user/bookings/BK-NOTREAL", headers=user_headers)
        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, client):
        assert client.get("/api/v1/user/bookings").status_code == 401
        assert client.get("/api/v1/user/bookings/upcoming").status_code == 401


# ---------------------------------------------------------------------------
# Cancel Booking
# ---------------------------------------------------------------------------

class TestCancelBooking:

    def test_cancel_confirmed_booking_success(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        create = _create_booking(client, user_headers, lot_id, vehicle_id)
        booking_id = create.json()["data"]["booking_id"]

        resp = client.delete(f"/api/v1/user/bookings/{booking_id}",
                             params={"reason": "Changed plans"},
                             headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        # Verify status changed
        detail = client.get(f"/api/v1/user/bookings/{booking_id}", headers=user_headers)
        assert detail.json()["data"]["booking_status"] == "cancelled"

    def test_cancel_nonexistent_booking_returns_404(self, client, user_headers):
        resp = client.delete("/api/v1/user/bookings/BK-NOTREAL", headers=user_headers)
        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, client):
        resp = client.delete("/api/v1/user/bookings/BK-NOTREAL")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Check-in
# ---------------------------------------------------------------------------

class TestBookingCheckin:

    def test_checkin_confirmed_booking_success(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        create = _create_booking(client, user_headers, lot_id, vehicle_id)
        booking_id = create.json()["data"]["booking_id"]

        resp = client.post(f"/api/v1/user/bookings/{booking_id}/checkin",
                           json={}, headers=user_headers)
        assert resp.status_code == 200
        d = resp.json()["data"]
        assert d["booking_id"] == booking_id
        assert "ticket_id" in d
        assert d["status"] == "active"
        assert "slot_location" in d

    def test_checkin_cancelled_booking_returns_409(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        create = _create_booking(client, user_headers, lot_id, vehicle_id)
        booking_id = create.json()["data"]["booking_id"]

        client.delete(f"/api/v1/user/bookings/{booking_id}", headers=user_headers)
        resp = client.post(f"/api/v1/user/bookings/{booking_id}/checkin",
                           json={}, headers=user_headers)
        assert resp.status_code == 409

    def test_checkin_nonexistent_booking_returns_404(self, client, user_headers):
        resp = client.post("/api/v1/user/bookings/BK-NOTREAL/checkin",
                           json={}, headers=user_headers)
        assert resp.status_code == 404

    def test_double_checkin_returns_409(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        create = _create_booking(client, user_headers, lot_id, vehicle_id)
        booking_id = create.json()["data"]["booking_id"]

        client.post(f"/api/v1/user/bookings/{booking_id}/checkin",
                    json={}, headers=user_headers)
        resp = client.post(f"/api/v1/user/bookings/{booking_id}/checkin",
                           json={}, headers=user_headers)
        assert resp.status_code == 409
