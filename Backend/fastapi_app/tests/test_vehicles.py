"""Tests for /user/vehicles endpoints."""
import uuid
import pytest


class TestGetVehicles:

    def test_empty_list_for_new_user(self, client, user_headers):
        resp = client.get("/user/vehicles", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"] == []
        assert data["count"] == 0

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/user/vehicles")
        assert resp.status_code == 401


class TestAddVehicle:

    def test_add_vehicle_success(self, client, user_headers):
        resp = client.post("/user/vehicles", json={
            "registration_number": "ABC123",
            "vehicle_name": "My Car",
            "make": "Toyota",
            "model": "Camry",
            "year": 2020,
            "vehicle_type": "car",
            "color": "Blue",
        }, headers=user_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["registration_number"] == "ABC123"
        assert data["data"]["vehicle_name"] == "My Car"
        assert data["data"]["vehicle_type"] == "car"
        assert data["data"]["is_active"] is True
        assert "vehicle_id" in data["data"]

    def test_registration_number_normalized_to_uppercase(self, client, user_headers):
        resp = client.post("/user/vehicles", json={
            "registration_number": "abc 123",
            "vehicle_name": "Normalized Car",
        }, headers=user_headers)
        assert resp.status_code == 201
        assert resp.json()["data"]["registration_number"] == "ABC123"

    def test_add_vehicle_minimal_data(self, client, user_headers):
        resp = client.post("/user/vehicles", json={
            "registration_number": "MIN001",
            "vehicle_name": "Minimal Car",
        }, headers=user_headers)
        assert resp.status_code == 201
        assert resp.json()["data"]["vehicle_type"] == "car"  # default

    def test_duplicate_registration_returns_409(self, client, user_headers):
        client.post("/user/vehicles", json={
            "registration_number": "DUP123",
            "vehicle_name": "First Car",
        }, headers=user_headers)
        resp = client.post("/user/vehicles", json={
            "registration_number": "DUP123",
            "vehicle_name": "Second Car",
        }, headers=user_headers)
        assert resp.status_code == 409
        assert "already registered" in resp.json()["error"]

    def test_missing_registration_number_returns_400(self, client, user_headers):
        resp = client.post("/user/vehicles", json={
            "vehicle_name": "No Reg Car",
        }, headers=user_headers)
        # FastAPI returns 422 for missing required Pydantic fields; 400 for app-level validation
        assert resp.status_code in (400, 422)

    def test_invalid_year_future_returns_400(self, client, user_headers):
        resp = client.post("/user/vehicles", json={
            "registration_number": "YEAR001",
            "vehicle_name": "Future Car",
            "year": 2030,
        }, headers=user_headers)
        assert resp.status_code == 400

    def test_invalid_year_past_returns_400(self, client, user_headers):
        resp = client.post("/user/vehicles", json={
            "registration_number": "YEAR002",
            "vehicle_name": "Ancient Car",
            "year": 1800,
        }, headers=user_headers)
        assert resp.status_code == 400

    def test_invalid_vehicle_type_returns_400(self, client, user_headers):
        resp = client.post("/user/vehicles", json={
            "registration_number": "TYPE001",
            "vehicle_name": "Spaceship",
            "vehicle_type": "spaceship",
        }, headers=user_headers)
        assert resp.status_code == 400

    def test_valid_vehicle_types_accepted(self, client, user_headers):
        for i, vtype in enumerate(["car", "bike", "truck", "suv", "van", "auto", "motorcycle"]):
            resp = client.post("/user/vehicles", json={
                "registration_number": f"TYPE{i:03d}",
                "vehicle_name": f"{vtype} vehicle",
                "vehicle_type": vtype,
            }, headers=user_headers)
            assert resp.status_code == 201, f"Failed for type: {vtype}"

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/user/vehicles", json={
            "registration_number": "UNAUTH1",
            "vehicle_name": "Unauth Car",
        })
        assert resp.status_code == 401


class TestUpdateVehicle:

    def test_update_vehicle_success(self, client, user_headers):
        create = client.post("/user/vehicles", json={
            "registration_number": "UPD001",
            "vehicle_name": "Original Name",
            "color": "Blue",
        }, headers=user_headers)
        vehicle_id = create.json()["data"]["vehicle_id"]

        resp = client.put(f"/user/vehicles/{vehicle_id}", json={
            "vehicle_name": "Updated Name",
            "color": "Red",
            "make": "Honda",
        }, headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["vehicle_name"] == "Updated Name"
        assert data["color"] == "Red"
        assert data["make"] == "Honda"
        assert data["registration_number"] == "UPD001"  # unchanged

    def test_update_nonexistent_vehicle_returns_404(self, client, user_headers):
        resp = client.put("/user/vehicles/99999", json={
            "vehicle_name": "Ghost Car",
        }, headers=user_headers)
        assert resp.status_code == 404

    def test_update_invalid_year_returns_400(self, client, user_headers):
        create = client.post("/user/vehicles", json={
            "registration_number": "UPDYR1",
            "vehicle_name": "Year Car",
        }, headers=user_headers)
        vehicle_id = create.json()["data"]["vehicle_id"]
        resp = client.put(f"/user/vehicles/{vehicle_id}", json={"year": 1800},
                          headers=user_headers)
        assert resp.status_code == 400

    def test_update_to_duplicate_registration_returns_409(self, client, user_headers):
        client.post("/user/vehicles", json={
            "registration_number": "TAKEN01",
            "vehicle_name": "Taken Car",
        }, headers=user_headers)
        create2 = client.post("/user/vehicles", json={
            "registration_number": "FREE001",
            "vehicle_name": "Free Car",
        }, headers=user_headers)
        vehicle_id = create2.json()["data"]["vehicle_id"]
        resp = client.put(f"/user/vehicles/{vehicle_id}",
                          json={"registration_number": "TAKEN01"},
                          headers=user_headers)
        assert resp.status_code == 409

    def test_unauthenticated_returns_401(self, client):
        resp = client.put("/user/vehicles/1", json={"vehicle_name": "X"})
        assert resp.status_code == 401


class TestDeleteVehicle:

    def test_delete_vehicle_success(self, client, user_headers):
        create = client.post("/user/vehicles", json={
            "registration_number": "DEL001",
            "vehicle_name": "To Delete",
        }, headers=user_headers)
        vehicle_id = create.json()["data"]["vehicle_id"]

        resp = client.delete(f"/user/vehicles/{vehicle_id}", headers=user_headers)
        assert resp.status_code == 200
        assert "deleted successfully" in resp.json()["message"]

        # Verify it no longer appears in list
        list_resp = client.get("/user/vehicles", headers=user_headers)
        ids = [v["vehicle_id"] for v in list_resp.json()["data"]]
        assert vehicle_id not in ids

    def test_delete_nonexistent_vehicle_returns_404(self, client, user_headers):
        resp = client.delete("/user/vehicles/99999", headers=user_headers)
        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, client):
        resp = client.delete("/user/vehicles/1")
        assert resp.status_code == 401


class TestVehicleListAfterOperations:

    def test_list_shows_created_vehicles(self, client, user_headers):
        for i in range(3):
            client.post("/user/vehicles", json={
                "registration_number": f"LIST{i:03d}",
                "vehicle_name": f"Car {i}",
            }, headers=user_headers)

        resp = client.get("/user/vehicles", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["count"] == 3

    def test_deleted_vehicle_not_in_list(self, client, user_headers):
        create = client.post("/user/vehicles", json={
            "registration_number": "SOFTDEL1",
            "vehicle_name": "Soft Delete Car",
        }, headers=user_headers)
        vehicle_id = create.json()["data"]["vehicle_id"]
        client.delete(f"/user/vehicles/{vehicle_id}", headers=user_headers)

        resp = client.get("/user/vehicles", headers=user_headers)
        ids = [v["vehicle_id"] for v in resp.json()["data"]]
        assert vehicle_id not in ids
