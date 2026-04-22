from fastapi import APIRouter, Query, Request
from sqlalchemy import text

from app.database import engine
from app.rate_limit import limiter
from app.schemas.analytics import BrechaEdadRow, PuestoRanking, SectorRanking

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


SQL_PUESTOS_RANKING = """
WITH agg AS (
    SELECT
        cp.id AS puesto_id,
        cp.nombre AS nombre,
        AVG(n.sueldo_bruto)::float AS avg_sueldo,
        COUNT(*) AS cnt
    FROM cdmx.nombramientos n
    JOIN cdmx.cat_puestos cp ON n.puesto_id = cp.id
    WHERE n.sueldo_bruto IS NOT NULL
    GROUP BY cp.id, cp.nombre
    HAVING COUNT(*) >= 5
)
SELECT
    puesto_id,
    nombre,
    avg_sueldo,
    cnt AS count,
    RANK() OVER (ORDER BY avg_sueldo DESC) AS rank,
    PERCENT_RANK() OVER (ORDER BY avg_sueldo) AS percent_rank,
    LAG(avg_sueldo) OVER (ORDER BY avg_sueldo DESC) AS prev_avg
FROM agg
ORDER BY avg_sueldo DESC
LIMIT :limit
"""

SQL_SECTORES_RANKING = """
WITH agg AS (
    SELECT
        cs.id AS sector_id,
        cs.nombre AS nombre,
        AVG(n.sueldo_bruto)::float AS avg_sueldo,
        COUNT(*) AS cnt
    FROM cdmx.nombramientos n
    JOIN cdmx.cat_sectores cs ON n.sector_id = cs.id
    WHERE n.sueldo_bruto IS NOT NULL
    GROUP BY cs.id, cs.nombre
)
SELECT
    sector_id,
    nombre,
    avg_sueldo,
    cnt AS count,
    RANK() OVER (ORDER BY avg_sueldo DESC) AS rank,
    PERCENT_RANK() OVER (ORDER BY avg_sueldo) AS percent_rank,
    AVG(avg_sueldo) OVER () AS avg_global
FROM agg
ORDER BY rank
"""

SQL_BRECHA_EDAD = """
WITH buckets AS (
    SELECT
        CASE
            WHEN p.edad BETWEEN 18 AND 25 THEN '18-25'
            WHEN p.edad BETWEEN 26 AND 35 THEN '26-35'
            WHEN p.edad BETWEEN 36 AND 45 THEN '36-45'
            WHEN p.edad BETWEEN 46 AND 55 THEN '46-55'
            WHEN p.edad > 55 THEN '56+'
            ELSE NULL
        END AS bucket_edad,
        CASE WHEN p.edad BETWEEN 18 AND 25 THEN 1
             WHEN p.edad BETWEEN 26 AND 35 THEN 2
             WHEN p.edad BETWEEN 36 AND 45 THEN 3
             WHEN p.edad BETWEEN 46 AND 55 THEN 4
             WHEN p.edad > 55 THEN 5 END AS ord,
        n.sueldo_bruto,
        csex.nombre AS sexo
    FROM cdmx.nombramientos n
    JOIN cdmx.personas p ON n.persona_id = p.id
    LEFT JOIN cdmx.cat_sexos csex ON p.sexo_id = csex.id
    WHERE n.sueldo_bruto IS NOT NULL AND p.edad IS NOT NULL
),
agg AS (
    SELECT
        bucket_edad,
        ord,
        AVG(sueldo_bruto) FILTER (WHERE sexo = 'MASCULINO')::float AS avg_male,
        AVG(sueldo_bruto) FILTER (WHERE sexo = 'FEMENINO')::float AS avg_female,
        COUNT(*) FILTER (WHERE sexo = 'MASCULINO') AS count_male,
        COUNT(*) FILTER (WHERE sexo = 'FEMENINO') AS count_female,
        AVG(sueldo_bruto)::float AS avg_bucket
    FROM buckets
    WHERE bucket_edad IS NOT NULL
    GROUP BY bucket_edad, ord
)
SELECT
    bucket_edad,
    avg_male,
    avg_female,
    count_male,
    count_female,
    CASE
        WHEN avg_male IS NOT NULL AND avg_female IS NOT NULL AND avg_female > 0
            THEN ((avg_male - avg_female) / avg_female * 100)::float
        ELSE NULL
    END AS gap_pct,
    AVG(avg_bucket) OVER ()::float AS running_avg_global
FROM agg
ORDER BY ord
"""


@router.get("/puestos/ranking", response_model=list[PuestoRanking])
@limiter.limit("20/minute")
async def puestos_ranking(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
):
    """Top puestos por sueldo promedio con RANK, PERCENT_RANK y LAG (diferencia vs siguiente puesto)."""
    async with engine.connect() as conn:
        result = await conn.execute(text(SQL_PUESTOS_RANKING), {"limit": limit})
        rows = result.mappings().all()

    return [
        PuestoRanking(
            puesto_id=r["puesto_id"],
            nombre=r["nombre"],
            avg_sueldo=round(r["avg_sueldo"], 2),
            count=r["count"],
            rank=r["rank"],
            percent_rank=round(r["percent_rank"], 4),
            gap_vs_next=(
                round(r["avg_sueldo"] - r["prev_avg"], 2)
                if r["prev_avg"] is not None
                else None
            ),
        )
        for r in rows
    ]


@router.get("/sectores/ranking", response_model=list[SectorRanking])
@limiter.limit("20/minute")
async def sectores_ranking(request: Request):
    """Sectores rankeados por sueldo promedio con comparación vs media global (AVG OVER)."""
    async with engine.connect() as conn:
        result = await conn.execute(text(SQL_SECTORES_RANKING))
        rows = result.mappings().all()

    return [
        SectorRanking(
            sector_id=r["sector_id"],
            nombre=r["nombre"],
            avg_sueldo=round(r["avg_sueldo"], 2),
            count=r["count"],
            rank=r["rank"],
            percent_rank=round(r["percent_rank"], 4),
            avg_vs_global_pct=round(
                (r["avg_sueldo"] - r["avg_global"]) / r["avg_global"] * 100, 2
            )
            if r["avg_global"]
            else 0.0,
        )
        for r in rows
    ]


@router.get("/brecha-edad", response_model=list[BrechaEdadRow])
@limiter.limit("20/minute")
async def brecha_edad(request: Request):
    """Brecha salarial por grupo etario con AVG OVER para referencia global."""
    async with engine.connect() as conn:
        result = await conn.execute(text(SQL_BRECHA_EDAD))
        rows = result.mappings().all()

    return [
        BrechaEdadRow(
            bucket_edad=r["bucket_edad"],
            avg_male=round(r["avg_male"], 2) if r["avg_male"] is not None else None,
            avg_female=round(r["avg_female"], 2) if r["avg_female"] is not None else None,
            count_male=r["count_male"],
            count_female=r["count_female"],
            gap_pct=round(r["gap_pct"], 2) if r["gap_pct"] is not None else None,
            running_avg_global=round(r["running_avg_global"], 2),
        )
        for r in rows
    ]
