import uuid


async def test_register_success(client):
    u = uuid.uuid4().hex[:8]
    r = await client.post("/api/v1/auth/register", json={
        "username": f"user_{u}", "email": f"{u}@test.com", "password": "pass123"
    })
    assert r.status_code == 201
    body = r.json()
    assert body["username"] == f"user_{u}"
    assert body["email"] == f"{u}@test.com"
    assert body["is_active"] is True
    assert "hashed_password" not in body


async def test_register_duplicate(client):
    u = uuid.uuid4().hex[:8]
    data = {"username": f"dup_{u}", "email": f"dup_{u}@test.com", "password": "pass123"}
    r1 = await client.post("/api/v1/auth/register", json=data)
    assert r1.status_code == 201
    r2 = await client.post("/api/v1/auth/register", json=data)
    assert r2.status_code == 409


async def test_login_success(client):
    u = uuid.uuid4().hex[:8]
    await client.post("/api/v1/auth/register", json={
        "username": f"login_{u}", "email": f"login_{u}@test.com", "password": "pass123"
    })
    r = await client.post("/api/v1/auth/token", data={
        "username": f"login_{u}", "password": "pass123"
    })
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


async def test_login_wrong_password(client):
    u = uuid.uuid4().hex[:8]
    await client.post("/api/v1/auth/register", json={
        "username": f"wrongpw_{u}", "email": f"wrongpw_{u}@test.com", "password": "pass123"
    })
    r = await client.post("/api/v1/auth/token", data={
        "username": f"wrongpw_{u}", "password": "wrongpassword"
    })
    assert r.status_code == 401


async def test_me_with_token(client):
    u = uuid.uuid4().hex[:8]
    await client.post("/api/v1/auth/register", json={
        "username": f"me_{u}", "email": f"me_{u}@test.com", "password": "pass123"
    })
    login = await client.post("/api/v1/auth/token", data={
        "username": f"me_{u}", "password": "pass123"
    })
    token = login.json()["access_token"]
    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == f"me_{u}"


async def test_me_without_token(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401
