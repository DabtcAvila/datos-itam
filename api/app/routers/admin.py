import time

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import text

from app.auth import get_current_user
from app.database import engine
from app.models.users import User
from app.rate_limit import limiter

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


MATERIALIZED_VIEWS = [
    "mv_dashboard_overview",
    "mv_dashboard_sectors",
    "mv_dashboard_top_positions",
    "mv_dashboard_salary_by_age",
    "mv_dashboard_seniority",
]


class RefreshResponse(BaseModel):
    refreshed: list[str]
    duration_ms: int


@router.post("/refresh-materialized-views", response_model=RefreshResponse)
@limiter.limit("5/minute")
async def refresh_materialized_views(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Refresh all dashboard materialized views CONCURRENTLY.

    Requires JWT auth. Intended to be called nightly by a cron job after
    /api/v1/ingest/csv runs, to keep the dashboard snapshot fresh.
    """
    start = time.perf_counter()
    async with engine.connect() as conn:
        autocommit = await conn.execution_options(isolation_level="AUTOCOMMIT")
        for mv in MATERIALIZED_VIEWS:
            await autocommit.execute(text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {mv}"))
    duration_ms = int((time.perf_counter() - start) * 1000)
    return RefreshResponse(refreshed=MATERIALIZED_VIEWS, duration_ms=duration_ms)
