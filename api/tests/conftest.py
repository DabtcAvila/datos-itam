import os

os.environ["TESTING"] = "1"

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import engine
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await engine.dispose()


@pytest.fixture
async def auth_headers(client):
    """Register a test user and return auth headers with JWT token."""
    import uuid

    unique = uuid.uuid4().hex[:8]
    user_data = {
        "username": f"testuser_{unique}",
        "email": f"test_{unique}@test.com",
        "password": "testpassword123",
    }
    # Register
    r = await client.post("/api/v1/auth/register", json=user_data)
    assert r.status_code == 201

    # Login
    r = await client.post(
        "/api/v1/auth/token",
        data={"username": user_data["username"], "password": user_data["password"]},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
