"""Tests for /auth endpoints (register, login, super-admin-status)."""
import uuid
import pytest


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class TestRegister:

    def test_register_user_success(self, client):
        uid = str(uuid.uuid4())[:8]
        resp = client.post("/auth/register", json={
            "user_name": f"user_{uid}",
            "user_email": f"user_{uid}@example.com",
            "user_password": "password123",
            "user_phone_no": f"9{uid[:9].ljust(9,'0')}",
            "user_address": "123 Test St",
        })
        assert resp.status_code == 201
        assert resp.json()["msg"] == "User registered successfully"
        assert resp.json()["role"] == "user"

    def test_register_super_admin_success(self, client):
        uid = str(uuid.uuid4())[:8]
        resp = client.post("/auth/register", json={
            "user_name": f"super_{uid}",
            "user_email": f"super_{uid}@example.com",
            "user_password": "password123",
            "user_phone_no": f"1{uid[:9].ljust(9,'0')}",
            "user_address": "HQ",
            "role": "super_admin",
            "super_admin_secret": "SUPER_SECRET_SUPER_ADMIN_KEY",
        })
        assert resp.status_code == 201
        assert resp.json()["role"] == "super_admin"

    def test_register_duplicate_email_returns_409(self, client):
        uid = str(uuid.uuid4())[:8]
        payload = {
            "user_name": f"user_{uid}",
            "user_email": f"dup_{uid}@example.com",
            "user_password": "password123",
            "user_phone_no": f"9{uid[:9].ljust(9,'0')}",
            "user_address": "Test",
        }
        client.post("/auth/register", json=payload)
        payload["user_name"] = "other_name"
        payload["user_phone_no"] = "9999999999"
        resp = client.post("/auth/register", json=payload)
        assert resp.status_code == 409

    def test_register_duplicate_phone_returns_409(self, client):
        uid = str(uuid.uuid4())[:8]
        phone = f"7{uid[:9].ljust(9,'0')}"
        client.post("/auth/register", json={
            "user_name": f"user1_{uid}",
            "user_email": f"u1_{uid}@example.com",
            "user_password": "password123",
            "user_phone_no": phone,
            "user_address": "Test",
        })
        resp = client.post("/auth/register", json={
            "user_name": f"user2_{uid}",
            "user_email": f"u2_{uid}@example.com",
            "user_password": "password123",
            "user_phone_no": phone,
            "user_address": "Test",
        })
        assert resp.status_code == 409

    def test_register_missing_required_fields_returns_400(self, client):
        resp = client.post("/auth/register", json={
            "user_name": "incomplete",
            "user_email": "incomplete@example.com",
            # missing password and phone
        })
        assert resp.status_code in (400, 422)

    def test_register_invalid_email_returns_400(self, client):
        uid = str(uuid.uuid4())[:8]
        resp = client.post("/auth/register", json={
            "user_name": f"user_{uid}",
            "user_email": "not-an-email",
            "user_password": "password123",
            "user_phone_no": f"9{uid[:9].ljust(9,'0')}",
            "user_address": "Test",
        })
        assert resp.status_code == 400

    def test_register_admin_role_forbidden(self, client):
        uid = str(uuid.uuid4())[:8]
        resp = client.post("/auth/register", json={
            "user_name": f"admin_{uid}",
            "user_email": f"admin_{uid}@example.com",
            "user_password": "password123",
            "user_phone_no": f"9{uid[:9].ljust(9,'0')}",
            "user_address": "Test",
            "role": "admin",
        })
        assert resp.status_code == 403

    def test_register_super_admin_wrong_secret_returns_403(self, client):
        uid = str(uuid.uuid4())[:8]
        resp = client.post("/auth/register", json={
            "user_name": f"super_{uid}",
            "user_email": f"super_{uid}@example.com",
            "user_password": "password123",
            "user_phone_no": f"1{uid[:9].ljust(9,'0')}",
            "user_address": "HQ",
            "role": "super_admin",
            "super_admin_secret": "WRONG_SECRET",
        })
        assert resp.status_code == 403

    def test_register_second_super_admin_returns_403(self, client):
        uid1 = str(uuid.uuid4())[:8]
        uid2 = str(uuid.uuid4())[:8]
        client.post("/auth/register", json={
            "user_name": f"super_{uid1}",
            "user_email": f"super_{uid1}@example.com",
            "user_password": "password123",
            "user_phone_no": f"1{uid1[:9].ljust(9,'0')}",
            "user_address": "HQ",
            "role": "super_admin",
            "super_admin_secret": "SUPER_SECRET_SUPER_ADMIN_KEY",
        })
        resp = client.post("/auth/register", json={
            "user_name": f"super_{uid2}",
            "user_email": f"super_{uid2}@example.com",
            "user_password": "password123",
            "user_phone_no": f"2{uid2[:9].ljust(9,'0')}",
            "user_address": "HQ",
            "role": "super_admin",
            "super_admin_secret": "SUPER_SECRET_SUPER_ADMIN_KEY",
        })
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class TestLogin:

    def _register(self, client, role="user"):
        uid = str(uuid.uuid4())[:8]
        email = f"{role}_{uid}@example.com"
        phone = f"9{uid[:9].ljust(9,'0')}"
        payload = {
            "user_name": f"{role}_{uid}",
            "user_email": email,
            "user_password": "password123",
            "user_phone_no": phone,
            "user_address": "Test",
            "role": role,
        }
        if role == "super_admin":
            payload["super_admin_secret"] = "SUPER_SECRET_SUPER_ADMIN_KEY"
        client.post("/auth/register", json=payload)
        return email

    def test_login_success_returns_token(self, client):
        email = self._register(client)
        resp = client.post("/auth/login", json={
            "user_email": email,
            "user_password": "password123",
            "role": "user",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["role"] == "user"
        assert data["user_email"] == email

    def test_login_wrong_password_returns_401(self, client):
        email = self._register(client)
        resp = client.post("/auth/login", json={
            "user_email": email,
            "user_password": "wrongpassword",
            "role": "user",
        })
        assert resp.status_code == 401

    def test_login_wrong_email_returns_401(self, client):
        resp = client.post("/auth/login", json={
            "user_email": "nobody@example.com",
            "user_password": "password123",
            "role": "user",
        })
        assert resp.status_code == 401

    def test_login_wrong_role_returns_401(self, client):
        email = self._register(client, role="user")
        resp = client.post("/auth/login", json={
            "user_email": email,
            "user_password": "password123",
            "role": "admin",   # user trying to log in as admin
        })
        assert resp.status_code == 401

    def test_login_invalid_role_returns_400(self, client):
        email = self._register(client)
        resp = client.post("/auth/login", json={
            "user_email": email,
            "user_password": "password123",
            "role": "hacker",
        })
        assert resp.status_code == 400

    def test_login_super_admin_success(self, client):
        email = self._register(client, role="super_admin")
        resp = client.post("/auth/login", json={
            "user_email": email,
            "user_password": "password123",
            "role": "super_admin",
        })
        assert resp.status_code == 200
        assert resp.json()["role"] == "super_admin"


# ---------------------------------------------------------------------------
# Super-admin status
# ---------------------------------------------------------------------------

class TestSuperAdminStatus:

    def test_no_super_admin_initially(self, client):
        resp = client.get("/auth/super-admin-status")
        assert resp.status_code == 200
        assert resp.json()["super_admin_exists"] is False
        assert resp.json()["can_register"] is True

    def test_super_admin_exists_after_registration(self, client):
        uid = str(uuid.uuid4())[:8]
        client.post("/auth/register", json={
            "user_name": f"super_{uid}",
            "user_email": f"super_{uid}@example.com",
            "user_password": "password123",
            "user_phone_no": f"1{uid[:9].ljust(9,'0')}",
            "user_address": "HQ",
            "role": "super_admin",
            "super_admin_secret": "SUPER_SECRET_SUPER_ADMIN_KEY",
        })
        resp = client.get("/auth/super-admin-status")
        assert resp.json()["super_admin_exists"] is True
        assert resp.json()["can_register"] is False
