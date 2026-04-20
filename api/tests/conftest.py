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
