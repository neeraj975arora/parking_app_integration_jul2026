"""Tests for /api/v1/payments endpoints (initiate, verify, history)."""
import uuid
import pytest
from datetime import datetime, timedelta


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _add_vehicle(client, headers, reg=None):
    reg = reg or f"PAY{uuid.uuid4().hex[:6].upper()}"
    resp = client.post("/user/vehicles", json={
        "registration_number": reg,
        "vehicle_name": "Pay Car",
        "vehicle_type": "car",
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["vehicle_id"]

def _create_lot_with_slots(client, headers, n=3):
    lot = client.post("/parking/lots", json={
        "name": "Pay Test Lot",
        "address": "1 Pay St",
        "city": "Pay City",
        "latitude": 28.6315,
        "longitude": 77.2167,
        "car_parking_charge": "20/hr",
        "two_wheeler_parking_charge": "10/hr",
        "car_capacity": n,
        "available_car_slots": n,
        "two_wheeler_capacity": n,
        "available_two_wheeler_slots": n,
        "parking_timing": "24x7",
        "vehicle_types": "Car",
    }, headers=headers)
    assert lot.status_code == 201
    lot_id = lot.json()["id"]
    floor = client.post(f"/parking/lots/{lot_id}/floors", json={"name": "G"}, headers=headers)
    floor_id = floor.json()["id"]
    row = client.post(f"/parking/floors/{floor_id}/rows", json={"name": "R1"}, headers=headers)
    row_id = row.json()["id"]
    for i in range(n):
        client.post(f"/parking/rows/{row_id}/slots",
                    json={"name": f"S{i+1}", "status": 0}, headers=headers)
    return lot_id

def _create_active_session(client, headers, lot_id, vehicle_id):
    resp = client.post("/user/sessions/check-in", json={
        "vehicle_id": vehicle_id,
        "parkinglot_id": lot_id,
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["ticket_id"]

def _create_booking(client, headers, lot_id, vehicle_id):
    start = (datetime.utcnow() + timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%S")
    end   = (datetime.utcnow() + timedelta(hours=27)).strftime("%Y-%m-%dT%H:%M:%S")
    resp = client.post("/api/v1/user/bookings", json={
        "parkinglot_id": lot_id,
        "vehicle_id": vehicle_id,
        "scheduled_start": start,
        "scheduled_end": end,
        "payment_method": "card",
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["booking_id"]


# ---------------------------------------------------------------------------
# Initiate Payment
# ---------------------------------------------------------------------------

class TestInitiatePayment:

    def test_initiate_payment_for_session_upi(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        ticket_id = _create_active_session(client, user_headers, lot_id, vehicle_id)

        resp = client.post("/api/v1/payments/initiate", json={
            "payment_for": "session",
            "reference_id": ticket_id,
            "payment_method": "upi",
            "upi_id": "test@paytm",
        }, headers=user_headers)
        assert resp.status_code == 200
        d = resp.json()["data"]
        assert "order_id" in d
        assert "txn_id" in d
        assert d["amount"] >= 0
        assert d["currency"] == "INR"
        assert d["payment_method"] == "upi"
        assert d["mode"] == "simulated"

    def test_initiate_payment_for_session_card(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        ticket_id = _create_active_session(client, user_headers, lot_id, vehicle_id)

        resp = client.post("/api/v1/payments/initiate", json={
            "payment_for": "session",
            "reference_id": ticket_id,
            "payment_method": "card",
            "card_last4": "4242",
        }, headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["payment_method"] == "card"

    def test_initiate_payment_for_booking(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        booking_id = _create_booking(client, user_headers, lot_id, vehicle_id)

        resp = client.post("/api/v1/payments/initiate", json={
            "payment_for": "booking",
            "reference_id": booking_id,
            "payment_method": "netbanking",
        }, headers=user_headers)
        assert resp.status_code == 200
        d = resp.json()["data"]
        assert d["amount"] == 60.0   # 3 hrs * Rs.20/hr

    def test_initiate_invalid_payment_for_returns_400(self, client, user_headers):
        resp = client.post("/api/v1/payments/initiate", json={
            "payment_for": "invalid_type",
            "reference_id": "TICKET-001",
            "payment_method": "upi",
        }, headers=user_headers)
        assert resp.status_code == 400

    def test_initiate_invalid_payment_method_returns_400(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        ticket_id = _create_active_session(client, user_headers, lot_id, vehicle_id)
        resp = client.post("/api/v1/payments/initiate", json={
            "payment_for": "session",
            "reference_id": ticket_id,
            "payment_method": "bitcoin",
        }, headers=user_headers)
        assert resp.status_code == 400

    def test_initiate_nonexistent_session_returns_404(self, client, user_headers):
        resp = client.post("/api/v1/payments/initiate", json={
            "payment_for": "session",
            "reference_id": "TICKET-NOTREAL",
            "payment_method": "upi",
        }, headers=user_headers)
        assert resp.status_code == 404

    def test_initiate_nonexistent_booking_returns_404(self, client, user_headers):
        resp = client.post("/api/v1/payments/initiate", json={
            "payment_for": "booking",
            "reference_id": "BK-NOTREAL",
            "payment_method": "card",
        }, headers=user_headers)
        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/api/v1/payments/initiate", json={
            "payment_for": "session",
            "reference_id": "T001",
            "payment_method": "upi",
        })
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Verify Payment
# ---------------------------------------------------------------------------

class TestVerifyPayment:

    def _initiate(self, client, user_headers, method="upi"):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        ticket_id = _create_active_session(client, user_headers, lot_id, vehicle_id)
        resp = client.post("/api/v1/payments/initiate", json={
            "payment_for": "session",
            "reference_id": ticket_id,
            "payment_method": method,
            "upi_id": "test@paytm" if method == "upi" else None,
        }, headers=user_headers)
        assert resp.status_code == 200
        return resp.json()["data"]["order_id"], ticket_id

    def test_verify_payment_success(self, client, user_headers):
        order_id, ticket_id = self._initiate(client, user_headers)
        resp = client.post("/api/v1/payments/verify", json={
            "order_id": order_id,
            "payment_id": f"pay_SIM_{order_id[-6:]}",
        }, headers=user_headers)
        assert resp.status_code == 200
        d = resp.json()["data"]
        assert d["status"] == "paid"
        assert d["order_id"] == order_id
        assert "txn_id" in d
        assert "paid_at" in d
        assert d["amount"] >= 0

    def test_verify_marks_session_as_paid(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        ticket_id = _create_active_session(client, user_headers, lot_id, vehicle_id)

        init = client.post("/api/v1/payments/initiate", json={
            "payment_for": "session",
            "reference_id": ticket_id,
            "payment_method": "card",
        }, headers=user_headers)
        order_id = init.json()["data"]["order_id"]

        client.post("/api/v1/payments/verify", json={
            "order_id": order_id,
            "payment_id": "pay_SIM_CARD_001",
        }, headers=user_headers)

        # Checkout the session and verify payment_status
        checkout = client.post("/user/sessions/checkout", json={
            "ticket_id": ticket_id,
            "payment_method": "card",
        }, headers=user_headers)
        # Session should be completable (payment already done)
        assert checkout.status_code == 200

    def test_verify_nonexistent_order_returns_404(self, client, user_headers):
        resp = client.post("/api/v1/payments/verify", json={
            "order_id": "ORD-NOTREAL",
            "payment_id": "pay_SIM_001",
        }, headers=user_headers)
        assert resp.status_code == 404

    def test_verify_already_paid_returns_409(self, client, user_headers):
        order_id, _ = self._initiate(client, user_headers)
        client.post("/api/v1/payments/verify", json={
            "order_id": order_id,
            "payment_id": "pay_SIM_001",
        }, headers=user_headers)
        resp = client.post("/api/v1/payments/verify", json={
            "order_id": order_id,
            "payment_id": "pay_SIM_002",
        }, headers=user_headers)
        assert resp.status_code == 409

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/api/v1/payments/verify", json={
            "order_id": "ORD-001",
            "payment_id": "pay_001",
        })
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Payment History
# ---------------------------------------------------------------------------

class TestPaymentHistory:

    def test_history_empty_initially(self, client, user_headers):
        resp = client.get("/api/v1/payments/history", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["success"] is True
        assert resp.json()["data"] == []
        assert resp.json()["count"] == 0

    def test_history_shows_completed_payments(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        ticket_id = _create_active_session(client, user_headers, lot_id, vehicle_id)

        init = client.post("/api/v1/payments/initiate", json={
            "payment_for": "session",
            "reference_id": ticket_id,
            "payment_method": "upi",
            "upi_id": "test@gpay",
        }, headers=user_headers)
        order_id = init.json()["data"]["order_id"]

        client.post("/api/v1/payments/verify", json={
            "order_id": order_id,
            "payment_id": "pay_SIM_HIST_001",
        }, headers=user_headers)

        resp = client.get("/api/v1/payments/history", headers=user_headers)
        assert resp.json()["count"] == 1
        txn = resp.json()["data"][0]
        assert txn["status"] == "paid"
        assert txn["payment_method"] == "upi"
        assert txn["payment_for"] == "session"
        assert txn["reference_id"] == ticket_id

    def test_history_has_required_fields(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        ticket_id = _create_active_session(client, user_headers, lot_id, vehicle_id)
        init = client.post("/api/v1/payments/initiate", json={
            "payment_for": "session",
            "reference_id": ticket_id,
            "payment_method": "wallet",
            "wallet_name": "Paytm",
        }, headers=user_headers)
        order_id = init.json()["data"]["order_id"]
        client.post("/api/v1/payments/verify", json={
            "order_id": order_id, "payment_id": "pay_SIM_WALLET",
        }, headers=user_headers)

        resp = client.get("/api/v1/payments/history", headers=user_headers)
        txn = resp.json()["data"][0]
        for field in ["txn_id", "order_id", "payment_for", "reference_id",
                      "amount", "currency", "payment_method", "status",
                      "created_at", "paid_at"]:
            assert field in txn, f"Missing field: {field}"

    def test_unauthenticated_returns_401(self, client):
        assert client.get("/api/v1/payments/history").status_code == 401


# ---------------------------------------------------------------------------
# Get Single Payment
# ---------------------------------------------------------------------------

class TestGetPayment:

    def test_get_payment_by_txn_id(self, client, user_headers):
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        ticket_id = _create_active_session(client, user_headers, lot_id, vehicle_id)
        init = client.post("/api/v1/payments/initiate", json={
            "payment_for": "session",
            "reference_id": ticket_id,
            "payment_method": "upi",
            "upi_id": "test@ybl",
        }, headers=user_headers)
        order_id = init.json()["data"]["order_id"]
        verify = client.post("/api/v1/payments/verify", json={
            "order_id": order_id, "payment_id": "pay_SIM_GET",
        }, headers=user_headers)
        txn_id = verify.json()["data"]["txn_id"]

        resp = client.get(f"/api/v1/payments/{txn_id}", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["txn_id"] == txn_id
        assert resp.json()["data"]["status"] == "paid"

    def test_get_nonexistent_payment_returns_404(self, client, user_headers):
        resp = client.get("/api/v1/payments/TXN-NOTREAL", headers=user_headers)
        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, client):
        assert client.get("/api/v1/payments/TXN-001").status_code == 401


# ---------------------------------------------------------------------------
# Full Payment Workflow
# ---------------------------------------------------------------------------

class TestFullPaymentWorkflow:

    def test_complete_payment_flow_upi(self, client, user_headers):
        """Add vehicle → check-in → initiate UPI payment → verify → checkout."""
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)

        # Check-in
        ticket_id = _create_active_session(client, user_headers, lot_id, vehicle_id)

        # Initiate payment
        init = client.post("/api/v1/payments/initiate", json={
            "payment_for": "session",
            "reference_id": ticket_id,
            "payment_method": "upi",
            "upi_id": "arun@paytm",
        }, headers=user_headers)
        assert init.status_code == 200
        order_id = init.json()["data"]["order_id"]
        amount = init.json()["data"]["amount"]
        assert amount >= 0

        # Verify payment
        verify = client.post("/api/v1/payments/verify", json={
            "order_id": order_id,
            "payment_id": f"pay_SIM_{order_id[-6:]}",
        }, headers=user_headers)
        assert verify.status_code == 200
        assert verify.json()["data"]["status"] == "paid"
        txn_id = verify.json()["data"]["txn_id"]

        # Check history
        history = client.get("/api/v1/payments/history", headers=user_headers)
        txn_ids = [t["txn_id"] for t in history.json()["data"]]
        assert txn_id in txn_ids

        # Checkout session
        checkout = client.post("/user/sessions/checkout", json={
            "ticket_id": ticket_id,
            "payment_method": "upi",
        }, headers=user_headers)
        assert checkout.status_code == 200
        assert checkout.json()["data"]["status"] == "completed"

    def test_complete_payment_flow_booking(self, client, user_headers):
        """Create booking → initiate card payment → verify → booking marked paid."""
        lot_id = _create_lot_with_slots(client, user_headers)
        vehicle_id = _add_vehicle(client, user_headers)
        booking_id = _create_booking(client, user_headers, lot_id, vehicle_id)

        # Initiate card payment
        init = client.post("/api/v1/payments/initiate", json={
            "payment_for": "booking",
            "reference_id": booking_id,
            "payment_method": "card",
            "card_last4": "4242",
        }, headers=user_headers)
        assert init.status_code == 200
        order_id = init.json()["data"]["order_id"]

        # Verify
        verify = client.post("/api/v1/payments/verify", json={
            "order_id": order_id,
            "payment_id": "pay_SIM_CARD_BK",
        }, headers=user_headers)
        assert verify.status_code == 200
        assert verify.json()["data"]["status"] == "paid"

        # Booking should now be marked paid
        detail = client.get(f"/api/v1/user/bookings/{booking_id}", headers=user_headers)
        assert detail.json()["data"]["payment_status"] == "paid"
