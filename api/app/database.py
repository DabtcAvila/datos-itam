from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlmodel import SQLModel  # noqa: F401

from app.config import settings

connect_args: dict = {}
# Neon uses pgbouncer which does NOT support prepared statements,
# and requires SSL. asyncpg does not accept libpq-style query params
# (channel_binding, sslmode) so we strip them at .env level and pass
# ssl='require' here.
if "neon.tech" in settings.database_url:
    connect_args["statement_cache_size"] = 0
    connect_args["ssl"] = "require"

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=settings.pool_size,
    max_overflow=settings.max_overflow,
    pool_pre_ping=True,
    connect_args=connect_args,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session
