"""
FastAPI test configuration and shared fixtures.
Uses an in-memory SQLite database so tests are fully isolated and need no
running Postgres instance.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from fastapi_app.main import app
from fastapi_app.database import Base, get_db
from fastapi_app import models  # noqa – ensures all models are registered

# ---------------------------------------------------------------------------
# Speed up bcrypt for tests: monkey-patch to use 4 rounds instead of 12
# ---------------------------------------------------------------------------
import bcrypt as _bcrypt_lib
import fastapi_app.models as _models

def _fast_hash(plain: str) -> str:
    """Fast bcrypt with 4 rounds for tests only."""
    return _bcrypt_lib.hashpw(plain[:72].encode("utf-8"), _bcrypt_lib.gensalt(rounds=4)).decode("utf-8")

_models.hash_password = _fast_hash

# ---------------------------------------------------------------------------
# SQLite engine in /tmp (writable, isolated per test session)
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite:////tmp/test_fastapi.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Enable WAL mode for better concurrency in SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---------------------------------------------------------------------------
# Override the get_db dependency
# ---------------------------------------------------------------------------
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function", autouse=True)
def reset_db():
    """Drop and recreate all tables before every test for full isolation."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client():
    """Return a FastAPI TestClient."""
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Helper: register + login a user and return auth headers
# ---------------------------------------------------------------------------

def _register_and_login(client, role="user", email=None, phone=None,
                         password="password123", super_admin_secret=None):
    uid = str(uuid.uuid4())[:8]
    email = email or f"{role}_{uid}@example.com"
    phone = phone or f"9{uid[:9].ljust(9, '0')}"

    payload = {
        "user_name": f"{role}_{uid}",
        "user_email": email,
        "user_password": password,
        "user_phone_no": phone,
        "user_address": "Test Address",
        "role": role,
    }
    if super_admin_secret:
        payload["super_admin_secret"] = super_admin_secret

    client.post("/auth/register", json=payload)

    resp = client.post("/auth/login", json={
        "user_email": email,
        "user_password": password,
        "role": role,
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def user_headers(client):
    return _register_and_login(client, role="user")


@pytest.fixture(scope="function")
def super_admin_headers(client):
    return _register_and_login(
        client, role="super_admin",
        super_admin_secret="SUPER_SECRET_SUPER_ADMIN_KEY"
    )


@pytest.fixture(scope="function")
def admin_headers(client, super_admin_headers):
    """Register an admin via super_admin, then return admin auth headers."""
    uid = str(uuid.uuid4())[:8]
    admin_email = f"admin_{uid}@example.com"
    admin_phone = f"8{uid[:9].ljust(9, '0')}"
    admin_password = "adminpass123"

    resp = client.post("/admin/register_admin", json={
        "user_name": f"admin_{uid}",
        "user_email": admin_email,
        "user_password": admin_password,
        "user_phone_no": admin_phone,
        "user_address": "Admin HQ",
    }, headers=super_admin_headers)
    assert resp.status_code == 201, resp.text

    resp = client.post("/auth/login", json={
        "user_email": admin_email,
        "user_password": admin_password,
        "role": "admin",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def parking_setup(client, user_headers):
    """Create a full parking lot → floor → row → 3 slots and return their IDs."""
    lot = client.post("/parking/lots", json={
        "name": "Test Parking Lot",
        "address": "123 Test St",
        "city": "Test City",
        "latitude": 28.6315,
        "longitude": 77.2167,
        "car_parking_charge": "20/hr",
        "two_wheeler_parking_charge": "10/hr",
        "parking_timing": "24x7",
        "vehicle_types": "Car,Bike",
        "car_capacity": 10,
        "available_car_slots": 10,
        "two_wheeler_capacity": 5,
        "available_two_wheeler_slots": 5,
    }, headers=user_headers)
    assert lot.status_code == 201
    lot_id = lot.json()["id"]

    floor = client.post(f"/parking/lots/{lot_id}/floors",
                        json={"name": "Ground Floor"}, headers=user_headers)
    assert floor.status_code == 201
    floor_id = floor.json()["id"]

    row = client.post(f"/parking/floors/{floor_id}/rows",
                      json={"name": "Row A"}, headers=user_headers)
    assert row.status_code == 201
    row_id = row.json()["id"]

    slot_ids = []
    for i in range(1, 4):
        slot = client.post(f"/parking/rows/{row_id}/slots",
                           json={"name": f"Slot {i}", "status": 0},
                           headers=user_headers)
        assert slot.status_code == 201
        slot_ids.append(slot.json()["id"])

    return {"lot_id": lot_id, "floor_id": floor_id,
            "row_id": row_id, "slot_ids": slot_ids}


@pytest.fixture(scope="function")
def test_vehicle(client, user_headers):
    """Create a test vehicle and return its vehicle_id."""
    resp = client.post("/user/vehicles", json={
        "registration_number": "TEST1234",
        "vehicle_name": "Test Car",
        "make": "Toyota",
        "model": "Camry",
        "vehicle_type": "car",
    }, headers=user_headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]["vehicle_id"]
