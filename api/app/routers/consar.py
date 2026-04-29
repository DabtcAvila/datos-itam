"""Public REST endpoints for CONSAR AFORE monthly resources registry.

Dataset: monto_recursos_registrados_afore (datos.gob.mx — CC-BY-4.0)
  Cobertura: 1998-05-01 → 2025-06-01 (326 meses × 11 AFOREs)
  35,617 filas (consar.recursos_mensuales)
  MD5 CSV fuente: 19083c9a46d9d958b1428056c2f5f0b1

Principios heredados S7/S8:
  - Todos los endpoints públicos (sin require_admin)
  - Rate limiting vía slowapi
  - Caveats metodológicos en cada response donde aplique
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import text

from app.database import engine
from app.rate_limit import limiter
from app.schemas.consar import (
    AforeRow,
    AforesResponse,
    AforeSnapshotRow,
    ComisionAforeRef,
    ComisionPunto,
    ComisionSerieResponse,
    ComisionSnapshotResponse,
    ComisionSnapshotRow,
    ComponenteSnapshotRow,
    ComposicionItem,
    ComposicionResponse,
    ImssVsIsssteePunto,
    ImssVsIsssteeResponse,
    PorAforeResponse,
    PorComponenteResponse,
    SerieAforeRef,
    SeriePunto,
    SerieRango,
    SerieResponse,
    SerieTipoRecursoRef,
    TiposRecursoResponse,
    TipoRecursoRow,
    TotalesSarResponse,
    TotalSarPunto,
)

router = APIRouter(prefix="/api/v1/consar", tags=["consar"])


# ---------------------------------------------------------------------
# Caveats (verificados empíricamente contra el CSV oficial)
# ---------------------------------------------------------------------

CAVEAT_UNIDAD = (
    "Montos en millones de pesos MXN CORRIENTES (no deflactados). "
    "Para comparaciones históricas reales, deflactar con INPC BASE 2018=100 INEGI."
)

CAVEAT_PENSION_BIENESTAR = (
    "Pensión Bienestar (FPB9) tiene serie corta: inicio 2024-07-01, "
    "régimen administrativo diferenciado (reporta solo 2 de 15 conceptos)."
)

CAVEAT_FONDOS_PREV = (
    "fondos_prevision_social es EXCLUSIVO de XXI-Banorte (reportado desde 2009-02). "
    "Para otras AFOREs este componente es 0 por construcción."
)

CAVEAT_BONO_ISSSTE = (
    "bono_pension_issste arranca 2008-12 con la reforma ISSSTE 2007; "
    "reconoce aportaciones realizadas bajo el régimen previo."
)

CAVEAT_BANXICO = (
    "recursos_depositados_banxico captura cuentas asignadas sin AFORE elegida. "
    "Se reporta a nivel sistema desde 2012-01; cobertura parcial antes."
)

CAVEAT_IDENTIDAD_SAR = (
    "Identidad contable sar_total = rcv_imss + rcv_issste + bono_pension_issste "
    "+ vivienda + ahorro_voluntario_y_solidario + capital_afores + banxico "
    "+ fondos_prevision_social. Verificada empíricamente: cierre al peso "
    "(Δ ≤ 0.05 mm MXN) en 98.83% de filas; cierre al peso en 100% de filas 2020+. "
    "Residuo de 24 filas concentrado 100% en XXI-Banorte 2010-2012 "
    "(probable artefacto transitorio post-introducción de fondos_prevision_social)."
)

SOURCE_CONSAR = (
    "CONSAR vía datos.gob.mx (CC-BY-4.0) — "
    "https://repodatos.atdt.gob.mx/api_update/consar/monto_recursos_registrados_afore/09_recursos.csv"
)


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------


def _parse_fecha(fecha_str: str) -> date:
    """Acepta 'YYYY-MM' o 'YYYY-MM-01'. Retorna date(YYYY,MM,1).
    HTTP 422 si no es un mes válido."""
    try:
        if len(fecha_str) == 7:  # YYYY-MM
            fecha_str = fecha_str + "-01"
        d = date.fromisoformat(fecha_str)
        if d.day != 1:
            raise ValueError("fecha debe ser día 1 del mes (YYYY-MM o YYYY-MM-01)")
        return d
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"fecha inválida: {e}")


# ---------------------------------------------------------------------
# 1. GET /consar/afores — catálogo
# ---------------------------------------------------------------------

SQL_AFORES = """
SELECT id, codigo, nombre_corto, nombre_csv, tipo_pension,
       fecha_alta_serie, activa, orden_display
FROM consar.afores
ORDER BY orden_display
"""


@router.get(
    "/afores",
    response_model=AforesResponse,
    summary="Catálogo de las 11 AFOREs",
    description=(
        "Lista todas las AFOREs del sistema mexicano de ahorro para el retiro, "
        "ordenadas por tamaño (recursos registrados en SAR a 2025-06-01). "
        "Incluye fecha_alta_serie (primer mes con datos no-nulos en el CSV oficial)."
    ),
)
@limiter.limit("60/minute")
async def get_afores(request: Request) -> AforesResponse:
    async with engine.connect() as conn:
        rows = (await conn.execute(text(SQL_AFORES))).mappings().all()
    return AforesResponse(
        count=len(rows),
        afores=[AforeRow(**dict(r)) for r in rows],
        source=SOURCE_CONSAR,
    )


# ---------------------------------------------------------------------
# 2. GET /consar/tipos-recurso — catálogo
# ---------------------------------------------------------------------

SQL_TIPOS_RECURSO = """
SELECT id, codigo, columna_csv, nombre_corto, nombre_oficial,
       descripcion, categoria, es_total_sar, orden_display
FROM consar.tipos_recurso
ORDER BY orden_display
"""


@router.get(
    "/tipos-recurso",
    response_model=TiposRecursoResponse,
    summary="Catálogo de los 15 conceptos de recurso",
    description=(
        "Lista los 15 tipos de recurso reportados mensualmente por CONSAR. "
        "Categoría: component (atómico), aggregate (suma de components), "
        "total (agregado AFORE/sistema), operativo (capital propio de la AFORE)."
    ),
)
@limiter.limit("60/minute")
async def get_tipos_recurso(request: Request) -> TiposRecursoResponse:
    async with engine.connect() as conn:
        rows = (await conn.execute(text(SQL_TIPOS_RECURSO))).mappings().all()
    return TiposRecursoResponse(
        count=len(rows),
        tipos_recurso=[TipoRecursoRow(**dict(r)) for r in rows],
    )


# ---------------------------------------------------------------------
# 3. GET /consar/recursos/totales — serie temporal SAR nacional
# ---------------------------------------------------------------------

SQL_TOTALES = """
SELECT
    rm.fecha,
    SUM(rm.monto_mxn_mm)::float AS monto_mxn_mm,
    COUNT(DISTINCT rm.afore_id)::int AS n_afores
FROM consar.recursos_mensuales rm
JOIN consar.tipos_recurso tr ON tr.id = rm.tipo_recurso_id
WHERE tr.codigo = 'sar_total'
GROUP BY rm.fecha
ORDER BY rm.fecha
"""


@router.get(
    "/recursos/totales",
    response_model=TotalesSarResponse,
    summary="Serie temporal: recursos totales registrados en el SAR (nacional)",
    description=(
        "Retorna los 326 puntos mensuales de la serie de recursos totales "
        "registrados en el SAR a nivel sistema (suma sobre todas las AFOREs). "
        "Cobertura 1998-05-01 a 2025-06-01."
    ),
)
@limiter.limit("30/minute")
async def get_totales(request: Request) -> TotalesSarResponse:
    async with engine.connect() as conn:
        rows = (await conn.execute(text(SQL_TOTALES))).mappings().all()
    if not rows:
        raise HTTPException(status_code=500, detail="no hay datos en consar.recursos_mensuales")
    return TotalesSarResponse(
        unit="millones de pesos MXN corrientes",
        n_puntos=len(rows),
        fecha_min=rows[0]["fecha"],
        fecha_max=rows[-1]["fecha"],
        serie=[TotalSarPunto(**dict(r)) for r in rows],
        caveats=[CAVEAT_UNIDAD, CAVEAT_PENSION_BIENESTAR],
        source=SOURCE_CONSAR,
    )


# ---------------------------------------------------------------------
# 4. GET /consar/recursos/por-afore?fecha=YYYY-MM
# ---------------------------------------------------------------------

SQL_POR_AFORE = """
WITH snapshot AS (
    SELECT
        a.codigo AS afore_codigo,
        a.nombre_corto AS afore_nombre_corto,
        a.orden_display,
        MAX(CASE WHEN tr.codigo = 'sar_total'              THEN rm.monto_mxn_mm END)::float AS sar_total_mm,
        MAX(CASE WHEN tr.codigo = 'recursos_trabajadores'  THEN rm.monto_mxn_mm END)::float AS recursos_trabajadores_mm,
        MAX(CASE WHEN tr.codigo = 'recursos_administrados' THEN rm.monto_mxn_mm END)::float AS recursos_administrados_mm
    FROM consar.afores a
    LEFT JOIN consar.recursos_mensuales rm ON rm.afore_id = a.id AND rm.fecha = :fecha
    LEFT JOIN consar.tipos_recurso tr      ON tr.id = rm.tipo_recurso_id
    GROUP BY a.codigo, a.nombre_corto, a.orden_display
)
SELECT * FROM snapshot ORDER BY orden_display
"""


@router.get(
    "/recursos/por-afore",
    response_model=PorAforeResponse,
    summary="Snapshot mensual: recursos por AFORE en una fecha específica",
    description=(
        "Retorna para la fecha indicada (YYYY-MM o YYYY-MM-01) los recursos "
        "totales SAR, recursos de los trabajadores y recursos administrados por "
        "cada una de las 11 AFOREs. Incluye % del sistema."
    ),
)
@limiter.limit("30/minute")
async def get_por_afore(
    request: Request,
    fecha: str = Query(..., description="YYYY-MM o YYYY-MM-01 (ej. 2025-06 o 2025-06-01)"),
) -> PorAforeResponse:
    d = _parse_fecha(fecha)
    async with engine.connect() as conn:
        rows = (await conn.execute(text(SQL_POR_AFORE), {"fecha": d})).mappings().all()
    total_sistema = sum((r["sar_total_mm"] or 0.0) for r in rows)
    if total_sistema == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No hay datos para fecha={d.isoformat()} (cobertura: 1998-05 a 2025-06)",
        )
    snaps = []
    n_reportando = 0
    for r in rows:
        sar = r["sar_total_mm"]
        pct = (100.0 * sar / total_sistema) if (sar and total_sistema) else None
        if sar is not None and sar > 0:
            n_reportando += 1
        snaps.append(AforeSnapshotRow(
            afore_codigo=r["afore_codigo"],
            afore_nombre_corto=r["afore_nombre_corto"],
            sar_total_mm=sar,
            recursos_trabajadores_mm=r["recursos_trabajadores_mm"],
            recursos_administrados_mm=r["recursos_administrados_mm"],
            pct_sistema=round(pct, 3) if pct is not None else None,
        ))
    return PorAforeResponse(
        fecha=d,
        unit="millones de pesos MXN corrientes",
        total_sistema_mm=round(total_sistema, 2),
        n_afores_reportando=n_reportando,
        afores=snaps,
        caveats=[CAVEAT_UNIDAD, CAVEAT_PENSION_BIENESTAR],
    )


# ---------------------------------------------------------------------
# 5. GET /consar/recursos/por-componente?fecha=YYYY-MM
# ---------------------------------------------------------------------

SQL_POR_COMPONENTE = """
SELECT
    tr.codigo AS tipo_codigo,
    tr.nombre_corto AS tipo_nombre_corto,
    tr.categoria,
    tr.orden_display,
    SUM(rm.monto_mxn_mm)::float AS monto_mxn_mm
FROM consar.tipos_recurso tr
LEFT JOIN consar.recursos_mensuales rm ON rm.tipo_recurso_id = tr.id AND rm.fecha = :fecha
GROUP BY tr.codigo, tr.nombre_corto, tr.categoria, tr.orden_display
ORDER BY tr.orden_display
"""


@router.get(
    "/recursos/por-componente",
    response_model=PorComponenteResponse,
    summary="Snapshot mensual: desglose por tipo de recurso (nacional)",
    description=(
        "Retorna para la fecha indicada (YYYY-MM) el monto agregado a nivel "
        "sistema para cada uno de los 15 tipos de recurso. Incluye % respecto "
        "al sar_total donde sea informativo (components y aggregates)."
    ),
)
@limiter.limit("30/minute")
async def get_por_componente(
    request: Request,
    fecha: str = Query(..., description="YYYY-MM o YYYY-MM-01"),
) -> PorComponenteResponse:
    d = _parse_fecha(fecha)
    async with engine.connect() as conn:
        rows = (await conn.execute(text(SQL_POR_COMPONENTE), {"fecha": d})).mappings().all()
    sar_total_row = next((r for r in rows if r["tipo_codigo"] == "sar_total"), None)
    sar_total = (sar_total_row["monto_mxn_mm"] if sar_total_row else None) or 0.0
    if sar_total == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No hay datos para fecha={d.isoformat()} (cobertura: 1998-05 a 2025-06)",
        )
    comps = []
    n_con_dato = 0
    for r in rows:
        monto = r["monto_mxn_mm"]
        if monto is None:
            continue
        n_con_dato += 1
        pct = None
        if r["categoria"] in ("component", "aggregate") and sar_total > 0:
            pct = round(100.0 * monto / sar_total, 3)
        comps.append(ComponenteSnapshotRow(
            tipo_codigo=r["tipo_codigo"],
            tipo_nombre_corto=r["tipo_nombre_corto"],
            categoria=r["categoria"],
            monto_mxn_mm=round(monto, 2),
            pct_del_sar_total=pct,
        ))
    return PorComponenteResponse(
        fecha=d,
        unit="millones de pesos MXN corrientes",
        sar_total_mm=round(sar_total, 2),
        n_componentes=n_con_dato,
        componentes=comps,
        caveats=[CAVEAT_UNIDAD, CAVEAT_FONDOS_PREV, CAVEAT_BANXICO, CAVEAT_BONO_ISSSTE],
    )


# ---------------------------------------------------------------------
# 6. GET /consar/recursos/imss-vs-issste — serie temporal
# ---------------------------------------------------------------------

SQL_IMSS_VS_ISSSTE = """
SELECT
    rm.fecha,
    SUM(CASE WHEN tr.codigo = 'rcv_imss'   THEN rm.monto_mxn_mm ELSE 0 END)::float AS rcv_imss_mm,
    SUM(CASE WHEN tr.codigo = 'rcv_issste' THEN rm.monto_mxn_mm ELSE 0 END)::float AS rcv_issste_mm
FROM consar.recursos_mensuales rm
JOIN consar.tipos_recurso tr ON tr.id = rm.tipo_recurso_id
WHERE tr.codigo IN ('rcv_imss', 'rcv_issste')
GROUP BY rm.fecha
ORDER BY rm.fecha
"""


@router.get(
    "/recursos/imss-vs-issste",
    response_model=ImssVsIsssteeResponse,
    summary="Serie temporal: RCV-IMSS vs RCV-ISSSTE (privado vs público)",
    description=(
        "Retorna la serie mensual agregada a nivel sistema de RCV-IMSS "
        "(trabajadores del sector privado afiliados al IMSS) y RCV-ISSSTE "
        "(trabajadores del sector público). RCV-ISSSTE reportado desde ~2008 "
        "con la reforma ISSSTE."
    ),
)
@limiter.limit("30/minute")
async def get_imss_vs_issste(request: Request) -> ImssVsIsssteeResponse:
    async with engine.connect() as conn:
        rows = (await conn.execute(text(SQL_IMSS_VS_ISSSTE))).mappings().all()
    serie = []
    for r in rows:
        imss = r["rcv_imss_mm"] or None
        issste = r["rcv_issste_mm"] or None
        ratio = None
        if imss and issste and imss > 0:
            ratio = round(issste / imss, 4)
        serie.append(ImssVsIsssteePunto(
            fecha=r["fecha"],
            rcv_imss_mm=round(imss, 2) if imss else None,
            rcv_issste_mm=round(issste, 2) if issste else None,
            ratio_issste_sobre_imss=ratio,
        ))
    return ImssVsIsssteeResponse(
        unit="millones de pesos MXN corrientes",
        n_puntos=len(serie),
        serie=serie,
        caveats=[
            CAVEAT_UNIDAD,
            "RCV-ISSSTE reportado de forma consistente desde 2008-12 con la reforma ISSSTE; "
            "puntos anteriores pueden mostrar cero.",
            "RCV-IMSS cubre trabajadores privados afiliados al IMSS; RCV-ISSSTE cubre "
            "trabajadores públicos. PensionISSSTE es la AFORE pública pero todas las "
            "AFOREs manejan ambos tipos de cuenta.",
        ],
    )


# ---------------------------------------------------------------------
# 7. GET /consar/recursos/composicion?fecha=YYYY-MM — identidad SAR
# ---------------------------------------------------------------------

# Los 8 componentes oficiales de la identidad sar_total (verificada 98.83% al peso,
# 100% en 2020+). Orden narrativo (RCV + vivienda + ahorro + ops).
COMPONENTES_IDENTIDAD = (
    "rcv_imss",
    "rcv_issste",
    "bono_pension_issste",
    "vivienda",
    "ahorro_voluntario_y_solidario",
    "capital_afores",
    "banxico",
    "fondos_prevision_social",
)

SQL_COMPOSICION = """
SELECT
    tr.codigo AS tipo_codigo,
    tr.nombre_corto AS tipo_nombre_corto,
    tr.orden_display,
    SUM(rm.monto_mxn_mm)::float AS monto_mxn_mm
FROM consar.tipos_recurso tr
LEFT JOIN consar.recursos_mensuales rm ON rm.tipo_recurso_id = tr.id AND rm.fecha = :fecha
WHERE tr.codigo = ANY(:codigos)
GROUP BY tr.codigo, tr.nombre_corto, tr.orden_display
ORDER BY tr.orden_display
"""


SQL_SAR_TOTAL_AT = """
SELECT SUM(rm.monto_mxn_mm)::float AS sar_total
FROM consar.recursos_mensuales rm
JOIN consar.tipos_recurso tr ON tr.id = rm.tipo_recurso_id
WHERE tr.codigo = 'sar_total' AND rm.fecha = :fecha
"""


@router.get(
    "/recursos/composicion",
    response_model=ComposicionResponse,
    summary="Desglose contable del SAR: 8 componentes vs total reportado",
    description=(
        "Para la fecha indicada, retorna los 8 componentes de la identidad "
        "sar_total (verificada empíricamente al peso en 98.83% de filas y "
        "100% de filas 2020+). Incluye delta vs total reportado para "
        "transparencia sobre el residuo histórico."
    ),
)
@limiter.limit("30/minute")
async def get_composicion(
    request: Request,
    fecha: str = Query(..., description="YYYY-MM o YYYY-MM-01"),
) -> ComposicionResponse:
    d = _parse_fecha(fecha)
    async with engine.connect() as conn:
        rows = (await conn.execute(
            text(SQL_COMPOSICION),
            {"fecha": d, "codigos": list(COMPONENTES_IDENTIDAD)},
        )).mappings().all()
        sar_row = (await conn.execute(text(SQL_SAR_TOTAL_AT), {"fecha": d})).mappings().one()

    sar_total = sar_row["sar_total"]
    if sar_total is None or sar_total == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No hay datos para fecha={d.isoformat()} (cobertura: 1998-05 a 2025-06)",
        )

    items: list[ComposicionItem] = []
    suma = 0.0
    for r in rows:
        monto = r["monto_mxn_mm"] or 0.0
        suma += monto
        items.append(ComposicionItem(
            tipo_codigo=r["tipo_codigo"],
            tipo_nombre_corto=r["tipo_nombre_corto"],
            monto_mxn_mm=round(monto, 2),
            pct_del_sar=round(100.0 * monto / sar_total, 3) if sar_total > 0 else 0.0,
        ))

    delta_abs = sar_total - suma
    delta_pct = (100.0 * delta_abs / sar_total) if sar_total > 0 else 0.0
    cierre_al_peso = abs(delta_abs) <= 0.05

    return ComposicionResponse(
        fecha=d,
        unit="millones de pesos MXN corrientes",
        sar_total_reportado_mm=round(sar_total, 2),
        suma_8_componentes_mm=round(suma, 2),
        delta_abs_mm=round(delta_abs, 2),
        delta_pct=round(delta_pct, 4),
        cierre_al_peso=cierre_al_peso,
        componentes=items,
        caveats=[CAVEAT_UNIDAD, CAVEAT_FONDOS_PREV, CAVEAT_BANXICO, CAVEAT_BONO_ISSSTE],
        identidad_caveat=CAVEAT_IDENTIDAD_SAR,
    )


# ---------------------------------------------------------------------
# 8. GET /consar/recursos/serie — serie temporal por tipo ± AFORE
# ---------------------------------------------------------------------

SQL_TIPO_META = """
SELECT codigo, nombre_corto, nombre_oficial, categoria
FROM consar.tipos_recurso
WHERE codigo = :codigo
"""

SQL_AFORE_META = """
SELECT codigo, nombre_corto, tipo_pension
FROM consar.afores
WHERE codigo = :codigo
"""

SQL_SERIE = """
SELECT rm.fecha,
       SUM(rm.monto_mxn_mm)::float AS monto_mxn_mm
FROM consar.recursos_mensuales rm
JOIN consar.tipos_recurso tr ON tr.id = rm.tipo_recurso_id
JOIN consar.afores a         ON a.id = rm.afore_id
WHERE tr.codigo = :codigo
  AND (CAST(:afore_codigo AS text) IS NULL OR a.codigo = :afore_codigo)
  AND rm.fecha >= :desde
  AND rm.fecha <= :hasta
GROUP BY rm.fecha
ORDER BY rm.fecha
"""


@router.get(
    "/recursos/serie",
    response_model=SerieResponse,
    summary="Serie temporal por tipo de recurso (opcionalmente filtrada por AFORE)",
    description=(
        "Retorna la serie mensual agregada del tipo de recurso indicado. Si "
        "`afore_codigo` se omite, suma todas las AFOREs (nacional). "
        "Parámetros `desde`/`hasta` aceptan YYYY-MM o YYYY-MM-01; "
        "default a la cobertura completa 1998-05 / 2025-06."
    ),
)
@limiter.limit("30/minute")
async def get_serie(
    request: Request,
    codigo: str = Query(..., description="Código del tipo_recurso (p. ej. 'vivienda', 'rcv_imss', 'sar_total')"),
    afore_codigo: Optional[str] = Query(None, description="Código AFORE opcional (p. ej. 'pension_bienestar'); si se omite, suma nacional"),
    desde: Optional[str] = Query(None, description="YYYY-MM o YYYY-MM-01 (default 1998-05)"),
    hasta: Optional[str] = Query(None, description="YYYY-MM o YYYY-MM-01 (default 2025-06)"),
) -> SerieResponse:
    d_desde = _parse_fecha(desde) if desde else date(1998, 5, 1)
    d_hasta = _parse_fecha(hasta) if hasta else date(2025, 6, 1)
    if d_desde > d_hasta:
        raise HTTPException(status_code=422, detail="'desde' debe ser <= 'hasta'")

    async with engine.connect() as conn:
        tipo_row = (await conn.execute(text(SQL_TIPO_META), {"codigo": codigo})).mappings().one_or_none()
        if tipo_row is None:
            raise HTTPException(status_code=404, detail=f"tipo_recurso '{codigo}' no existe")

        afore_row = None
        if afore_codigo is not None:
            afore_row = (await conn.execute(text(SQL_AFORE_META), {"codigo": afore_codigo})).mappings().one_or_none()
            if afore_row is None:
                raise HTTPException(status_code=404, detail=f"afore '{afore_codigo}' no existe")

        serie_rows = (await conn.execute(
            text(SQL_SERIE),
            {
                "codigo": codigo,
                "afore_codigo": afore_codigo,
                "desde": d_desde,
                "hasta": d_hasta,
            },
        )).mappings().all()

    # Caveats dinámicos: unidad siempre + los específicos del tipo/afore
    caveats = [CAVEAT_UNIDAD]
    if afore_codigo == "pension_bienestar":
        caveats.append(CAVEAT_PENSION_BIENESTAR)
    if codigo == "fondos_prevision_social":
        caveats.append(CAVEAT_FONDOS_PREV)
    if codigo == "banxico":
        caveats.append(CAVEAT_BANXICO)
    if codigo == "bono_pension_issste":
        caveats.append(CAVEAT_BONO_ISSSTE)
    if codigo == "rcv_issste":
        caveats.append("RCV-ISSSTE reportado de forma consistente desde 2008-12 con la reforma ISSSTE.")

    return SerieResponse(
        tipo_recurso=SerieTipoRecursoRef(**dict(tipo_row)),
        afore=SerieAforeRef(**dict(afore_row)) if afore_row else None,
        unit="millones de pesos MXN corrientes",
        n_puntos=len(serie_rows),
        rango=SerieRango(desde=d_desde, hasta=d_hasta),
        serie=[SeriePunto(fecha=r["fecha"], monto_mxn_mm=round(r["monto_mxn_mm"], 2)) for r in serie_rows],
        caveats=caveats,
    )


# ---------------------------------------------------------------------
# 9. GET /consar/comisiones/serie — serie temporal por AFORE (S16, dataset #06)
# ---------------------------------------------------------------------

CAVEAT_COMISION_BIENESTAR = (
    "Pensión Bienestar (FPB9) NO reporta comisión: régimen administrativo diferenciado "
    "(serie comienza 2024-07-01 con esquema sin comisión sobre saldo)."
)

CAVEAT_COMISION_REFORMA = (
    "Cobertura empieza 2008-03-01 con la reforma de transparencia CONSAR. Tendencia secular "
    "descendente: cap regulatorio fue bajando ~1.96% (2008) → ~0.55% (2025)."
)

SOURCE_COMISIONES = (
    "CONSAR vía datos.gob.mx (CC-BY-4.0) — datasets/06_comisiones — "
    "actualizado a 2025-06-01."
)

SQL_COMISION_AFORE_META = """
SELECT codigo, nombre_corto, tipo_pension
FROM consar.afores
WHERE codigo = :codigo
"""

SQL_COMISION_SERIE = """
SELECT c.fecha,
       c.comision::float AS comision_pct
FROM consar.comisiones c
JOIN consar.afores a ON a.id = c.afore_id
WHERE (CAST(:afore_codigo AS text) IS NULL OR a.codigo = :afore_codigo)
  AND c.fecha >= :desde
  AND c.fecha <= :hasta
ORDER BY c.fecha, a.orden_display
"""


@router.get(
    "/comisiones/serie",
    response_model=ComisionSerieResponse,
    summary="Serie temporal: comisión cobrada por AFORE (% anual sobre saldo)",
    description=(
        "Retorna la serie mensual de comisiones cobradas por una AFORE específica "
        "(o todas si se omite `afore_codigo`). Comisión expresada como porcentaje "
        "anual sobre saldo administrado (e.g. 1.96 = 1.96%). "
        "Cobertura 2008-03-01 → 2025-06-01."
    ),
)
@limiter.limit("30/minute")
async def get_comisiones_serie(
    request: Request,
    afore_codigo: Optional[str] = Query(None, description="Código AFORE opcional (e.g. 'profuturo')"),
    desde: Optional[str] = Query(None, description="YYYY-MM o YYYY-MM-01 (default 2008-03)"),
    hasta: Optional[str] = Query(None, description="YYYY-MM o YYYY-MM-01 (default 2025-06)"),
) -> ComisionSerieResponse:
    d_desde = _parse_fecha(desde) if desde else date(2008, 3, 1)
    d_hasta = _parse_fecha(hasta) if hasta else date(2025, 6, 1)
    if d_desde > d_hasta:
        raise HTTPException(status_code=422, detail="'desde' debe ser <= 'hasta'")

    async with engine.connect() as conn:
        afore_row = None
        if afore_codigo is not None:
            afore_row = (await conn.execute(text(SQL_COMISION_AFORE_META), {"codigo": afore_codigo})).mappings().one_or_none()
            if afore_row is None:
                raise HTTPException(status_code=404, detail=f"afore '{afore_codigo}' no existe")

        serie_rows = (await conn.execute(
            text(SQL_COMISION_SERIE),
            {"afore_codigo": afore_codigo, "desde": d_desde, "hasta": d_hasta},
        )).mappings().all()

    caveats = [CAVEAT_COMISION_REFORMA, CAVEAT_COMISION_BIENESTAR]

    return ComisionSerieResponse(
        afore=ComisionAforeRef(**dict(afore_row)) if afore_row else None,
        unit="porcentaje anual sobre saldo administrado",
        n_puntos=len(serie_rows),
        rango=SerieRango(desde=d_desde, hasta=d_hasta),
        serie=[ComisionPunto(fecha=r["fecha"], comision_pct=round(r["comision_pct"], 4)) for r in serie_rows],
        caveats=caveats,
    )


# ---------------------------------------------------------------------
# 10. GET /consar/comisiones/snapshot?fecha=YYYY-MM (S16, dataset #06)
# ---------------------------------------------------------------------

SQL_COMISION_SNAPSHOT = """
SELECT a.codigo AS afore_codigo,
       a.nombre_corto AS afore_nombre_corto,
       a.tipo_pension,
       a.orden_display,
       c.comision::float AS comision_pct
FROM consar.afores a
LEFT JOIN consar.comisiones c
       ON c.afore_id = a.id AND c.fecha = :fecha
WHERE a.codigo <> 'pension_bienestar'  -- no reporta comisión por construcción
ORDER BY a.orden_display
"""


@router.get(
    "/comisiones/snapshot",
    response_model=ComisionSnapshotResponse,
    summary="Snapshot mensual: comisión cobrada por cada AFORE en una fecha específica",
    description=(
        "Retorna para la fecha indicada (YYYY-MM o YYYY-MM-01) la comisión cobrada por "
        "cada una de las 10 AFOREs reportantes. Incluye promedio simple, mínima y máxima del "
        "sistema. Pensión Bienestar excluida (régimen sin comisión sobre saldo)."
    ),
)
@limiter.limit("30/minute")
async def get_comisiones_snapshot(
    request: Request,
    fecha: str = Query(..., description="YYYY-MM o YYYY-MM-01 (cobertura 2008-03 a 2025-06)"),
) -> ComisionSnapshotResponse:
    d = _parse_fecha(fecha)
    async with engine.connect() as conn:
        rows = (await conn.execute(text(SQL_COMISION_SNAPSHOT), {"fecha": d})).mappings().all()

    reporting = [r for r in rows if r["comision_pct"] is not None]
    if not reporting:
        raise HTTPException(
            status_code=404,
            detail=f"No hay datos para fecha={d.isoformat()} (cobertura: 2008-03 a 2025-06)",
        )

    valores = [r["comision_pct"] for r in reporting]
    promedio = sum(valores) / len(valores)

    return ComisionSnapshotResponse(
        fecha=d,
        unit="porcentaje anual sobre saldo administrado",
        n_afores_reportando=len(reporting),
        promedio_simple_pct=round(promedio, 4),
        minima_pct=round(min(valores), 4),
        maxima_pct=round(max(valores), 4),
        afores=[
            ComisionSnapshotRow(
                afore_codigo=r["afore_codigo"],
                afore_nombre_corto=r["afore_nombre_corto"],
                tipo_pension=r["tipo_pension"],
                comision_pct=round(r["comision_pct"], 4) if r["comision_pct"] is not None else None,
            )
            for r in rows
        ],
        caveats=[CAVEAT_COMISION_REFORMA, CAVEAT_COMISION_BIENESTAR],
    )
