import uuid

from tests.conftest import _create_user_direct, _login


async def test_register_disabled(client):
    u = uuid.uuid4().hex[:8]
    r = await client.post(
        "/api/v1/auth/register",
        json={"username": f"user_{u}", "email": f"{u}@test.com", "password": "pass123"},
    )
    assert r.status_code == 403
    detail = r.json()["detail"]
    assert "disabled" in detail.lower()
    assert "cli" in detail.lower()


async def test_login_success(client):
    u = uuid.uuid4().hex[:8]
    await _create_user_direct(f"login_{u}", f"login_{u}@test.com", "pass123", is_admin=False)
    r = await client.post(
        "/api/v1/auth/token",
        data={"username": f"login_{u}", "password": "pass123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


async def test_login_wrong_password(client):
    u = uuid.uuid4().hex[:8]
    await _create_user_direct(f"wrongpw_{u}", f"wrongpw_{u}@test.com", "pass123", is_admin=False)
    r = await client.post(
        "/api/v1/auth/token",
        data={"username": f"wrongpw_{u}", "password": "wrongpassword"},
    )
    assert r.status_code == 401


async def test_me_with_token(client):
    u = uuid.uuid4().hex[:8]
    await _create_user_direct(f"me_{u}", f"me_{u}@test.com", "pass123", is_admin=False)
    token = await _login(client, f"me_{u}", "pass123")
    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == f"me_{u}"
    assert body["is_admin"] is False


async def test_me_with_admin_token(client):
    u = uuid.uuid4().hex[:8]
    await _create_user_direct(f"admin_{u}", f"admin_{u}@test.com", "pass123", is_admin=True)
    token = await _login(client, f"admin_{u}", "pass123")
    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["is_admin"] is True


async def test_me_without_token(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401
