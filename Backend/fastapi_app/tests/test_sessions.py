"""Tests for /user/sessions endpoints (check-in, checkout, active, history)."""
import uuid
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _add_vehicle(client, headers, reg="SESS001"):
    resp = client.post("/user/vehicles", json={
        "registration_number": reg,
        "vehicle_name": "Session Car",
        "vehicle_type": "car",
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["vehicle_id"]


def _checkin(client, headers, vehicle_id, lot_id):
    return client.post("/user/sessions/check-in", json={
        "vehicle_id": vehicle_id,
        "parkinglot_id": lot_id,
    }, headers=headers)


# ---------------------------------------------------------------------------
# Check-in
# ---------------------------------------------------------------------------

class TestCheckin:

    def test_checkin_success(self, client, user_headers, parking_setup):
        vehicle_id = _add_vehicle(client, user_headers)
        resp = _checkin(client, user_headers, vehicle_id, parking_setup["lot_id"])
        assert resp.status_code == 201
        data = resp.json()
        assert data["success"] is True
        assert "ticket_id" in data["data"]
        assert data["data"]["status"] == "active"
        assert "slot_location" in data["data"]
        assert "vehicle_info" in data["data"]

    def test_checkin_invalid_vehicle_returns_404(self, client, user_headers, parking_setup):
        resp = _checkin(client, user_headers, 99999, parking_setup["lot_id"])
        assert resp.status_code == 404
        assert resp.json()["success"] is False

    def test_checkin_invalid_lot_returns_404(self, client, user_headers, parking_setup):
        vehicle_id = _add_vehicle(client, user_headers, "INVLOT1")
        resp = _checkin(client, user_headers, vehicle_id, 99999)
        assert resp.status_code == 404

    def test_checkin_duplicate_active_session_returns_409(self, client, user_headers, parking_setup):
        vehicle_id = _add_vehicle(client, user_headers, "DUP001")
        _checkin(client, user_headers, vehicle_id, parking_setup["lot_id"])
        resp = _checkin(client, user_headers, vehicle_id, parking_setup["lot_id"])
        assert resp.status_code == 409
        assert "already has an active" in resp.json()["error"]

    def test_checkin_full_lot_returns_409(self, client, user_headers, parking_setup):
        """Fill all 3 slots then try a 4th check-in."""
        for i in range(3):
            vid = _add_vehicle(client, user_headers, f"FULL{i:03d}")
            r = _checkin(client, user_headers, vid, parking_setup["lot_id"])
            assert r.status_code == 201

        extra_vid = _add_vehicle(client, user_headers, "EXTRA01")
        resp = _checkin(client, user_headers, extra_vid, parking_setup["lot_id"])
        assert resp.status_code == 409
        assert "no available parking slots" in resp.json()["error"]

    def test_checkin_negative_ids_returns_400(self, client, user_headers, parking_setup):
        resp = client.post("/user/sessions/check-in", json={
            "vehicle_id": -1,
            "parkinglot_id": -1,
        }, headers=user_headers)
        assert resp.status_code == 400

    def test_checkin_unauthenticated_returns_401(self, client):
        resp = client.post("/user/sessions/check-in", json={
            "vehicle_id": 1, "parkinglot_id": 1,
        })
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------------------

class TestCheckout:

    def _start_session(self, client, user_headers, parking_setup):
        vehicle_id = _add_vehicle(client, user_headers, f"CO{uuid.uuid4().hex[:6].upper()}")
        resp = _checkin(client, user_headers, vehicle_id, parking_setup["lot_id"])
        assert resp.status_code == 201
        return resp.json()["data"]["ticket_id"]

    def test_checkout_success(self, client, user_headers, parking_setup):
        ticket_id = self._start_session(client, user_headers, parking_setup)
        resp = client.post("/user/sessions/checkout", json={
            "ticket_id": ticket_id,
            "payment_method": "card",
        }, headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["ticket_id"] == ticket_id
        assert data["payment_status"] == "completed"
        assert data["status"] == "completed"
        assert "total_amount" in data
        assert "duration_hours" in data
        assert "end_time" in data

    def test_checkout_all_payment_methods(self, client, user_headers, parking_setup):
        for method in ["card", "cash", "upi", "netbanking"]:
            ticket_id = self._start_session(client, user_headers, parking_setup)
            resp = client.post("/user/sessions/checkout", json={
                "ticket_id": ticket_id,
                "payment_method": method,
            }, headers=user_headers)
            assert resp.status_code == 200, f"Failed for method: {method}"
            assert resp.json()["data"]["payment_method"] == method

    def test_checkout_invalid_payment_method_returns_400(self, client, user_headers, parking_setup):
        ticket_id = self._start_session(client, user_headers, parking_setup)
        resp = client.post("/user/sessions/checkout", json={
            "ticket_id": ticket_id,
            "payment_method": "bitcoin",
        }, headers=user_headers)
        assert resp.status_code == 400

    def test_checkout_invalid_ticket_returns_404(self, client, user_headers):
        resp = client.post("/user/sessions/checkout", json={
            "ticket_id": "INVALID_TICKET_XYZ",
            "payment_method": "card",
        }, headers=user_headers)
        assert resp.status_code == 404

    def test_checkout_already_completed_returns_404(self, client, user_headers, parking_setup):
        ticket_id = self._start_session(client, user_headers, parking_setup)
        client.post("/user/sessions/checkout", json={
            "ticket_id": ticket_id, "payment_method": "card",
        }, headers=user_headers)
        # Second checkout attempt
        resp = client.post("/user/sessions/checkout", json={
            "ticket_id": ticket_id, "payment_method": "card",
        }, headers=user_headers)
        assert resp.status_code == 404

    def test_checkout_missing_ticket_id_returns_400(self, client, user_headers):
        resp = client.post("/user/sessions/checkout", json={
            "payment_method": "card",
        }, headers=user_headers)
        # FastAPI returns 422 for missing required Pydantic fields; 400 for app-level validation
        assert resp.status_code in (400, 422)

    def test_checkout_unauthenticated_returns_401(self, client):
        resp = client.post("/user/sessions/checkout", json={
            "ticket_id": "ABC", "payment_method": "card",
        })
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Active sessions
# ---------------------------------------------------------------------------

class TestActiveSessions:

    def test_active_sessions_empty(self, client, user_headers):
        resp = client.get("/user/sessions/active", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"] == []
        assert data["count"] == 0

    def test_active_sessions_shows_checkedin_session(self, client, user_headers, parking_setup):
        vehicle_id = _add_vehicle(client, user_headers, "ACT001")
        checkin_resp = _checkin(client, user_headers, vehicle_id, parking_setup["lot_id"])
        ticket_id = checkin_resp.json()["data"]["ticket_id"]

        resp = client.get("/user/sessions/active", headers=user_headers)
        assert resp.status_code == 200
        tickets = [s["ticket_id"] for s in resp.json()["data"]]
        assert ticket_id in tickets

    def test_active_session_has_required_fields(self, client, user_headers, parking_setup):
        vehicle_id = _add_vehicle(client, user_headers, "ACT002")
        _checkin(client, user_headers, vehicle_id, parking_setup["lot_id"])

        resp = client.get("/user/sessions/active", headers=user_headers)
        session = resp.json()["data"][0]
        for field in ["ticket_id", "parking_lot_name", "checkin_time",
                      "current_duration", "estimated_cost", "status"]:
            assert field in session, f"Missing field: {field}"
        assert session["status"] == "active"

    def test_completed_session_not_in_active(self, client, user_headers, parking_setup):
        vehicle_id = _add_vehicle(client, user_headers, "ACT003")
        checkin_resp = _checkin(client, user_headers, vehicle_id, parking_setup["lot_id"])
        ticket_id = checkin_resp.json()["data"]["ticket_id"]

        client.post("/user/sessions/checkout", json={
            "ticket_id": ticket_id, "payment_method": "card",
        }, headers=user_headers)

        resp = client.get("/user/sessions/active", headers=user_headers)
        tickets = [s["ticket_id"] for s in resp.json()["data"]]
        assert ticket_id not in tickets

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/user/sessions/active")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Session history
# ---------------------------------------------------------------------------

class TestSessionHistory:

    def test_history_empty_initially(self, client, user_headers):
        resp = client.get("/user/sessions/history", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        assert "pagination" in data

    def test_completed_session_appears_in_history(self, client, user_headers, parking_setup):
        vehicle_id = _add_vehicle(client, user_headers, "HIST001")
        checkin_resp = _checkin(client, user_headers, vehicle_id, parking_setup["lot_id"])
        ticket_id = checkin_resp.json()["data"]["ticket_id"]

        client.post("/user/sessions/checkout", json={
            "ticket_id": ticket_id, "payment_method": "upi",
        }, headers=user_headers)

        resp = client.get("/user/sessions/history", headers=user_headers)
        tickets = [s["ticket_id"] for s in resp.json()["data"]]
        assert ticket_id in tickets

    def test_history_pagination_defaults(self, client, user_headers):
        resp = client.get("/user/sessions/history", headers=user_headers)
        pagination = resp.json()["pagination"]
        assert pagination["page"] == 1
        assert pagination["per_page"] == 10

    def test_history_custom_pagination(self, client, user_headers):
        resp = client.get("/user/sessions/history?page=2&per_page=5", headers=user_headers)
        pagination = resp.json()["pagination"]
        assert pagination["page"] == 2
        assert pagination["per_page"] == 5

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/user/sessions/history")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Session details
# ---------------------------------------------------------------------------

class TestSessionDetails:

    def test_get_active_session_details(self, client, user_headers, parking_setup):
        vehicle_id = _add_vehicle(client, user_headers, "DET001")
        checkin_resp = _checkin(client, user_headers, vehicle_id, parking_setup["lot_id"])
        ticket_id = checkin_resp.json()["data"]["ticket_id"]

        resp = client.get(f"/user/sessions/{ticket_id}", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["ticket_id"] == ticket_id
        assert data["session_info"]["status"] == "active"
        for field in ["parking_lot_info", "vehicle_info", "payment_info",
                      "slot_location", "checkin_time", "duration_hours", "total_amount"]:
            assert field in data, f"Missing field: {field}"

    def test_get_invalid_ticket_returns_404(self, client, user_headers):
        resp = client.get("/user/sessions/INVALID_TICKET_XYZ", headers=user_headers)
        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/user/sessions/SOMETICKET")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Full workflow
# ---------------------------------------------------------------------------

class TestFullSessionWorkflow:

    def test_complete_workflow(self, client, user_headers, parking_setup):
        """Register vehicle → check-in → verify active → get details → checkout → verify history."""
        # 1. Add vehicle
        vehicle_id = _add_vehicle(client, user_headers, "WF001")

        # 2. Check-in
        checkin_resp = _checkin(client, user_headers, vehicle_id, parking_setup["lot_id"])
        assert checkin_resp.status_code == 201
        ticket_id = checkin_resp.json()["data"]["ticket_id"]

        # 3. Verify in active sessions
        active_resp = client.get("/user/sessions/active", headers=user_headers)
        tickets = [s["ticket_id"] for s in active_resp.json()["data"]]
        assert ticket_id in tickets

        # 4. Get session details
        details_resp = client.get(f"/user/sessions/{ticket_id}", headers=user_headers)
        assert details_resp.status_code == 200
        assert details_resp.json()["data"]["session_info"]["status"] == "active"

        # 5. Checkout
        checkout_resp = client.post("/user/sessions/checkout", json={
            "ticket_id": ticket_id,
            "payment_method": "upi",
        }, headers=user_headers)
        assert checkout_resp.status_code == 200
        assert checkout_resp.json()["data"]["payment_method"] == "upi"
        assert checkout_resp.json()["data"]["status"] == "completed"

        # 6. No longer in active sessions
        active_after = client.get("/user/sessions/active", headers=user_headers)
        tickets_after = [s["ticket_id"] for s in active_after.json()["data"]]
        assert ticket_id not in tickets_after

        # 7. Appears in history
        history_resp = client.get("/user/sessions/history", headers=user_headers)
        history_tickets = [s["ticket_id"] for s in history_resp.json()["data"]]
        assert ticket_id in history_tickets
