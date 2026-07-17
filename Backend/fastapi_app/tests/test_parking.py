"""Tests for parking lot, floor, row, and slot endpoints."""
import pytest


LOT_PAYLOAD = {
    "name": "Test Lot",
    "address": "123 Test Ave",
    "city": "Testville",
    "landmark": "Near Test Landmark",
    "latitude": 28.6315,
    "longitude": 77.2167,
    "physical_appearance": "Multi-storey",
    "parking_ownership": "Private",
    "parking_surface": "Concrete",
    "has_cctv": "Yes",
    "has_boom_barrier": "Yes",
    "ticket_generated": "Yes",
    "entry_exit_gates": "2",
    "weekly_off": "Sunday",
    "parking_timing": "24x7",
    "vehicle_types": "Car,Bike",
    "car_capacity": 50,
    "available_car_slots": 50,
    "two_wheeler_capacity": 100,
    "available_two_wheeler_slots": 100,
    "parking_type": "Open",
    "payment_modes": "Cash,Card,UPI",
    "car_parking_charge": "20/hr",
    "two_wheeler_parking_charge": "10/hr",
    "allows_prepaid_passes": "Yes",
    "provides_valet_services": "No",
    "value_added_services": "Car Wash",
}


# ---------------------------------------------------------------------------
# Parking Lots
# ---------------------------------------------------------------------------

class TestParkingLots:

    def test_create_lot_success(self, client, user_headers):
        resp = client.post("/parking/lots", json=LOT_PAYLOAD, headers=user_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Test Lot"
        assert data["address"] == "123 Test Ave"
        assert "id" in data

    def test_list_lots(self, client, user_headers):
        client.post("/parking/lots", json=LOT_PAYLOAD, headers=user_headers)
        resp = client.get("/parking/lots", headers=user_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1

    def test_get_lot_by_id(self, client, user_headers):
        create = client.post("/parking/lots", json=LOT_PAYLOAD, headers=user_headers)
        lot_id = create.json()["id"]
        resp = client.get(f"/parking/lots/{lot_id}", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == lot_id

    def test_get_nonexistent_lot_returns_404(self, client, user_headers):
        resp = client.get("/parking/lots/99999", headers=user_headers)
        assert resp.status_code == 404

    def test_update_lot(self, client, user_headers):
        create = client.post("/parking/lots", json=LOT_PAYLOAD, headers=user_headers)
        lot_id = create.json()["id"]
        resp = client.put(f"/parking/lots/{lot_id}",
                          json={**LOT_PAYLOAD, "name": "Updated Lot"},
                          headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Lot"

    def test_delete_lot(self, client, user_headers):
        create = client.post("/parking/lots", json=LOT_PAYLOAD, headers=user_headers)
        lot_id = create.json()["id"]
        resp = client.delete(f"/parking/lots/{lot_id}", headers=user_headers)
        assert resp.status_code == 200
        assert client.get(f"/parking/lots/{lot_id}", headers=user_headers).status_code == 404

    def test_unauthenticated_returns_401(self, client):
        assert client.get("/parking/lots").status_code == 401
        assert client.post("/parking/lots", json=LOT_PAYLOAD).status_code == 401


# ---------------------------------------------------------------------------
# Lot Details (rich endpoint)
# ---------------------------------------------------------------------------

class TestLotDetails:

    def _create_full_lot(self, client, user_headers, timing="24x7"):
        lot = client.post("/parking/lots", json={
            **LOT_PAYLOAD,
            "name": "Detail Lot",
            "parking_timing": timing,
            "car_parking_charge": "€2.50/hr, Daily max €20",
            "two_wheeler_parking_charge": "€1.50/hr, Daily max €12",
            "has_cctv": "Yes",
            "has_boom_barrier": "Yes",
            "provides_valet_services": "Yes",
            "ticket_generated": "Yes",
            "value_added_services": "Car Wash,EV Charging",
        }, headers=user_headers)
        lot_id = lot.json()["id"]

        floor = client.post(f"/parking/lots/{lot_id}/floors",
                            json={"name": "Ground Floor"}, headers=user_headers)
        floor_id = floor.json()["id"]
        row = client.post(f"/parking/floors/{floor_id}/rows",
                          json={"name": "Row A"}, headers=user_headers)
        row_id = row.json()["id"]
        for i in range(5):
            client.post(f"/parking/rows/{row_id}/slots",
                        json={"name": f"A{i+1}", "status": 0}, headers=user_headers)
        return lot_id

    def test_lot_details_success(self, client, user_headers):
        lot_id = self._create_full_lot(client, user_headers)
        resp = client.get(f"/parking/lots/{lot_id}/details", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["parkinglot_id"] == lot_id
        assert "operating_hours" in data
        assert "pricing_tiers" in data
        assert "capacity_info" in data
        assert "real_time_availability" in data
        assert "facilities" in data

    def test_lot_details_24x7_parsing(self, client, user_headers):
        lot_id = self._create_full_lot(client, user_headers, timing="24x7")
        resp = client.get(f"/parking/lots/{lot_id}/details", headers=user_headers)
        oh = resp.json()["data"]["operating_hours"]
        assert oh["is_24x7"] is True
        assert oh["opening_time"] == "00:00"
        assert oh["closing_time"] == "23:59"

    def test_lot_details_availability_accuracy(self, client, user_headers):
        lot_id = self._create_full_lot(client, user_headers)
        resp = client.get(f"/parking/lots/{lot_id}/details", headers=user_headers)
        avail = resp.json()["data"]["real_time_availability"]
        assert avail["total_slots"] == 5
        assert avail["available_slots"] == 5
        assert avail["occupied_slots"] == 0
        assert avail["availability_percentage"] == 100.0

    def test_lot_details_not_found_returns_404(self, client, user_headers):
        resp = client.get("/parking/lots/99999/details", headers=user_headers)
        assert resp.status_code == 404

    def test_lot_stats(self, client, user_headers, parking_setup):
        lot_id = parking_setup["lot_id"]
        resp = client.get(f"/parking/lots/{lot_id}/stats", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["parkinglot_id"] == lot_id
        assert "total_slots" in data
        assert "available_slots" in data


# ---------------------------------------------------------------------------
# Nearby lots
# ---------------------------------------------------------------------------

class TestNearbyLots:

    def test_nearby_lots_missing_coords_returns_400(self, client, user_headers):
        resp = client.get("/parking/lots/nearby", headers=user_headers)
        assert resp.status_code == 400

    def test_nearby_lots_invalid_radius_returns_400(self, client, user_headers):
        resp = client.get("/parking/lots/nearby?latitude=28.6&longitude=77.2&radius=0",
                          headers=user_headers)
        assert resp.status_code == 400

    def test_nearby_lots_returns_success_structure(self, client, user_headers):
        resp = client.get(
            "/parking/lots/nearby?latitude=28.6315&longitude=77.2167&radius=5000",
            headers=user_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "data" in data
        assert "total_count" in data

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/parking/lots/nearby?latitude=28.6&longitude=77.2")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Floors
# ---------------------------------------------------------------------------

class TestFloors:

    def _create_lot(self, client, user_headers):
        resp = client.post("/parking/lots", json=LOT_PAYLOAD, headers=user_headers)
        return resp.json()["id"]

    def test_create_floor_success(self, client, user_headers):
        lot_id = self._create_lot(client, user_headers)
        resp = client.post(f"/parking/lots/{lot_id}/floors",
                           json={"name": "Floor 1"}, headers=user_headers)
        assert resp.status_code == 201
        assert resp.json()["name"] == "Floor 1"

    def test_create_floor_nonexistent_lot_returns_404(self, client, user_headers):
        resp = client.post("/parking/lots/99999/floors",
                           json={"name": "Ghost Floor"}, headers=user_headers)
        assert resp.status_code == 404

    def test_list_floors(self, client, user_headers):
        lot_id = self._create_lot(client, user_headers)
        client.post(f"/parking/lots/{lot_id}/floors",
                    json={"name": "F1"}, headers=user_headers)
        resp = client.get(f"/parking/lots/{lot_id}/floors", headers=user_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_update_floor(self, client, user_headers):
        lot_id = self._create_lot(client, user_headers)
        floor = client.post(f"/parking/lots/{lot_id}/floors",
                            json={"name": "Old Name"}, headers=user_headers)
        floor_id = floor.json()["id"]
        resp = client.put(f"/parking/floors/{floor_id}",
                          json={"name": "New Name"}, headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    def test_delete_floor(self, client, user_headers):
        lot_id = self._create_lot(client, user_headers)
        floor = client.post(f"/parking/lots/{lot_id}/floors",
                            json={"name": "To Delete"}, headers=user_headers)
        floor_id = floor.json()["id"]
        resp = client.delete(f"/parking/floors/{floor_id}", headers=user_headers)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Rows
# ---------------------------------------------------------------------------

class TestRows:

    def _create_floor(self, client, user_headers):
        lot = client.post("/parking/lots", json=LOT_PAYLOAD, headers=user_headers)
        lot_id = lot.json()["id"]
        floor = client.post(f"/parking/lots/{lot_id}/floors",
                            json={"name": "F1"}, headers=user_headers)
        return floor.json()["id"]

    def test_create_row_success(self, client, user_headers):
        floor_id = self._create_floor(client, user_headers)
        resp = client.post(f"/parking/floors/{floor_id}/rows",
                           json={"name": "Row A"}, headers=user_headers)
        assert resp.status_code == 201
        assert resp.json()["name"] == "Row A"

    def test_create_row_nonexistent_floor_returns_404(self, client, user_headers):
        resp = client.post("/parking/floors/99999/rows",
                           json={"name": "Ghost Row"}, headers=user_headers)
        assert resp.status_code == 404

    def test_update_row(self, client, user_headers):
        floor_id = self._create_floor(client, user_headers)
        row = client.post(f"/parking/floors/{floor_id}/rows",
                          json={"name": "Old Row"}, headers=user_headers)
        row_id = row.json()["id"]
        resp = client.put(f"/parking/rows/{row_id}",
                          json={"name": "New Row"}, headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Row"

    def test_delete_row(self, client, user_headers):
        floor_id = self._create_floor(client, user_headers)
        row = client.post(f"/parking/floors/{floor_id}/rows",
                          json={"name": "Delete Row"}, headers=user_headers)
        row_id = row.json()["id"]
        resp = client.delete(f"/parking/rows/{row_id}", headers=user_headers)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Slots
# ---------------------------------------------------------------------------

class TestSlots:

    def _create_row(self, client, user_headers):
        lot = client.post("/parking/lots", json=LOT_PAYLOAD, headers=user_headers)
        lot_id = lot.json()["id"]
        floor = client.post(f"/parking/lots/{lot_id}/floors",
                            json={"name": "F1"}, headers=user_headers)
        floor_id = floor.json()["id"]
        row = client.post(f"/parking/floors/{floor_id}/rows",
                          json={"name": "R1"}, headers=user_headers)
        return row.json()["id"]

    def test_create_slot_success(self, client, user_headers):
        row_id = self._create_row(client, user_headers)
        resp = client.post(f"/parking/rows/{row_id}/slots",
                           json={"name": "A1"}, headers=user_headers)
        assert resp.status_code == 201
        assert resp.json()["name"] == "A1"
        assert resp.json()["status"] == 0

    def test_create_slot_nonexistent_row_returns_404(self, client, user_headers):
        resp = client.post("/parking/rows/99999/slots",
                           json={"name": "Ghost Slot"}, headers=user_headers)
        assert resp.status_code == 404

    def test_list_slots(self, client, user_headers):
        row_id = self._create_row(client, user_headers)
        for i in range(3):
            client.post(f"/parking/rows/{row_id}/slots",
                        json={"name": f"S{i}"}, headers=user_headers)
        resp = client.get(f"/parking/rows/{row_id}/slots", headers=user_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    def test_get_slot_by_id(self, client, user_headers):
        row_id = self._create_row(client, user_headers)
        slot = client.post(f"/parking/rows/{row_id}/slots",
                           json={"name": "B1"}, headers=user_headers)
        slot_id = slot.json()["id"]
        resp = client.get(f"/parking/slots/{slot_id}", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == slot_id

    def test_update_slot(self, client, user_headers):
        row_id = self._create_row(client, user_headers)
        slot = client.post(f"/parking/rows/{row_id}/slots",
                           json={"name": "C1", "status": 0}, headers=user_headers)
        slot_id = slot.json()["id"]
        resp = client.put(f"/parking/slots/{slot_id}",
                          json={"name": "C1-Updated", "status": 1},
                          headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "C1-Updated"
        assert resp.json()["status"] == 1

    def test_delete_slot(self, client, user_headers):
        row_id = self._create_row(client, user_headers)
        slot = client.post(f"/parking/rows/{row_id}/slots",
                           json={"name": "D1"}, headers=user_headers)
        slot_id = slot.json()["id"]
        resp = client.delete(f"/parking/slots/{slot_id}", headers=user_headers)
        assert resp.status_code == 200
        assert client.get(f"/parking/slots/{slot_id}",
                          headers=user_headers).status_code == 404
