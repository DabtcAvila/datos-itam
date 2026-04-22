"""Public REST endpoints for the ENIGH 2024 Nueva Serie dataset (INEGI).

Grupos de endpoints (S7):
  - Grupo D (utilidad)         : /metadata, /validaciones
  - Grupo A (descriptivos)     : /hogares/summary, /hogares/by-decil,
                                 /hogares/by-entidad, /poblacion/demographics,
                                 /gastos/by-rubro
  - Grupo B (actividad)        : /actividad/agro, /actividad/noagro,
                                 /actividad/jcf

Principios (heredados S2-S6):
  - Cifras nacionales siempre con SUM(col * factor) / SUM(factor)
  - Endpoints citables vs INEGI usan `concentradohogar` (summary, no ledger)
  - Cobertura "hogares con actividad X" usa DISTINCT (folioviv, foliohog)
  - Los 9 rubros INEGI vienen de columnas agregadas del concentradohogar,
    NO de `gastoshogar` con prefijos (decisión §1.quater plan v2)
"""
from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import text

from app.database import engine
from app.rate_limit import limiter
from app.schemas.enigh import (
    ActividadAgroResponse,
    ActividadDecilRow,
    ActividadEntidadRow,
    ActividadJcfResponse,
    ActividadNoagroResponse,
    DecilRow,
    DemographicsResponse,
    EdadBucket,
    EnighMetadata,
    EntidadRow,
    HogaresSummary,
    JcfEntidadRow,
    RubroRow,
    RubrosResponse,
    SexoCount,
    SourceRef,
    ValidacionRow,
    ValidacionesResponse,
)

router = APIRouter(prefix="/api/v1/enigh", tags=["enigh"])


# ---------------------------------------------------------------------
# Constants (metadata, bounds oficiales INEGI)
# ---------------------------------------------------------------------

ENIGH_EDITION = "ENIGH 2024 Nueva Serie"
ENIGH_REFERENCE_DATE = "2024 (levantamiento agosto-noviembre)"
ENIGH_PERIODICITY = "trimestral (expandido a nacional con factor)"
SCHEMA_VERSION = "007"

# Los 10 HIGH bounds de gastos (INEGI Comunicado 112/25 p.5/6 — mensual):
BOUNDS_GASTOS_MENSUAL: list[tuple[str, str, str, int, float]] = [
    # (col, slug, nombre, valor_oficial_mensual, tol_rel)
    ("gasto_mon",  "gasto_monetario",       "Gasto monetario total",           15_891, 0.005),
    ("alimentos",  "alimentos",             "Alimentos, bebidas y tabaco",      5_994, 0.002),
    ("transporte", "transporte",            "Transporte y comunicaciones",      3_106, 0.002),
    ("educa_espa", "educacion_esparcimiento","Educación y esparcimiento",       1_531, 0.002),
    ("vivienda",   "vivienda",              "Vivienda y servicios",             1_449, 0.002),
    ("personales", "cuidados_personales",   "Cuidados personales",              1_236, 0.002),
    ("limpieza",   "limpieza_hogar",        "Enseres / limpieza del hogar",     1_005, 0.002),
    ("vesti_calz", "vestido_calzado",       "Vestido y calzado",                  610, 0.005),
    ("salud",      "salud",                 "Salud",                              535, 0.005),
    ("transf_gas", "transferencias_gasto",  "Transferencias y otros gastos",      425, 0.005),
]

# Los 3 HIGH bounds de ingreso (INEGI Comunicado 112/25 p.5/6 cuadro 2 — trimestral):
BOUNDS_INGRESO_TRIM: list[tuple[str, str, int, float]] = [
    ("total", "Ingreso corriente promedio por hogar (total)", 77_864, 0.01),
    ("d1",    "Ingreso corriente promedio — decil I",          16_795, 0.02),
    ("d10",   "Ingreso corriente promedio — decil X",         236_095, 0.03),
]

# 9 rubros INEGI (sin gasto_mon total) — para /gastos/by-rubro y narrative
RUBROS: list[tuple[str, str, str]] = [
    ("alimentos",  "alimentos",              "Alimentos, bebidas y tabaco"),
    ("transporte", "transporte",             "Transporte y comunicaciones"),
    ("educa_espa", "educacion_esparcimiento","Educación y esparcimiento"),
    ("vivienda",   "vivienda",               "Vivienda y servicios"),
    ("personales", "cuidados_personales",    "Cuidados personales"),
    ("limpieza",   "limpieza_hogar",         "Enseres / limpieza del hogar"),
    ("vesti_calz", "vestido_calzado",        "Vestido y calzado"),
    ("salud",      "salud",                  "Salud"),
    ("transf_gas", "transferencias_gasto",   "Transferencias y otros gastos"),
]

SOURCES: list[SourceRef] = [
    SourceRef(
        title="Comunicado de Prensa 112/25 — ENIGH 2024",
        url="https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/enigh/ENIGH2024.pdf",
        consulted_on="2026-04-21",
    ),
    SourceRef(
        title="Presentación de resultados ENIGH 2024 (JULIO 2025)",
        url="https://www.inegi.org.mx/contenidos/programas/enigh/nc/2024/doc/enigh2024_ns_presentacion_resultados.pdf",
        consulted_on="2026-04-22",
    ),
    SourceRef(
        title="Catálogo ENIGH 2024 — Nueva Serie",
        url="https://www.inegi.org.mx/programas/enigh/nc/2024/",
        consulted_on="2026-04-21",
    ),
]

METHODOLOGY_NOTES: list[str] = [
    "Todas las cifras nacionales usan SUM(columna * factor) / SUM(factor); "
    "los agregados muestrales (simple promedio de filas) NO se exponen.",
    "Las publicaciones oficiales INEGI se reproducen desde concentradohogar "
    "(tabla summary), no desde gastoshogar (tabla ledger de eventos). "
    "Ver §1.quater del plan de schema: concentradohogar integra dedup/neteo "
    "aplicado por INEGI internamente.",
    "Las cifras publicadas por INEGI son MENSUALES; el microdato almacena "
    "TRIMESTRALES. Los endpoints devuelven ambas unidades cuando aplica.",
    "Cobertura 'hogares con actividad X' usa DISTINCT (folioviv, foliohog) "
    "sobre la tabla de la actividad porque agro/noagro son tablas "
    "persona-trabajo-tipoact, no hogar-raíz.",
    "cat_entidad.clave usa 2 dígitos (01-32); se deriva vía LEFT(ubica_geo, 2) "
    "o se toma directo de hogares.entidad según la tabla.",
]


# ---------------------------------------------------------------------
# SQL queries
# ---------------------------------------------------------------------

SQL_HOGARES_SUMMARY = """
SELECT
    COUNT(*)::bigint AS n_muestra,
    SUM(factor)::bigint AS n_expandido,
    (SUM(ing_cor * factor) / SUM(factor))::float AS mean_ing_cor_trim,
    (SUM(gasto_mon * factor) / SUM(factor))::float AS mean_gasto_mon_trim
FROM enigh.concentradohogar
"""

SQL_HOGARES_BY_DECIL = """
SELECT
    decil::int AS decil,
    COUNT(*)::bigint AS n_muestra,
    SUM(factor)::bigint AS n_expandido,
    (SUM(ing_cor * factor) / SUM(factor))::float AS mean_ing_cor_trim,
    (SUM(gasto_mon * factor) / SUM(factor))::float AS mean_gasto_mon_trim,
    (100.0 * SUM(factor) / (SELECT SUM(factor) FROM enigh.concentradohogar))::float AS share_factor_pct
FROM enigh.concentradohogar
WHERE decil IS NOT NULL
GROUP BY decil
ORDER BY decil
"""

SQL_HOGARES_BY_ENTIDAD = """
SELECT
    LEFT(c.ubica_geo, 2) AS clave,
    e.descripcion AS nombre,
    COUNT(*)::bigint AS n_muestra,
    SUM(c.factor)::bigint AS n_expandido,
    (SUM(c.ing_cor * c.factor) / SUM(c.factor))::float AS mean_ing_cor_trim,
    (SUM(c.gasto_mon * c.factor) / SUM(c.factor))::float AS mean_gasto_mon_trim
FROM enigh.concentradohogar c
JOIN enigh.cat_entidad e ON LEFT(c.ubica_geo, 2) = e.clave
WHERE (CAST(:entidad AS text) IS NULL OR LEFT(c.ubica_geo, 2) = :entidad)
GROUP BY LEFT(c.ubica_geo, 2), e.descripcion
ORDER BY mean_ing_cor_trim DESC
"""

SQL_POBLACION_DEMOGRAPHICS = """
SELECT
    COUNT(*)::bigint AS muestra,
    SUM(p.factor)::bigint AS expandido,
    SUM(CASE WHEN p.sexo='1' THEN p.factor ELSE 0 END)::bigint AS hombres_exp,
    SUM(CASE WHEN p.sexo='2' THEN p.factor ELSE 0 END)::bigint AS mujeres_exp,
    SUM(CASE WHEN p.edad < 15 THEN p.factor ELSE 0 END)::bigint AS edad_0_14,
    SUM(CASE WHEN p.edad BETWEEN 15 AND 29 THEN p.factor ELSE 0 END)::bigint AS edad_15_29,
    SUM(CASE WHEN p.edad BETWEEN 30 AND 44 THEN p.factor ELSE 0 END)::bigint AS edad_30_44,
    SUM(CASE WHEN p.edad BETWEEN 45 AND 64 THEN p.factor ELSE 0 END)::bigint AS edad_45_64,
    SUM(CASE WHEN p.edad >= 65 THEN p.factor ELSE 0 END)::bigint AS edad_65_plus
FROM enigh.poblacion p
LEFT JOIN enigh.hogares h USING (folioviv, foliohog)
WHERE (CAST(:entidad AS text) IS NULL OR h.entidad = :entidad)
"""

SQL_AGRO_COBERTURA = """
WITH hog_agro AS (
    SELECT DISTINCT folioviv, foliohog FROM enigh.agro
),
cob AS (
    SELECT COUNT(*)::bigint AS n_muestra,
           SUM(h.factor)::bigint AS n_expandido
    FROM hog_agro ha
    JOIN enigh.hogares h USING (folioviv, foliohog)
),
ventas AS (
    SELECT COALESCE(SUM(valrema), 0)::bigint AS sum_ventas,
           COALESCE(SUM(valproc), 0)::bigint AS sum_procesado
    FROM enigh.agro
)
SELECT cob.n_muestra, cob.n_expandido,
       (SELECT SUM(factor)::bigint FROM enigh.hogares) AS n_universo,
       ventas.sum_ventas, ventas.sum_procesado
FROM cob, ventas
"""

SQL_AGRO_GASTO_NEGOCIO = """
SELECT COALESCE(SUM(gasto), 0)::bigint AS sum_gasto_negocio
FROM enigh.agrogasto
"""

SQL_AGRO_POR_DECIL = """
WITH hog_agro AS (
    SELECT DISTINCT folioviv, foliohog FROM enigh.agro
),
agro_x_decil AS (
    SELECT c.decil::int AS decil,
           COUNT(*)::bigint AS n_muestra,
           SUM(c.factor)::bigint AS n_expandido
    FROM hog_agro ha
    JOIN enigh.concentradohogar c USING (folioviv, foliohog)
    WHERE c.decil IS NOT NULL
    GROUP BY c.decil
),
total_agro AS (SELECT SUM(n_expandido)::bigint AS t FROM agro_x_decil)
SELECT a.decil, a.n_muestra, a.n_expandido,
       (100.0 * a.n_expandido / (SELECT t FROM total_agro))::float AS pct_share_actividad
FROM agro_x_decil a ORDER BY a.decil
"""

SQL_AGRO_TOP_ENTIDADES = """
WITH hog_agro AS (
    SELECT DISTINCT folioviv, foliohog FROM enigh.agro
)
SELECT h.entidad AS clave, e.descripcion AS nombre,
       SUM(h.factor)::bigint AS n_expandido
FROM hog_agro ha
JOIN enigh.hogares h USING (folioviv, foliohog)
JOIN enigh.cat_entidad e ON h.entidad = e.clave
GROUP BY h.entidad, e.descripcion
ORDER BY n_expandido DESC
LIMIT 5
"""

SQL_NOAGRO_COBERTURA = """
WITH hog_noagro AS (
    SELECT DISTINCT folioviv, foliohog FROM enigh.noagro
)
SELECT
    COUNT(*)::bigint AS n_muestra,
    SUM(h.factor)::bigint AS n_expandido,
    (SELECT SUM(factor)::bigint FROM enigh.hogares) AS n_universo
FROM hog_noagro hn
JOIN enigh.hogares h USING (folioviv, foliohog)
"""

SQL_NOAGRO_TRIM = """
SELECT COALESCE(SUM(ventas_tri), 0)::bigint AS sum_ventas_trim,
       COALESCE(SUM(ing_tri), 0)::bigint AS sum_ingreso_trim
FROM enigh.noagro
"""

SQL_NOAGRO_POR_DECIL = """
WITH hog_noagro AS (
    SELECT DISTINCT folioviv, foliohog FROM enigh.noagro
),
noagro_x_decil AS (
    SELECT c.decil::int AS decil,
           COUNT(*)::bigint AS n_muestra,
           SUM(c.factor)::bigint AS n_expandido
    FROM hog_noagro hn
    JOIN enigh.concentradohogar c USING (folioviv, foliohog)
    WHERE c.decil IS NOT NULL
    GROUP BY c.decil
),
total_noagro AS (SELECT SUM(n_expandido)::bigint AS t FROM noagro_x_decil)
SELECT a.decil, a.n_muestra, a.n_expandido,
       (100.0 * a.n_expandido / (SELECT t FROM total_noagro))::float AS pct_share_actividad
FROM noagro_x_decil a ORDER BY a.decil
"""

SQL_NOAGRO_TOP_ENTIDADES = """
WITH hog_noagro AS (
    SELECT DISTINCT folioviv, foliohog FROM enigh.noagro
)
SELECT h.entidad AS clave, e.descripcion AS nombre,
       SUM(h.factor)::bigint AS n_expandido
FROM hog_noagro hn
JOIN enigh.hogares h USING (folioviv, foliohog)
JOIN enigh.cat_entidad e ON h.entidad = e.clave
GROUP BY h.entidad, e.descripcion
ORDER BY n_expandido DESC
LIMIT 5
"""

SQL_JCF_SUMMARY = """
SELECT
    COUNT(DISTINCT (folioviv, foliohog, numren))::bigint AS n_muestra,
    SUM(ing_tri)::bigint AS sum_ing_tri
FROM enigh.ingresos_jcf
"""

SQL_JCF_POR_ENTIDAD = """
SELECT h.entidad AS clave, e.descripcion AS nombre,
       COUNT(DISTINCT (j.folioviv, j.foliohog, j.numren))::bigint AS benef_muestra,
       SUM(p.factor)::bigint AS benef_expandido
FROM enigh.ingresos_jcf j
JOIN enigh.hogares h USING (folioviv, foliohog)
JOIN enigh.poblacion p USING (folioviv, foliohog, numren)
JOIN enigh.cat_entidad e ON h.entidad = e.clave
GROUP BY h.entidad, e.descripcion
ORDER BY benef_expandido DESC
"""


# ---------------------------------------------------------------------
# Grupo D — utilidad
# ---------------------------------------------------------------------


@router.get("/metadata", response_model=EnighMetadata)
@limiter.limit("60/minute")
async def enigh_metadata(request: Request):
    """Metadata del dataset ENIGH 2024 NS: edición, fuentes, schema, totales."""
    async with engine.connect() as conn:
        r = (await conn.execute(text(
            "SELECT COUNT(*)::bigint AS n_muestra, SUM(factor)::bigint AS n_expandido "
            "FROM enigh.concentradohogar"
        ))).mappings().one()

    return EnighMetadata(
        edition=ENIGH_EDITION,
        periodicity=ENIGH_PERIODICITY,
        reference_date=ENIGH_REFERENCE_DATE,
        schema_version=SCHEMA_VERSION,
        last_updated="2026-04-22",
        total_hogares_muestra=r["n_muestra"],
        total_hogares_expandido=r["n_expandido"],
        total_tablas_ingestadas=17,
        total_catalogos=111,
        sources=SOURCES,
        methodology_notes=METHODOLOGY_NOTES,
    )


@router.get("/validaciones", response_model=ValidacionesResponse)
@limiter.limit("30/minute")
async def enigh_validaciones(request: Request):
    """Los 13 bounds HIGH vs INEGI oficial (Comunicado 112/25).

    - 3 bounds ingreso (total, decil 1, decil 10) — trimestrales
    - 10 bounds gasto (gasto_mon + 9 rubros) — mensuales

    Todos reproducen al peso al 2026-04-22 (ver proyect memory S3, S5).
    """
    bounds: list[ValidacionRow] = []

    async with engine.connect() as conn:
        # Ingreso (3 bounds trimestrales)
        total_r = (await conn.execute(text(SQL_HOGARES_SUMMARY))).mappings().one()
        d_rows = (await conn.execute(text(SQL_HOGARES_BY_DECIL))).mappings().all()
        d1 = next(r for r in d_rows if r["decil"] == 1)
        d10 = next(r for r in d_rows if r["decil"] == 10)

        for scope, name, oficial, tol in BOUNDS_INGRESO_TRIM:
            if scope == "total":
                calc = total_r["mean_ing_cor_trim"]
            elif scope == "d1":
                calc = d1["mean_ing_cor_trim"]
            else:
                calc = d10["mean_ing_cor_trim"]
            delta = (calc - oficial) / oficial
            bounds.append(ValidacionRow(
                id=f"ingreso_{scope}",
                scope=scope,
                metric=name,
                column="ing_cor",
                unit="pesos trimestrales por hogar",
                calculado=round(calc, 2),
                oficial=float(oficial),
                delta_pct=round(delta * 100, 4),
                tolerance_pct=round(tol * 100, 2),
                passing=abs(delta) <= tol,
                source="INEGI Comunicado 112/25 p.5/6 cuadro 2",
            ))

        # Gasto (10 bounds mensuales — la cifra oficial es mensual, DB guarda trimestral)
        rubros_sql = ", ".join(
            f"(SUM({col} * factor) / SUM(factor))::float AS {col}_trim"
            for col, *_ in BOUNDS_GASTOS_MENSUAL
        )
        gastos_r = (await conn.execute(text(
            f"SELECT {rubros_sql} FROM enigh.concentradohogar"
        ))).mappings().one()

    for col, slug, name, oficial, tol in BOUNDS_GASTOS_MENSUAL:
        calc_trim = gastos_r[f"{col}_trim"]
        calc_mensual = calc_trim / 3.0
        delta = (calc_mensual - oficial) / oficial
        bounds.append(ValidacionRow(
            id=f"gasto_{slug}",
            scope="mensual",
            metric=name,
            column=col,
            unit="pesos mensuales por hogar",
            calculado=round(calc_mensual, 2),
            oficial=float(oficial),
            delta_pct=round(delta * 100, 4),
            tolerance_pct=round(tol * 100, 2),
            passing=abs(delta) <= tol,
            source="INEGI Comunicado 112/25 p.5/6 cuadro 2",
        ))

    passing = sum(1 for b in bounds if b.passing)
    return ValidacionesResponse(
        count=len(bounds),
        passing=passing,
        failing=len(bounds) - passing,
        bounds=bounds,
    )


# ---------------------------------------------------------------------
# Grupo A — descriptivos
# ---------------------------------------------------------------------


@router.get("/hogares/summary", response_model=HogaresSummary)
@limiter.limit("60/minute")
async def hogares_summary(request: Request):
    """Agregado nacional ponderado: hogares muestra + expandido, mean ing_cor, mean gasto_mon."""
    async with engine.connect() as conn:
        r = (await conn.execute(text(SQL_HOGARES_SUMMARY))).mappings().one()
    return HogaresSummary(
        n_hogares_muestra=r["n_muestra"],
        n_hogares_expandido=r["n_expandido"],
        mean_ing_cor_trim=round(r["mean_ing_cor_trim"], 2),
        mean_ing_cor_mensual=round(r["mean_ing_cor_trim"] / 3.0, 2),
        mean_gasto_mon_trim=round(r["mean_gasto_mon_trim"], 2),
        mean_gasto_mon_mensual=round(r["mean_gasto_mon_trim"] / 3.0, 2),
        edition=ENIGH_EDITION,
        source="INEGI ENIGH 2024 NS — concentradohogar (tabla summary oficial)",
    )


@router.get("/hogares/by-decil", response_model=list[DecilRow])
@limiter.limit("30/minute")
async def hogares_by_decil(request: Request):
    """Distribución de ingreso/gasto por decil nacional (factor-weighted cumulative, INEGI-standard)."""
    async with engine.connect() as conn:
        rows = (await conn.execute(text(SQL_HOGARES_BY_DECIL))).mappings().all()
    return [
        DecilRow(
            decil=r["decil"],
            n_hogares_muestra=r["n_muestra"],
            n_hogares_expandido=r["n_expandido"],
            mean_ing_cor_trim=round(r["mean_ing_cor_trim"], 2),
            mean_ing_cor_mensual=round(r["mean_ing_cor_trim"] / 3.0, 2),
            mean_gasto_mon_trim=round(r["mean_gasto_mon_trim"], 2),
            share_factor_pct=round(r["share_factor_pct"], 2),
        )
        for r in rows
    ]


@router.get("/hogares/by-entidad", response_model=list[EntidadRow])
@limiter.limit("30/minute")
async def hogares_by_entidad(
    request: Request,
    entidad: str | None = Query(
        None,
        pattern=r"^\d{2}$",
        description="Clave entidad 2 dígitos (01-32). Si omite, devuelve las 32.",
    ),
):
    """Hogares agregados por entidad. Orden descendente por mean ing_cor."""
    async with engine.connect() as conn:
        rows = (await conn.execute(
            text(SQL_HOGARES_BY_ENTIDAD), {"entidad": entidad}
        )).mappings().all()
    if entidad and not rows:
        raise HTTPException(404, f"Entidad '{entidad}' no encontrada")
    return [
        EntidadRow(
            clave=r["clave"],
            nombre=r["nombre"],
            n_hogares_muestra=r["n_muestra"],
            n_hogares_expandido=r["n_expandido"],
            mean_ing_cor_trim=round(r["mean_ing_cor_trim"], 2),
            mean_ing_cor_mensual=round(r["mean_ing_cor_trim"] / 3.0, 2),
            mean_gasto_mon_trim=round(r["mean_gasto_mon_trim"], 2),
        )
        for r in rows
    ]


@router.get("/poblacion/demographics", response_model=DemographicsResponse)
@limiter.limit("30/minute")
async def poblacion_demographics(
    request: Request,
    entidad: str | None = Query(None, pattern=r"^\d{2}$"),
):
    """Pirámide demográfica ponderada: sexo + 5 cohortes etarios. Opcional por entidad."""
    async with engine.connect() as conn:
        r = (await conn.execute(
            text(SQL_POBLACION_DEMOGRAPHICS), {"entidad": entidad}
        )).mappings().one()
    if entidad and (r["expandido"] or 0) == 0:
        raise HTTPException(404, f"Entidad '{entidad}' no encontrada")
    exp = r["expandido"]
    scope = f"entidad {entidad}" if entidad else "nacional"
    return DemographicsResponse(
        scope=scope,
        n_personas_muestra=r["muestra"],
        n_personas_expandido=exp,
        sexo=[
            SexoCount(sexo="hombres", n_expandido=r["hombres_exp"],
                      pct=round(100 * r["hombres_exp"] / exp, 2)),
            SexoCount(sexo="mujeres", n_expandido=r["mujeres_exp"],
                      pct=round(100 * r["mujeres_exp"] / exp, 2)),
        ],
        edad=[
            EdadBucket(bucket=label, n_expandido=r[col],
                       pct=round(100 * r[col] / exp, 2))
            for label, col in [
                ("0-14", "edad_0_14"),
                ("15-29", "edad_15_29"),
                ("30-44", "edad_30_44"),
                ("45-64", "edad_45_64"),
                ("65+", "edad_65_plus"),
            ]
        ],
    )


@router.get("/gastos/by-rubro", response_model=RubrosResponse)
@limiter.limit("30/minute")
async def gastos_by_rubro(
    request: Request,
    decil: int | None = Query(None, ge=1, le=10),
):
    """Los 9 rubros INEGI desde concentradohogar (summary oficial).

    Cuando `decil` se especifica, la query se filtra a ese decil y `pct_del_monetario`
    se calcula respecto al gasto_mon de ese decil. Los valores `oficial_mensual` solo
    aplican al total nacional (no a deciles específicos).
    """
    cols_select = ", ".join(
        f"(SUM({col} * factor) / SUM(factor))::float AS {col}_trim"
        for col, *_ in RUBROS
    )
    sql = f"""
    SELECT
        (SUM(gasto_mon * factor) / SUM(factor))::float AS gasto_mon_trim,
        {cols_select}
    FROM enigh.concentradohogar
    WHERE (CAST(:decil AS int) IS NULL OR decil = :decil)
    """
    async with engine.connect() as conn:
        r = (await conn.execute(text(sql), {"decil": decil})).mappings().one()

    gasto_mon = r["gasto_mon_trim"] or 0
    if gasto_mon == 0:
        raise HTTPException(404, f"Decil {decil} sin datos")

    oficiales = {col: of for col, _, _, of, _ in BOUNDS_GASTOS_MENSUAL}

    rubros_out = []
    for col, slug, nombre in RUBROS:
        trim = r[f"{col}_trim"]
        mensual = trim / 3.0
        of = oficiales.get(col)
        # oficial solo aplica al total nacional (decil is None)
        delta = ((mensual - of) / of * 100) if (of and decil is None) else None
        rubros_out.append(RubroRow(
            slug=slug,
            nombre=nombre,
            mean_gasto_trim=round(trim, 2),
            mean_gasto_mensual=round(mensual, 2),
            pct_del_monetario=round(100 * trim / gasto_mon, 2),
            oficial_mensual=float(of) if (of and decil is None) else None,
            bound_delta_pct=round(delta, 4) if delta is not None else None,
        ))

    return RubrosResponse(
        decil=decil,
        mean_gasto_mon_trim=round(gasto_mon, 2),
        rubros=rubros_out,
    )


# ---------------------------------------------------------------------
# Grupo B — actividad económica
# ---------------------------------------------------------------------


@router.get("/actividad/agro", response_model=ActividadAgroResponse)
@limiter.limit("30/minute")
async def actividad_agro(request: Request):
    """Hogares con actividad agropecuaria. Cobertura, distribución por decil, top entidades, ventas."""
    async with engine.connect() as conn:
        cob = (await conn.execute(text(SQL_AGRO_COBERTURA))).mappings().one()
        gas = (await conn.execute(text(SQL_AGRO_GASTO_NEGOCIO))).mappings().one()
        dec = (await conn.execute(text(SQL_AGRO_POR_DECIL))).mappings().all()
        ent = (await conn.execute(text(SQL_AGRO_TOP_ENTIDADES))).mappings().all()

    n_muestra = cob["n_muestra"] or 0
    n_exp = cob["n_expandido"] or 0
    n_univ = cob["n_universo"] or 1
    mean_ventas = (cob["sum_ventas"] / n_muestra) if n_muestra > 0 else 0.0

    return ActividadAgroResponse(
        n_hogares_muestra=n_muestra,
        n_hogares_expandido=n_exp,
        pct_del_universo=round(100 * n_exp / n_univ, 2),
        sum_ventas_trim=cob["sum_ventas"],
        sum_gasto_negocio_trim=gas["sum_gasto_negocio"],
        mean_ventas_por_hogar=round(mean_ventas, 2),
        por_decil=[
            ActividadDecilRow(
                decil=r["decil"],
                n_hogares_muestra=r["n_muestra"],
                n_hogares_expandido=r["n_expandido"],
                pct_share_actividad=round(r["pct_share_actividad"], 2),
            ) for r in dec
        ],
        top_entidades=[
            ActividadEntidadRow(clave=r["clave"], nombre=r["nombre"],
                                n_hogares_expandido=r["n_expandido"])
            for r in ent
        ],
        note="Agro = subsistencia rural (31.9% en decil 1, ratio d1/d10 = 12.8×). "
             "Ventas y gasto_negocio son trimestrales (agro.valrema/valproc, "
             "agrogasto.gas_nm_tri). Cobertura usa DISTINCT (folioviv, foliohog) "
             "porque agro es tabla persona-trabajo-tipoact.",
    )


@router.get("/actividad/noagro", response_model=ActividadNoagroResponse)
@limiter.limit("30/minute")
async def actividad_noagro(request: Request):
    """Hogares con actividad NO agropecuaria (comercio, servicios, manufactura)."""
    async with engine.connect() as conn:
        cob = (await conn.execute(text(SQL_NOAGRO_COBERTURA))).mappings().one()
        tri = (await conn.execute(text(SQL_NOAGRO_TRIM))).mappings().one()
        dec = (await conn.execute(text(SQL_NOAGRO_POR_DECIL))).mappings().all()
        ent = (await conn.execute(text(SQL_NOAGRO_TOP_ENTIDADES))).mappings().all()

    n_muestra = cob["n_muestra"] or 0
    n_exp = cob["n_expandido"] or 0
    n_univ = cob["n_universo"] or 1
    mean_ventas = (tri["sum_ventas_trim"] / n_muestra) if n_muestra > 0 else 0.0

    return ActividadNoagroResponse(
        n_hogares_muestra=n_muestra,
        n_hogares_expandido=n_exp,
        pct_del_universo=round(100 * n_exp / n_univ, 2),
        sum_ventas_trim=tri["sum_ventas_trim"],
        sum_ingreso_trim=tri["sum_ingreso_trim"],
        mean_ventas_por_hogar=round(mean_ventas, 2),
        por_decil=[
            ActividadDecilRow(
                decil=r["decil"],
                n_hogares_muestra=r["n_muestra"],
                n_hogares_expandido=r["n_expandido"],
                pct_share_actividad=round(r["pct_share_actividad"], 2),
            ) for r in dec
        ],
        top_entidades=[
            ActividadEntidadRow(clave=r["clave"], nombre=r["nombre"],
                                n_hogares_expandido=r["n_expandido"])
            for r in ent
        ],
        note="Noagro = transversal al tejido socioeconómico (banda 8.4-10.5% por "
             "decil, ratio d1/d10 = 1.3×). Perfil geográfico urbano/metropolitano "
             "(Edo Mex, CDMX, Jalisco). Cobertura usa DISTINCT (folioviv, foliohog).",
    )


@router.get("/actividad/jcf", response_model=ActividadJcfResponse)
@limiter.limit("30/minute")
async def actividad_jcf(request: Request):
    """Beneficiarios del Programa Jóvenes Construyendo el Futuro (JCF).

    Dataset pequeño (n=327 muestra). Distribución por entidad + promedio ingreso trimestral.
    Expandido usa poblacion.factor (factor de persona, no hogar) porque
    beneficiarios son individuos.
    """
    async with engine.connect() as conn:
        sm = (await conn.execute(text(SQL_JCF_SUMMARY))).mappings().one()
        exp_sql = """
        SELECT COALESCE(SUM(p.factor), 0)::bigint AS n_expandido
        FROM (SELECT DISTINCT folioviv, foliohog, numren FROM enigh.ingresos_jcf) j
        JOIN enigh.poblacion p USING (folioviv, foliohog, numren)
        """
        ex = (await conn.execute(text(exp_sql))).mappings().one()
        ent = (await conn.execute(text(SQL_JCF_POR_ENTIDAD))).mappings().all()

    n_mu = sm["n_muestra"] or 0
    sum_ing = sm["sum_ing_tri"] or 0
    mean_ing = (sum_ing / n_mu) if n_mu > 0 else 0.0

    return ActividadJcfResponse(
        n_beneficiarios_muestra=n_mu,
        n_beneficiarios_expandido=ex["n_expandido"],
        sum_ingreso_trim=sum_ing,
        mean_ingreso_trim_por_beneficiario=round(mean_ing, 2),
        por_entidad=[
            JcfEntidadRow(
                clave=r["clave"], nombre=r["nombre"],
                beneficiarios_muestra=r["benef_muestra"],
                beneficiarios_expandido=r["benef_expandido"],
            ) for r in ent
        ],
        note="Programa federal (2019+) que transfiere apoyo económico a jóvenes "
             "18-29 en capacitación laboral. n=327 en la muestra nacional ENIGH "
             "2024 NS implica cobertura relativamente baja; las cifras expandidas "
             "por entidad deben leerse con cautela estadística.",
    )
