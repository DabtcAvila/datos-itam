"""Pydantic response models for CONSAR AFORE resources endpoints.

Unidad de monto: pesos mexicanos CORRIENTES expresados en millones (mm MXN).
"""
from datetime import date
from typing import Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------
# Catálogos
# ---------------------------------------------------------------------


class AforeRow(BaseModel):
    id: int
    codigo: str
    nombre_corto: str
    nombre_csv: str
    tipo_pension: str  # privada|publica|bienestar
    fecha_alta_serie: date
    activa: bool
    orden_display: int


class AforesResponse(BaseModel):
    count: int
    afores: list[AforeRow]
    source: str


class TipoRecursoRow(BaseModel):
    id: int
    codigo: str
    columna_csv: str
    nombre_corto: str
    nombre_oficial: str
    descripcion: Optional[str]
    categoria: str  # component|aggregate|total|operativo
    es_total_sar: bool
    orden_display: int


class TiposRecursoResponse(BaseModel):
    count: int
    tipos_recurso: list[TipoRecursoRow]


# ---------------------------------------------------------------------
# Series temporales y snapshots
# ---------------------------------------------------------------------


class TotalSarPunto(BaseModel):
    fecha: date
    monto_mxn_mm: float
    n_afores: int  # cuántas AFOREs reportaron ese mes


class TotalesSarResponse(BaseModel):
    unit: str
    n_puntos: int
    fecha_min: date
    fecha_max: date
    serie: list[TotalSarPunto]
    caveats: list[str]
    source: str


class AforeSnapshotRow(BaseModel):
    afore_codigo: str
    afore_nombre_corto: str
    sar_total_mm: Optional[float]
    recursos_trabajadores_mm: Optional[float]
    recursos_administrados_mm: Optional[float]
    pct_sistema: Optional[float]  # % del SAR nacional ese mes


class PorAforeResponse(BaseModel):
    fecha: date
    unit: str
    total_sistema_mm: float
    n_afores_reportando: int
    afores: list[AforeSnapshotRow]
    caveats: list[str]


class ComponenteSnapshotRow(BaseModel):
    tipo_codigo: str
    tipo_nombre_corto: str
    categoria: str
    monto_mxn_mm: float
    pct_del_sar_total: Optional[float]


class PorComponenteResponse(BaseModel):
    fecha: date
    unit: str
    sar_total_mm: float
    n_componentes: int
    componentes: list[ComponenteSnapshotRow]
    caveats: list[str]


class ImssVsIsssteePunto(BaseModel):
    fecha: date
    rcv_imss_mm: Optional[float]
    rcv_issste_mm: Optional[float]
    ratio_issste_sobre_imss: Optional[float]


class ImssVsIsssteeResponse(BaseModel):
    unit: str
    n_puntos: int
    serie: list[ImssVsIsssteePunto]
    caveats: list[str]


class ComposicionItem(BaseModel):
    tipo_codigo: str
    tipo_nombre_corto: str
    monto_mxn_mm: float
    pct_del_sar: float


class ComposicionResponse(BaseModel):
    fecha: date
    unit: str
    sar_total_reportado_mm: float
    suma_8_componentes_mm: float
    delta_abs_mm: float
    delta_pct: float
    cierre_al_peso: bool
    componentes: list[ComposicionItem]
    caveats: list[str]
    identidad_caveat: str


# ---------------------------------------------------------------------
# Serie genérica por tipo_recurso (+ filtro opcional por AFORE)
# ---------------------------------------------------------------------


class SerieTipoRecursoRef(BaseModel):
    codigo: str
    nombre_corto: str
    nombre_oficial: str
    categoria: str


class SerieAforeRef(BaseModel):
    codigo: str
    nombre_corto: str
    tipo_pension: str


class SeriePunto(BaseModel):
    fecha: date
    monto_mxn_mm: float


class SerieRango(BaseModel):
    desde: date
    hasta: date


class SerieResponse(BaseModel):
    tipo_recurso: SerieTipoRecursoRef
    afore: Optional[SerieAforeRef]  # None → suma nacional sobre todas las AFOREs
    unit: str
    n_puntos: int
    rango: SerieRango
    serie: list[SeriePunto]
    caveats: list[str]


# ---------------------------------------------------------------------
# 9. /comisiones/serie + /comisiones/snapshot   (S16 — dataset #06)
# ---------------------------------------------------------------------


class ComisionPunto(BaseModel):
    fecha: date
    comision_pct: float  # porcentaje anual (e.g. 1.96 = 1.96%)


class ComisionAforeRef(BaseModel):
    codigo: str
    nombre_corto: str
    tipo_pension: str


class ComisionSerieResponse(BaseModel):
    afore: Optional[ComisionAforeRef]  # None → comparativo de todas las afores
    unit: str
    n_puntos: int
    rango: SerieRango
    serie: list[ComisionPunto]
    caveats: list[str]


class ComisionSnapshotRow(BaseModel):
    afore_codigo: str
    afore_nombre_corto: str
    tipo_pension: str
    comision_pct: Optional[float]  # None si la AFORE aún no había arrancado en esa fecha


class ComisionSnapshotResponse(BaseModel):
    fecha: date
    unit: str
    n_afores_reportando: int
    promedio_simple_pct: float
    minima_pct: float
    maxima_pct: float
    afores: list[ComisionSnapshotRow]
    caveats: list[str]


# ---------------------------------------------------------------------
# 11. /flujos/serie + /flujos/snapshot   (S16 — dataset #04)
# ---------------------------------------------------------------------


class FlujoPunto(BaseModel):
    fecha: date
    montos_entradas: float
    montos_salidas: float
    flujo_neto: float


class FlujoAforeRef(BaseModel):
    codigo: str
    nombre_corto: str
    tipo_pension: str


class FlujoSerieResponse(BaseModel):
    afore: Optional[FlujoAforeRef]  # None → suma nacional
    unit: str
    n_puntos: int
    rango: SerieRango
    serie: list[FlujoPunto]
    caveats: list[str]


class FlujoSnapshotRow(BaseModel):
    afore_codigo: str
    afore_nombre_corto: str
    tipo_pension: str
    montos_entradas: float
    montos_salidas: float
    flujo_neto: float


class FlujoSnapshotResponse(BaseModel):
    fecha: date
    unit: str
    n_afores_reportando: int
    sistema_entradas_mm: float
    sistema_salidas_mm: float
    sistema_flujo_neto_mm: float
    afores: list[FlujoSnapshotRow]
    caveats: list[str]


# ---------------------------------------------------------------------
# 13. /traspasos/serie + /traspasos/snapshot   (S16 — dataset #08)
# ---------------------------------------------------------------------


class TraspasoPunto(BaseModel):
    fecha: date
    num_tras_cedido: Optional[int]
    num_tras_recibido: Optional[int]
    traspaso_neto: Optional[int]  # recibido - cedido (None si ambas son None)


class TraspasoAforeRef(BaseModel):
    codigo: str
    nombre_corto: str
    tipo_pension: str


class TraspasoSerieResponse(BaseModel):
    afore: Optional[TraspasoAforeRef]  # None → suma sistema
    n_puntos: int
    rango: SerieRango
    serie: list[TraspasoPunto]
    caveats: list[str]


class TraspasoSnapshotRow(BaseModel):
    afore_codigo: str
    afore_nombre_corto: str
    tipo_pension: str
    num_tras_cedido: Optional[int]
    num_tras_recibido: Optional[int]
    traspaso_neto: Optional[int]


class TraspasoIdentidad(BaseModel):
    sistema_total_cedido: int
    sistema_total_recibido: int
    delta: int  # cedido - recibido (debería ser 0 por construcción)
    cierre_al_unidad: bool  # True si delta == 0


class TraspasoSnapshotResponse(BaseModel):
    fecha: date
    n_afores_reportando: int
    identidad: TraspasoIdentidad
    afores: list[TraspasoSnapshotRow]
    caveats: list[str]


# ---------------------------------------------------------------------
# 14. /pea-cotizantes/serie   (S16 — dataset #02, sin afore)
# ---------------------------------------------------------------------


class PeaCotizantesPunto(BaseModel):
    anio: int
    cotizantes: int
    pea: int
    porcentaje_pea_afore: float
    brecha_no_cubierta_pct: float  # 100 - porcentaje (informalidad/desempleo/no-cotizantes)


class PeaCotizantesResponse(BaseModel):
    n_puntos: int
    anio_min: int
    anio_max: int
    serie: list[PeaCotizantesPunto]
    cobertura_min_pct: float
    cobertura_min_anio: int
    cobertura_max_pct: float
    cobertura_max_anio: int
    caveats: list[str]


# ---------------------------------------------------------------------
# 15. /activo-neto/*   (S16 — dataset #07, atomic + agg)
# ---------------------------------------------------------------------


class ActivoNetoAforeRef(BaseModel):
    codigo: str
    nombre_corto: str
    tipo_pension: str


class ActivoNetoSieforeRef(BaseModel):
    slug: str
    nombre: str
    categoria: str


class ActivoNetoPunto(BaseModel):
    fecha: date
    monto_mxn_mm: Optional[float]


class ActivoNetoMappingMeta(BaseModel):
    """Provenance del mapping para pares (afore × siefore) que vienen de
    sub-variants decompuestos en #07 (consar.afore_siefore_alias)."""
    is_subvariant_decomposed: bool   # True si el par fue decompuesto desde un sub-variant concat
    mapping_validated: Optional[bool]  # None si is_subvariant_decomposed=False (mapping directo, atómico desde origen)
    validated_via: Optional[str]


class ActivoNetoSerieResponse(BaseModel):
    afore: ActivoNetoAforeRef
    siefore: ActivoNetoSieforeRef
    unit: str
    n_puntos: int
    rango: SerieRango
    serie: list[ActivoNetoPunto]
    mapping_meta: ActivoNetoMappingMeta
    caveats: list[str]


class ActivoNetoSnapshotRow(BaseModel):
    afore_codigo: str
    afore_nombre_corto: str
    siefore_slug: str
    siefore_nombre: str
    siefore_categoria: str
    monto_mxn_mm: Optional[float]


class ActivoNetoSnapshotResponse(BaseModel):
    fecha: date
    unit: str
    n_filas: int
    monto_total_mm: float       # excluye NULLs
    n_filas_null: int
    filas: list[ActivoNetoSnapshotRow]
    caveats: list[str]


class ActivoNetoAggPunto(BaseModel):
    fecha: date
    monto_mxn_mm: Optional[float]


class ActivoNetoAggregadoResponse(BaseModel):
    afore: ActivoNetoAforeRef
    categoria: str
    unit: str
    n_puntos: int
    rango: SerieRango
    serie: list[ActivoNetoAggPunto]
    caveats: list[str]
