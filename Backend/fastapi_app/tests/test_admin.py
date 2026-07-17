"""Tests for /admin endpoints (register admin, lot assignment, checkin/checkout, closure)."""
import uuid
import pytest
from datetime import date, timedelta


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_lot(client, super_admin_headers):
    """Create a parking lot via the API and return its id."""
    resp = client.post("/parking/lots", json={
        "name": "Admin Test Lot",
        "address": "1 Admin St",
        "city": "Admin City",
        "latitude": 28.6,
        "longitude": 77.2,
        "car_parking_charge": "20/hr",
        "two_wheeler_parking_charge": "10/hr",
        "car_capacity": 5,
        "available_car_slots": 5,
        "two_wheeler_capacity": 5,
        "available_two_wheeler_slots": 5,
        "parking_timing": "24x7",
        "vehicle_types": "Car,Bike",
    }, headers=super_admin_headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _create_slot(client, super_admin_headers, lot_id):
    """Create floor → row → slot under a lot and return slot_id."""
    floor = client.post(f"/parking/lots/{lot_id}/floors",
                        json={"name": "G"}, headers=super_admin_headers)
    floor_id = floor.json()["id"]
    row = client.post(f"/parking/floors/{floor_id}/rows",
                      json={"name": "R1"}, headers=super_admin_headers)
    row_id = row.json()["id"]
    slot = client.post(f"/parking/rows/{row_id}/slots",
                       json={"name": "S1", "status": 0}, headers=super_admin_headers)
    return slot.json()["id"]


def _get_admin_id(client, admin_headers):
    """Extract admin user_id from the JWT token in admin_headers."""
    import base64, json as _json
    token = admin_headers["Authorization"].split(" ")[1]
    # JWT payload is the second segment, base64url-encoded
    payload_b64 = token.split(".")[1]
    # Add padding if needed
    payload_b64 += "=" * (4 - len(payload_b64) % 4)
    payload = _json.loads(base64.urlsafe_b64decode(payload_b64))
    return int(payload.get("user_id") or payload.get("sub"))


# ---------------------------------------------------------------------------
# Admin Registration
# ---------------------------------------------------------------------------

class TestAdminRegistration:

    def test_super_admin_can_register_admin(self, client, super_admin_headers):
        uid = str(uuid.uuid4())[:8]
        resp = client.post("/admin/register_admin", json={
            "user_name": f"admin_{uid}",
            "user_email": f"admin_{uid}@example.com",
            "user_password": "adminpass",
            "user_phone_no": f"8{uid[:9].ljust(9,'0')}",
            "user_address": "Admin HQ",
        }, headers=super_admin_headers)
        assert resp.status_code == 201
        assert resp.json()["msg"] == "Admin registered successfully"
        assert resp.json()["role"] == "admin"

    def test_non_super_admin_cannot_register_admin(self, client, user_headers):
        uid = str(uuid.uuid4())[:8]
        resp = client.post("/admin/register_admin", json={
            "user_name": f"admin_{uid}",
            "user_email": f"admin_{uid}@example.com",
            "user_password": "adminpass",
            "user_phone_no": f"8{uid[:9].ljust(9,'0')}",
            "user_address": "Admin HQ",
        }, headers=user_headers)
        assert resp.status_code == 403

    def test_admin_cannot_register_another_admin(self, client, admin_headers):
        uid = str(uuid.uuid4())[:8]
        resp = client.post("/admin/register_admin", json={
            "user_name": f"admin2_{uid}",
            "user_email": f"admin2_{uid}@example.com",
            "user_password": "adminpass",
            "user_phone_no": f"7{uid[:9].ljust(9,'0')}",
            "user_address": "Admin HQ",
        }, headers=admin_headers)
        assert resp.status_code == 403

    def test_duplicate_email_returns_409(self, client, super_admin_headers):
        uid = str(uuid.uuid4())[:8]
        email = f"dup_admin_{uid}@example.com"
        phone1 = f"8{uid[:9].ljust(9,'0')}"
        phone2 = f"9{uid[:9].ljust(9,'0')}"
        client.post("/admin/register_admin", json={
            "user_name": f"admin1_{uid}",
            "user_email": email,
            "user_password": "adminpass",
            "user_phone_no": phone1,
            "user_address": "HQ",
        }, headers=super_admin_headers)
        resp = client.post("/admin/register_admin", json={
            "user_name": f"admin2_{uid}",
            "user_email": email,
            "user_password": "adminpass",
            "user_phone_no": phone2,
            "user_address": "HQ",
        }, headers=super_admin_headers)
        assert resp.status_code == 409

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/admin/register_admin", json={
            "user_name": "x", "user_email": "x@x.com",
            "user_password": "x", "user_phone_no": "1234567890",
            "user_address": "x",
        })
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Lot Assignment
# ---------------------------------------------------------------------------

class TestLotAssignment:

    def test_assign_existing_lot_success(self, client, super_admin_headers, admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        admin_id = _get_admin_id(client, admin_headers)

        resp = client.post("/admin/assign_existing_lot", json={
            "admin_id": admin_id,
            "parking_lot_id": lot_id,
        }, headers=super_admin_headers)
        assert resp.status_code == 201

    def test_assign_lot_nonexistent_admin_returns_404(self, client, super_admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        resp = client.post("/admin/assign_existing_lot", json={
            "admin_id": 99999,
            "parking_lot_id": lot_id,
        }, headers=super_admin_headers)
        assert resp.status_code == 404

    def test_assign_lot_nonexistent_lot_returns_404(self, client, super_admin_headers, admin_headers):
        admin_id = _get_admin_id(client, admin_headers)
        resp = client.post("/admin/assign_existing_lot", json={
            "admin_id": admin_id,
            "parking_lot_id": 99999,
        }, headers=super_admin_headers)
        assert resp.status_code == 404

    def test_duplicate_assignment_returns_409(self, client, super_admin_headers, admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        admin_id = _get_admin_id(client, admin_headers)
        client.post("/admin/assign_existing_lot", json={
            "admin_id": admin_id, "parking_lot_id": lot_id,
        }, headers=super_admin_headers)
        resp = client.post("/admin/assign_existing_lot", json={
            "admin_id": admin_id, "parking_lot_id": lot_id,
        }, headers=super_admin_headers)
        assert resp.status_code == 409

    def test_non_super_admin_cannot_assign_lot(self, client, admin_headers, super_admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        admin_id = _get_admin_id(client, admin_headers)
        resp = client.post("/admin/assign_existing_lot", json={
            "admin_id": admin_id, "parking_lot_id": lot_id,
        }, headers=admin_headers)
        assert resp.status_code == 403

    def test_get_lots_for_admin(self, client, super_admin_headers, admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        admin_id = _get_admin_id(client, admin_headers)
        client.post("/admin/assign_existing_lot", json={
            "admin_id": admin_id, "parking_lot_id": lot_id,
        }, headers=super_admin_headers)

        resp = client.get(f"/admin/admin_lots/{admin_id}", headers=admin_headers)
        assert resp.status_code == 200
        lot_ids = [l["parkinglot_id"] for l in resp.json()["assigned_lots"]]
        assert lot_id in lot_ids

    def test_remove_assignment(self, client, super_admin_headers, admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        admin_id = _get_admin_id(client, admin_headers)
        client.post("/admin/assign_existing_lot", json={
            "admin_id": admin_id, "parking_lot_id": lot_id,
        }, headers=super_admin_headers)

        resp = client.request(
            "DELETE",
            "/admin/remove_assignment",
            json={"admin_id": admin_id, "parking_lot_id": lot_id},
            headers=super_admin_headers,
        )
        assert resp.status_code == 200

    def test_remove_nonexistent_assignment_returns_404(self, client, super_admin_headers, admin_headers):
        admin_id = _get_admin_id(client, admin_headers)
        resp = client.request(
            "DELETE",
            "/admin/remove_assignment",
            json={"admin_id": admin_id, "parking_lot_id": 99999},
            headers=super_admin_headers,
        )
        assert resp.status_code == 404

    def test_get_all_admin_lots(self, client, super_admin_headers):
        resp = client.get("/admin/admin_lots/all", headers=super_admin_headers)
        assert resp.status_code == 200
        assert "data" in resp.json()

    def test_non_super_admin_cannot_get_all_lots(self, client, user_headers):
        resp = client.get("/admin/admin_lots/all", headers=user_headers)
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Admin Checkin / Checkout
# ---------------------------------------------------------------------------

class TestAdminCheckinCheckout:

    def test_checkin_success(self, client, super_admin_headers, admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        slot_id = _create_slot(client, super_admin_headers, lot_id)

        resp = client.post("/admin/session/checkin", json={
            "vehicle_reg_no": "DL01AB1234",
            "slot_id": slot_id,
            "lot_id": lot_id,
            "vehicle_type": "Car",
        }, headers=admin_headers)
        assert resp.status_code == 200
        assert "session_id" in resp.json()

    def test_checkin_occupied_slot_returns_409(self, client, super_admin_headers, admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        slot_id = _create_slot(client, super_admin_headers, lot_id)

        client.post("/admin/session/checkin", json={
            "vehicle_reg_no": "DL01AB0001",
            "slot_id": slot_id, "lot_id": lot_id, "vehicle_type": "Car",
        }, headers=admin_headers)

        resp = client.post("/admin/session/checkin", json={
            "vehicle_reg_no": "DL01AB0002",
            "slot_id": slot_id, "lot_id": lot_id, "vehicle_type": "Car",
        }, headers=admin_headers)
        assert resp.status_code == 409

    def test_checkin_duplicate_vehicle_returns_409(self, client, super_admin_headers, admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        slot1_id = _create_slot(client, super_admin_headers, lot_id)

        # Create a second slot
        floor = client.post(f"/parking/lots/{lot_id}/floors",
                            json={"name": "G2"}, headers=super_admin_headers)
        floor_id = floor.json()["id"]
        row = client.post(f"/parking/floors/{floor_id}/rows",
                          json={"name": "R2"}, headers=super_admin_headers)
        row_id = row.json()["id"]
        slot2 = client.post(f"/parking/rows/{row_id}/slots",
                            json={"name": "S2", "status": 0}, headers=super_admin_headers)
        slot2_id = slot2.json()["id"]

        client.post("/admin/session/checkin", json={
            "vehicle_reg_no": "DL01AB9999",
            "slot_id": slot1_id, "lot_id": lot_id, "vehicle_type": "Car",
        }, headers=admin_headers)

        resp = client.post("/admin/session/checkin", json={
            "vehicle_reg_no": "DL01AB9999",
            "slot_id": slot2_id, "lot_id": lot_id, "vehicle_type": "Car",
        }, headers=admin_headers)
        assert resp.status_code == 409

    def test_checkin_nonexistent_slot_returns_404(self, client, super_admin_headers, admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        resp = client.post("/admin/session/checkin", json={
            "vehicle_reg_no": "DL01AB0000",
            "slot_id": 99999, "lot_id": lot_id, "vehicle_type": "Car",
        }, headers=admin_headers)
        assert resp.status_code == 404

    def test_checkout_success(self, client, super_admin_headers, admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        slot_id = _create_slot(client, super_admin_headers, lot_id)

        client.post("/admin/session/checkin", json={
            "vehicle_reg_no": "DL01AB5555",
            "slot_id": slot_id, "lot_id": lot_id, "vehicle_type": "Car",
        }, headers=admin_headers)

        resp = client.post("/admin/session/checkout", json={
            "vehicle_reg_no": "DL01AB5555",
        }, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "amount_paid" in data
        assert "duration_hours" in data
        assert "checkout_time" in data

    def test_checkout_no_active_session_returns_404(self, client, admin_headers):
        resp = client.post("/admin/session/checkout", json={
            "vehicle_reg_no": "NOSESSION99",
        }, headers=admin_headers)
        assert resp.status_code == 404

    def test_user_cannot_checkin(self, client, user_headers, super_admin_headers):
        lot_id = _create_lot(client, super_admin_headers)
        slot_id = _create_slot(client, super_admin_headers, lot_id)
        resp = client.post("/admin/session/checkin", json={
            "vehicle_reg_no": "DL01AB0000",
            "slot_id": slot_id, "lot_id": lot_id, "vehicle_type": "Car",
        }, headers=user_headers)
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Daily Closure
# ---------------------------------------------------------------------------

class TestDailyClosure:

    def test_post_closure_success(self, client, admin_headers):
        resp = client.post("/admin/closure", json={"payment_made": 100.0},
                           headers=admin_headers)
        assert resp.status_code == 201
        data = resp.json()
        for key in ["opening_balance", "today_collection", "payment_made", "closing_balance"]:
            assert key in data
        assert data["payment_made"] == 100.0

    def test_post_closure_defaults_payment_to_zero(self, client, admin_headers):
        resp = client.post("/admin/closure", json={}, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["payment_made"] == 0.0

    def test_post_closure_duplicate_updates_existing(self, client, admin_headers):
        client.post("/admin/closure", json={"payment_made": 50.0}, headers=admin_headers)
        resp = client.post("/admin/closure", json={"payment_made": 75.0}, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["payment_made"] == 75.0

    def test_get_closure_returns_list(self, client, admin_headers):
        client.post("/admin/closure", json={"payment_made": 10.0}, headers=admin_headers)
        resp = client.get("/admin/closure", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_get_closure_date_filter(self, client, admin_headers):
        today = date.today().isoformat()
        resp = client.get(f"/admin/closure?start_date={today}&end_date={today}",
                          headers=admin_headers)
        assert resp.status_code == 200

    def test_get_closure_invalid_date_returns_400(self, client, admin_headers):
        resp = client.get("/admin/closure?start_date=not-a-date", headers=admin_headers)
        assert resp.status_code == 400

    def test_user_cannot_access_closure(self, client, user_headers):
        resp = client.post("/admin/closure", json={"payment_made": 10.0},
                           headers=user_headers)
        assert resp.status_code == 403
        resp = client.get("/admin/closure", headers=user_headers)
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client):
        assert client.post("/admin/closure", json={}).status_code == 401
        assert client.get("/admin/closure").status_code == 401

    def test_total_due_endpoint(self, client, admin_headers):
        resp = client.get("/admin/total_due", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "outstanding_amount" in data
        assert "today_collection" in data
        assert "date" in data
