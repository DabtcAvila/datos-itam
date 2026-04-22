import os
import uuid

os.environ["TESTING"] = "1"

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password
from app.database import engine
from app.main import app
from app.models.users import User


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await engine.dispose()


async def _create_user_direct(username: str, email: str, password: str, is_admin: bool) -> None:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        user = User(
            username=username,
            email=email,
            hashed_password=hash_password(password),
            is_active=True,
            is_admin=is_admin,
        )
        session.add(user)
        await session.commit()


async def _login(client, username: str, password: str) -> str:
    r = await client.post(
        "/api/v1/auth/token",
        data={"username": username, "password": password},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
async def auth_headers(client):
    """Create an admin test user directly in DB (bypassing disabled /auth/register) and return JWT headers."""
    unique = uuid.uuid4().hex[:8]
    username = f"testadmin_{unique}"
    password = "testpassword123"
    await _create_user_direct(
        username=username,
        email=f"admin_{unique}@test.com",
        password=password,
        is_admin=True,
    )
    token = await _login(client, username, password)
    return {"Authorization": f"Bearer {token}"}
