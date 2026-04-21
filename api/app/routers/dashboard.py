import asyncio

from fastapi import APIRouter, Request
from sqlalchemy import text

from app.database import engine
from app.rate_limit import limiter
from app.schemas.dashboard import (
    BrutoNetoRange,
    DashboardStats,
    GenderGapSector,
    LabelAvg,
    LabelCount,
    SectorStats,
    SeniorityWithSalary,
    TopPosition,
)

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

# --- SQL queries (normalized schema) ---
# Snapshot metrics come from materialized views (see migrations/004_materialized_views.sql).
# Refresh via POST /api/v1/admin/refresh-materialized-views.

SQL_OVERVIEW = "SELECT * FROM mv_dashboard_overview WHERE key = 1"

SQL_SALARY_DISTRIBUTION = """
SELECT label, count FROM (
    SELECT 'Menos de $5K' AS label, COUNT(*) AS count, 1 AS ord
    FROM nombramientos WHERE sueldo_bruto < 5000 AND sueldo_bruto IS NOT NULL
    UNION ALL
    SELECT '$5K - $10K', COUNT(*), 2
    FROM nombramientos WHERE sueldo_bruto >= 5000 AND sueldo_bruto < 10000
    UNION ALL
    SELECT '$10K - $20K', COUNT(*), 3
    FROM nombramientos WHERE sueldo_bruto >= 10000 AND sueldo_bruto < 20000
    UNION ALL
    SELECT '$20K - $40K', COUNT(*), 4
    FROM nombramientos WHERE sueldo_bruto >= 20000 AND sueldo_bruto < 40000
    UNION ALL
    SELECT 'Más de $40K', COUNT(*), 5
    FROM nombramientos WHERE sueldo_bruto >= 40000
) sub ORDER BY ord
"""

SQL_AGE_DISTRIBUTION = """
SELECT label, count FROM (
    SELECT '18-25' AS label, COUNT(*) AS count, 1 AS ord
    FROM personas WHERE edad BETWEEN 18 AND 25
    UNION ALL
    SELECT '26-35', COUNT(*), 2
    FROM personas WHERE edad BETWEEN 26 AND 35
    UNION ALL
    SELECT '36-45', COUNT(*), 3
    FROM personas WHERE edad BETWEEN 36 AND 45
    UNION ALL
    SELECT '46-55', COUNT(*), 4
    FROM personas WHERE edad BETWEEN 46 AND 55
    UNION ALL
    SELECT '56+', COUNT(*), 5
    FROM personas WHERE edad > 55
) sub ORDER BY ord
"""

SQL_CONTRACT_TYPES = """
SELECT ct.nombre AS label, COUNT(*) AS count
FROM nombramientos n
JOIN cat_tipos_contratacion ct ON n.tipo_contratacion_id = ct.id
GROUP BY ct.nombre
ORDER BY count DESC
"""

SQL_PERSONAL_TYPES = """
SELECT tp.nombre AS label, COUNT(*) AS count
FROM nombramientos n
JOIN cat_tipos_personal tp ON n.tipo_personal_id = tp.id
GROUP BY tp.nombre
ORDER BY count DESC
"""

SQL_SALARY_BY_AGE = "SELECT label, avg FROM mv_dashboard_salary_by_age ORDER BY ord"

SQL_SECTORS = (
    "SELECT name, count, avg_salary, avg_male, avg_female "
    "FROM mv_dashboard_sectors ORDER BY count DESC"
)

SQL_TOP_POSITIONS = (
    "SELECT name, count, avg_salary FROM mv_dashboard_top_positions "
    "ORDER BY avg_salary DESC"
)

SQL_SENIORITY_DISTRIBUTION = (
    "SELECT label, count_all AS count FROM mv_dashboard_seniority ORDER BY ord"
)

SQL_SALARY_BY_SENIORITY = (
    "SELECT label, avg_salary AS avg, count_with_salary AS count "
    "FROM mv_dashboard_seniority ORDER BY ord"
)

SQL_BRUTO_NETO_BY_RANGE = """
SELECT label, avg_bruto, avg_neto, count FROM (
    SELECT 'Menos de $5K' AS label,
        AVG(sueldo_bruto)::float AS avg_bruto,
        AVG(sueldo_neto)::float AS avg_neto,
        COUNT(*) AS count, 1 AS ord
    FROM nombramientos
    WHERE sueldo_bruto < 5000 AND sueldo_bruto IS NOT NULL AND sueldo_neto IS NOT NULL
    UNION ALL
    SELECT '$5K - $10K', AVG(sueldo_bruto)::float, AVG(sueldo_neto)::float, COUNT(*), 2
    FROM nombramientos
    WHERE sueldo_bruto >= 5000 AND sueldo_bruto < 10000 AND sueldo_neto IS NOT NULL
    UNION ALL
    SELECT '$10K - $20K', AVG(sueldo_bruto)::float, AVG(sueldo_neto)::float, COUNT(*), 3
    FROM nombramientos
    WHERE sueldo_bruto >= 10000 AND sueldo_bruto < 20000 AND sueldo_neto IS NOT NULL
    UNION ALL
    SELECT '$20K - $40K', AVG(sueldo_bruto)::float, AVG(sueldo_neto)::float, COUNT(*), 4
    FROM nombramientos
    WHERE sueldo_bruto >= 20000 AND sueldo_bruto < 40000 AND sueldo_neto IS NOT NULL
    UNION ALL
    SELECT 'Más de $40K', AVG(sueldo_bruto)::float, AVG(sueldo_neto)::float, COUNT(*), 5
    FROM nombramientos
    WHERE sueldo_bruto >= 40000 AND sueldo_neto IS NOT NULL
) sub ORDER BY ord
"""


async def _run_query(sql: str):
    async with engine.connect() as conn:
        return await conn.execute(text(sql))


@router.get("/stats", response_model=DashboardStats)
@limiter.limit("10/minute")
async def dashboard_stats(request: Request):
    (
        overview_r,
        salary_dist_r,
        age_dist_r,
        contract_r,
        personal_r,
        salary_age_r,
        sectors_r,
        positions_r,
        seniority_dist_r,
        salary_seniority_r,
        bruto_neto_r,
    ) = await asyncio.gather(
        _run_query(SQL_OVERVIEW),
        _run_query(SQL_SALARY_DISTRIBUTION),
        _run_query(SQL_AGE_DISTRIBUTION),
        _run_query(SQL_CONTRACT_TYPES),
        _run_query(SQL_PERSONAL_TYPES),
        _run_query(SQL_SALARY_BY_AGE),
        _run_query(SQL_SECTORS),
        _run_query(SQL_TOP_POSITIONS),
        _run_query(SQL_SENIORITY_DISTRIBUTION),
        _run_query(SQL_SALARY_BY_SENIORITY),
        _run_query(SQL_BRUTO_NETO_BY_RANGE),
    )

    ov = overview_r.mappings().one()

    all_sectors = [
        SectorStats(
            name=r["name"],
            count=r["count"],
            avgSalary=round(r["avg_salary"], 2),
            avgMale=round(r["avg_male"], 2),
            avgFemale=round(r["avg_female"], 2),
        )
        for r in sectors_r.mappings().all()
    ]

    # Gender gap by sector: top 10 by absolute gap, only sectors with both genders
    gender_gap_sectors = []
    for s in all_sectors:
        if s.avgMale > 0 and s.avgFemale > 0:
            gap = round((s.avgMale - s.avgFemale) / s.avgFemale * 100, 2)
            gender_gap_sectors.append(
                GenderGapSector(
                    name=s.name, avgMale=s.avgMale, avgFemale=s.avgFemale, gap=gap
                )
            )
    gender_gap_sectors.sort(key=lambda x: abs(x.gap), reverse=True)

    avg_male = ov["avg_male"] or 0
    avg_female = ov["avg_female"] or 0
    gender_gap_pct = round((avg_male - avg_female) / avg_female * 100, 2) if avg_female > 0 else 0

    return DashboardStats(
        totalServidores=ov["total"],
        totalSectors=ov["total_sectors"],
        avgSalary=round(ov["avg_salary"] or 0, 2),
        medianSalary=round(ov["median_salary"] or 0, 2),
        minSalary=round(ov["min_salary"] or 0, 2),
        maxSalary=round(ov["max_salary"] or 0, 2),
        p25=round(ov["p25"] or 0, 2),
        p50=round(ov["p50"] or 0, 2),
        p75=round(ov["p75"] or 0, 2),
        p90=round(ov["p90"] or 0, 2),
        genderGapPercent=gender_gap_pct,
        hombres=ov["hombres"],
        mujeres=ov["mujeres"],
        avgSalaryMale=round(avg_male, 2),
        avgSalaryFemale=round(avg_female, 2),
        salaryDistribution=[
            LabelCount(label=r["label"], count=r["count"])
            for r in salary_dist_r.mappings().all()
        ],
        ageDistribution=[
            LabelCount(label=r["label"], count=r["count"])
            for r in age_dist_r.mappings().all()
        ],
        contractTypes=[
            LabelCount(label=r["label"], count=r["count"])
            for r in contract_r.mappings().all()
        ],
        personalTypes=[
            LabelCount(label=r["label"], count=r["count"])
            for r in personal_r.mappings().all()
        ],
        salaryByAge=[
            LabelAvg(label=r["label"], avg=round(r["avg"], 2))
            for r in salary_age_r.mappings().all()
        ],
        top15Sectors=all_sectors[:15],
        allSectors=all_sectors,
        genderGapBySector=gender_gap_sectors[:10],
        topPositions=[
            TopPosition(name=r["name"], count=r["count"], avgSalary=round(r["avg_salary"], 2))
            for r in positions_r.mappings().all()
        ],
        seniorityDistribution=[
            LabelCount(label=r["label"], count=r["count"])
            for r in seniority_dist_r.mappings().all()
        ],
        salaryBySeniority=[
            SeniorityWithSalary(label=r["label"], avg=round(r["avg"], 2), count=r["count"])
            for r in salary_seniority_r.mappings().all()
        ],
        avgSeniority=round(ov["avg_seniority"] or 0, 2),
        avgNetSalary=round(ov["avg_net"] or 0, 2),
        avgDeduction=round(ov["avg_deduction"] or 0, 2),
        avgDeductionPercent=round(ov["avg_deduction_pct"] or 0, 2),
        brutoNetoByRange=[
            BrutoNetoRange(
                label=r["label"],
                avgBruto=round(r["avg_bruto"], 2),
                avgNeto=round(r["avg_neto"], 2),
                count=r["count"],
            )
            for r in bruto_neto_r.mappings().all()
        ],
    )
