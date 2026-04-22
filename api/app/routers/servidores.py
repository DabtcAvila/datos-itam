from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import cast, func, select, String, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.dependencies import ServidorFilters, apply_filters, apply_ordering, get_filters
from app.models.catalogs import (
    CatNivelSalarial,
    CatPuesto,
    CatSector,
    CatSexo,
    CatTipoContratacion,
    CatTipoNomina,
    CatTipoPersonal,
    CatUniverso,
)
from app.models.servidores import Nombramiento, Persona
from app.rate_limit import limiter
from app.schemas.pagination import PaginatedResponse
from app.schemas.servidores import ServidorDetail, ServidorListItem, ServidorStats, SueldoDistribucion

router = APIRouter(prefix="/api/v1/servidores", tags=["servidores"])

P = Persona
N = Nombramiento


@router.get("/", response_model=PaginatedResponse[ServidorListItem])
@limiter.limit("30/minute")
async def list_servidores(
    request: Request,
    filters: ServidorFilters = Depends(get_filters),
    session: AsyncSession = Depends(get_session),
):
    # Count query
    count_stmt = (
        select(func.count(P.id))
        .select_from(P)
        .join(N, N.persona_id == P.id)
    )
    count_stmt = apply_filters(count_stmt, filters)
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    # Data query with JOINs for sector, puesto, and sexo names
    stmt = (
        select(
            P.id, P.nombre, P.apellido_1, P.apellido_2,
            CatSexo.nombre.label("sexo"), P.edad,
            N.sueldo_bruto, N.sueldo_neto,
            CatSector.nombre.label("sector"),
            CatPuesto.nombre.label("puesto"),
        )
        .select_from(P)
        .join(N, N.persona_id == P.id)
        .outerjoin(CatSexo, P.sexo_id == CatSexo.id)
        .outerjoin(CatSector, N.sector_id == CatSector.id)
        .outerjoin(CatPuesto, N.puesto_id == CatPuesto.id)
    )
    stmt = apply_filters(stmt, filters, _sexo_joined=True)
    stmt = apply_ordering(stmt, filters)
    stmt = stmt.offset((filters.page - 1) * filters.per_page).limit(filters.per_page)

    result = await session.execute(stmt)
    data = [
        ServidorListItem(
            id=r.id, nombre=r.nombre, apellido_1=r.apellido_1,
            apellido_2=r.apellido_2, sexo=r.sexo, edad=r.edad,
            sueldo_bruto=r.sueldo_bruto, sueldo_neto=r.sueldo_neto,
            sector=r.sector, puesto=r.puesto,
        )
        for r in result.all()
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=filters.page,
        per_page=filters.per_page,
        pages=(total + filters.per_page - 1) // filters.per_page if total > 0 else 0,
    )


@router.get("/stats", response_model=ServidorStats)
@limiter.limit("15/minute")
async def servidor_stats(
    request: Request,
    filters: ServidorFilters = Depends(get_filters),
    session: AsyncSession = Depends(get_session),
):
    # Build WHERE clause from filters
    where_clauses = []
    params: dict = {}

    if filters.sector_id is not None:
        where_clauses.append("n.sector_id = :sector_id")
        params["sector_id"] = filters.sector_id
    if filters.sexo is not None:
        where_clauses.append("csex.nombre = :sexo")
        params["sexo"] = filters.sexo
    if filters.edad_min is not None:
        where_clauses.append("p.edad >= :edad_min")
        params["edad_min"] = filters.edad_min
    if filters.edad_max is not None:
        where_clauses.append("p.edad <= :edad_max")
        params["edad_max"] = filters.edad_max
    if filters.sueldo_min is not None:
        where_clauses.append("n.sueldo_bruto >= :sueldo_min")
        params["sueldo_min"] = filters.sueldo_min
    if filters.sueldo_max is not None:
        where_clauses.append("n.sueldo_bruto <= :sueldo_max")
        params["sueldo_max"] = filters.sueldo_max
    if filters.tipo_contratacion_id is not None:
        where_clauses.append("n.tipo_contratacion_id = :tipo_contratacion_id")
        params["tipo_contratacion_id"] = filters.tipo_contratacion_id
    if filters.tipo_personal_id is not None:
        where_clauses.append("n.tipo_personal_id = :tipo_personal_id")
        params["tipo_personal_id"] = filters.tipo_personal_id
    if filters.universo_id is not None:
        where_clauses.append("n.universo_id = :universo_id")
        params["universo_id"] = filters.universo_id
    if filters.puesto_search is not None:
        where_clauses.append("cp.nombre ILIKE :puesto_search")
        params["puesto_search"] = f"%{filters.puesto_search}%"

    where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"
    join_puesto = "LEFT JOIN cdmx.cat_puestos cp ON n.puesto_id = cp.id" if filters.puesto_search else ""

    sql = f"""
    SELECT
        COUNT(*) AS total,
        AVG(n.sueldo_bruto)::float AS sueldo_bruto_avg,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY n.sueldo_bruto)::float AS sueldo_bruto_median,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY n.sueldo_bruto)::float AS sueldo_bruto_p25,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY n.sueldo_bruto)::float AS sueldo_bruto_p75,
        MIN(n.sueldo_bruto)::float AS sueldo_bruto_min,
        MAX(n.sueldo_bruto)::float AS sueldo_bruto_max,
        AVG(n.sueldo_neto)::float AS sueldo_neto_avg,
        AVG(p.edad)::float AS edad_avg,
        COUNT(*) FILTER (WHERE csex.nombre = 'MASCULINO') AS count_hombres,
        COUNT(*) FILTER (WHERE csex.nombre = 'FEMENINO') AS count_mujeres,
        CASE
            WHEN AVG(n.sueldo_bruto) FILTER (WHERE csex.nombre = 'FEMENINO') > 0
            THEN ((AVG(n.sueldo_bruto) FILTER (WHERE csex.nombre = 'MASCULINO')
                  - AVG(n.sueldo_bruto) FILTER (WHERE csex.nombre = 'FEMENINO'))
                  / AVG(n.sueldo_bruto) FILTER (WHERE csex.nombre = 'FEMENINO') * 100)::float
            ELSE NULL
        END AS brecha_genero_pct
    FROM cdmx.nombramientos n
    JOIN cdmx.personas p ON n.persona_id = p.id
    LEFT JOIN cdmx.cat_sexos csex ON p.sexo_id = csex.id
    {join_puesto}
    WHERE {where_sql}
    """

    result = await session.execute(text(sql), params)
    row = result.mappings().one()

    # Distribution query
    dist_sql = f"""
    SELECT
        CASE
            WHEN n.sueldo_bruto < 5000 THEN '0-5K'
            WHEN n.sueldo_bruto < 10000 THEN '5K-10K'
            WHEN n.sueldo_bruto < 20000 THEN '10K-20K'
            WHEN n.sueldo_bruto < 30000 THEN '20K-30K'
            WHEN n.sueldo_bruto < 50000 THEN '30K-50K'
            WHEN n.sueldo_bruto < 80000 THEN '50K-80K'
            WHEN n.sueldo_bruto < 120000 THEN '80K-120K'
            ELSE '120K+'
        END AS rango,
        COUNT(*) AS count
    FROM cdmx.nombramientos n
    JOIN cdmx.personas p ON n.persona_id = p.id
    LEFT JOIN cdmx.cat_sexos csex ON p.sexo_id = csex.id
    {join_puesto}
    WHERE {where_sql} AND n.sueldo_bruto IS NOT NULL
    GROUP BY rango
    ORDER BY MIN(n.sueldo_bruto)
    """
    dist_result = await session.execute(text(dist_sql), params)
    distribucion = [SueldoDistribucion(rango=r["rango"], count=r["count"]) for r in dist_result.mappings().all()]

    return ServidorStats(
        total=row["total"],
        sueldo_bruto_avg=row["sueldo_bruto_avg"],
        sueldo_bruto_median=row["sueldo_bruto_median"],
        sueldo_bruto_p25=row["sueldo_bruto_p25"],
        sueldo_bruto_p75=row["sueldo_bruto_p75"],
        sueldo_bruto_min=row["sueldo_bruto_min"],
        sueldo_bruto_max=row["sueldo_bruto_max"],
        sueldo_neto_avg=row["sueldo_neto_avg"],
        edad_avg=row["edad_avg"],
        count_hombres=row["count_hombres"],
        count_mujeres=row["count_mujeres"],
        brecha_genero_pct=row["brecha_genero_pct"],
        distribucion_sueldo=distribucion,
    )


@router.get("/{servidor_id}", response_model=ServidorDetail)
@limiter.limit("60/minute")
async def get_servidor(
    request: Request,
    servidor_id: int,
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(
            P.id, P.nombre, P.apellido_1, P.apellido_2,
            CatSexo.nombre.label("sexo"), P.edad,
            N.sueldo_bruto, N.sueldo_neto,
            N.fecha_ingreso,
            CatNivelSalarial.clave.label("id_nivel_salarial"),
            CatSector.nombre.label("sector"),
            CatPuesto.nombre.label("puesto"),
            CatTipoContratacion.nombre.label("tipo_contratacion"),
            CatTipoPersonal.nombre.label("tipo_personal"),
            cast(CatTipoNomina.clave, String).label("tipo_nomina"),
            CatUniverso.nombre.label("universo"),
        )
        .select_from(P)
        .join(N, N.persona_id == P.id)
        .outerjoin(CatSexo, P.sexo_id == CatSexo.id)
        .outerjoin(CatSector, N.sector_id == CatSector.id)
        .outerjoin(CatPuesto, N.puesto_id == CatPuesto.id)
        .outerjoin(CatTipoContratacion, N.tipo_contratacion_id == CatTipoContratacion.id)
        .outerjoin(CatTipoPersonal, N.tipo_personal_id == CatTipoPersonal.id)
        .outerjoin(CatTipoNomina, N.tipo_nomina_id == CatTipoNomina.id)
        .outerjoin(CatUniverso, N.universo_id == CatUniverso.id)
        .outerjoin(CatNivelSalarial, N.nivel_salarial_id == CatNivelSalarial.id)
        .where(P.id == servidor_id)
    )
    result = await session.execute(stmt)
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Servidor no encontrado")

    return ServidorDetail(
        id=row.id, nombre=row.nombre, apellido_1=row.apellido_1,
        apellido_2=row.apellido_2, sexo=row.sexo, edad=row.edad,
        sueldo_bruto=row.sueldo_bruto, sueldo_neto=row.sueldo_neto,
        fecha_ingreso=row.fecha_ingreso, id_nivel_salarial=row.id_nivel_salarial,
        sector=row.sector, puesto=row.puesto,
        tipo_contratacion=row.tipo_contratacion, tipo_personal=row.tipo_personal,
        tipo_nomina=row.tipo_nomina, universo=row.universo,
    )
