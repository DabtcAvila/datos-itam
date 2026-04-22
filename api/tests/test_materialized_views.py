from sqlalchemy import text

from app.database import engine


async def test_mv_overview_exists_and_has_one_row(client):
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT total, total_sectors FROM cdmx.mv_dashboard_overview WHERE key = 1"))
        row = r.mappings().one()
    assert row["total"] > 200000
    assert row["total_sectors"] >= 50


async def test_mv_sectors_has_rows(client):
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT COUNT(*) AS c FROM cdmx.mv_dashboard_sectors"))
        c = r.scalar_one()
    assert c >= 50


async def test_mv_top_positions_limit_10(client):
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT COUNT(*) AS c FROM cdmx.mv_dashboard_top_positions"))
        c = r.scalar_one()
    assert c == 10


async def test_mv_salary_by_age_has_5_buckets(client):
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT label FROM cdmx.mv_dashboard_salary_by_age ORDER BY ord"))
        labels = [row["label"] for row in r.mappings().all()]
    assert labels == ["18-25", "26-35", "36-45", "46-55", "56+"]


async def test_mv_seniority_has_6_buckets(client):
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT label, count_all, count_with_salary, avg_salary FROM cdmx.mv_dashboard_seniority ORDER BY ord"))
        rows = r.mappings().all()
    assert len(rows) == 6
    for row in rows:
        assert row["count_all"] >= row["count_with_salary"]
        if row["count_with_salary"] > 0:
            assert row["avg_salary"] is not None


async def test_refresh_requires_auth(client):
    r = await client.post("/api/v1/admin/refresh-materialized-views")
    assert r.status_code == 401


async def test_refresh_with_auth_succeeds(client, auth_headers):
    r = await client.post("/api/v1/admin/refresh-materialized-views", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["refreshed"] == [
        "cdmx.mv_dashboard_overview",
        "cdmx.mv_dashboard_sectors",
        "cdmx.mv_dashboard_top_positions",
        "cdmx.mv_dashboard_salary_by_age",
        "cdmx.mv_dashboard_seniority",
    ]
    assert body["duration_ms"] > 0


async def test_dashboard_stats_unchanged_contract(client):
    """Regression: /dashboard/stats keeps its 31-field contract after MV refactor."""
    r = await client.get("/api/v1/dashboard/stats")
    assert r.status_code == 200
    body = r.json()
    required = [
        "totalServidores", "totalSectors", "avgSalary", "medianSalary",
        "minSalary", "maxSalary", "p25", "p50", "p75", "p90",
        "genderGapPercent", "hombres", "mujeres", "avgSalaryMale", "avgSalaryFemale",
        "salaryDistribution", "ageDistribution", "contractTypes", "personalTypes",
        "salaryByAge", "top15Sectors", "allSectors", "genderGapBySector",
        "topPositions", "seniorityDistribution", "salaryBySeniority",
        "avgSeniority", "avgNetSalary", "avgDeduction", "avgDeductionPercent",
        "brutoNetoByRange",
    ]
    for key in required:
        assert key in body, f"Missing key: {key}"
    assert len(body["top15Sectors"]) == 15
    assert len(body["topPositions"]) == 10
    assert len(body["salaryByAge"]) == 5
    assert len(body["seniorityDistribution"]) == 6
    assert len(body["salaryBySeniority"]) == 6
