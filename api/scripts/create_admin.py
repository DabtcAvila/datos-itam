#!/usr/bin/env python3
"""
Create or update an admin user in the datos-itam API database(s).

Replacement for the disabled /auth/register endpoint. By default creates
users with is_admin=True; use --no-admin for non-admin (audit/testing).

Idempotent: if a user with the given email exists, the script updates
their username, password hash, is_active=True, and is_admin flag.
Otherwise it inserts a new row.

Dry-run by default: pass --apply to actually write. Connection is still
opened in dry-run to report whether the operation would be INSERT or
UPDATE, which surfaces connectivity problems early.

Usage:
    cd api
    .venv/bin/python scripts/create_admin.py \\
        --email admin@datos-itam.org \\
        --password 'strong-password' \\
        --db both \\
        --apply

    # Dry-run against Neon only:
    .venv/bin/python scripts/create_admin.py \\
        --email x@y.com --password test --db neon
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_DIR))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.auth import hash_password
from app.models.users import User

LOCAL_URL = "postgresql+asyncpg://datos_public:datos_public_2026@localhost:54322/remuneraciones_cdmx"


def _read_neon_url() -> str:
    env_neon = API_DIR / ".env.neon"
    if not env_neon.exists():
        raise SystemExit(f"error: {env_neon} not found")
    for line in env_neon.read_text().splitlines():
        line = line.strip()
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("error: DATABASE_URL not found in .env.neon")


async def _upsert(url: str, email: str, username: str, password: str, is_admin: bool, apply: bool) -> dict:
    connect_args: dict = {}
    if "neon.tech" in url:
        connect_args["statement_cache_size"] = 0
        connect_args["ssl"] = "require"

    engine = create_async_engine(url, connect_args=connect_args)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as session:
            result = await session.execute(select(User).where(User.email == email))
            existing = result.scalar_one_or_none()

            if existing is None:
                if not apply:
                    return {"action": "INSERT", "applied": False}
                user = User(
                    username=username,
                    email=email,
                    hashed_password=hash_password(password),
                    is_active=True,
                    is_admin=is_admin,
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)
                return {"action": "INSERT", "applied": True, "id": user.id, "is_admin": user.is_admin}

            if not apply:
                return {"action": "UPDATE", "applied": False, "id": existing.id, "current_is_admin": existing.is_admin}
            existing.username = username
            existing.hashed_password = hash_password(password)
            existing.is_active = True
            existing.is_admin = is_admin
            session.add(existing)
            await session.commit()
            return {"action": "UPDATE", "applied": True, "id": existing.id, "is_admin": existing.is_admin}
    finally:
        await engine.dispose()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create or update an admin user (replacement for disabled /auth/register).",
    )
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--username", help="Defaults to local-part of --email")
    parser.add_argument("--db", choices=["local", "neon", "both"], required=True)
    parser.add_argument(
        "--no-admin",
        action="store_true",
        help="Create a non-admin user (is_admin=False). Default is admin.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Commit changes. Without this, the script only reports the plan.",
    )
    args = parser.parse_args()

    username = args.username or args.email.split("@", 1)[0]
    is_admin = not args.no_admin

    targets: list[tuple[str, str]] = []
    if args.db in ("local", "both"):
        targets.append(("local", LOCAL_URL))
    if args.db in ("neon", "both"):
        targets.append(("neon", _read_neon_url()))

    mode = "APPLY" if args.apply else "DRY-RUN"
    print(f"[{mode}] email={args.email} username={username} is_admin={is_admin} targets={[n for n, _ in targets]}")

    any_error = False
    for name, url in targets:
        try:
            result = asyncio.run(
                _upsert(url, args.email, username, args.password, is_admin, args.apply)
            )
            print(f"  [{name}] {result}")
        except Exception as exc:
            any_error = True
            print(f"  [{name}] ERROR: {type(exc).__name__}: {exc}")

    if not args.apply:
        print("\n(dry-run) pass --apply to commit the changes above.")
    return 1 if any_error else 0


if __name__ == "__main__":
    raise SystemExit(main())
