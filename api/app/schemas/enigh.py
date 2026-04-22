"""Pydantic response models for ENIGH 2024 Nueva Serie endpoints.

All monetary averages are **trimestral** (as published by INEGI in the raw
microdata) unless the field name ends in `_mensual`. Expanded counts are
factor-weighted to national totals.
"""
from pydantic import BaseModel


# ---------------------------------------------------------------------
# Grupo D — utilidad
# ---------------------------------------------------------------------


class SourceRef(BaseModel):
    title: str
    url: str
    consulted_on: str


class EnighMetadata(BaseModel):
    edition: str
    periodicity: str
    reference_date: str
    schema_version: str
    last_updated: str
    total_hogares_muestra: int
    total_hogares_expandido: int
    total_tablas_ingestadas: int
    total_catalogos: int
    sources: list[SourceRef]
    methodology_notes: list[str]


class ValidacionRow(BaseModel):
    id: str
    scope: str
    metric: str
    column: str
    unit: str
    calculado: float
    oficial: float
    delta_pct: float
    tolerance_pct: float
    passing: bool
    source: str


class ValidacionesResponse(BaseModel):
    count: int
    passing: int
    failing: int
    bounds: list[ValidacionRow]


# ---------------------------------------------------------------------
# Grupo A — descriptivos
# ---------------------------------------------------------------------


class HogaresSummary(BaseModel):
    n_hogares_muestra: int
    n_hogares_expandido: int
    mean_ing_cor_trim: float
    mean_ing_cor_mensual: float
    mean_gasto_mon_trim: float
    mean_gasto_mon_mensual: float
    edition: str
    source: str


class DecilRow(BaseModel):
    decil: int
    n_hogares_muestra: int
    n_hogares_expandido: int
    mean_ing_cor_trim: float
    mean_ing_cor_mensual: float
    mean_gasto_mon_trim: float
    share_factor_pct: float


class EntidadRow(BaseModel):
    clave: str
    nombre: str
    n_hogares_muestra: int
    n_hogares_expandido: int
    mean_ing_cor_trim: float
    mean_ing_cor_mensual: float
    mean_gasto_mon_trim: float


class SexoCount(BaseModel):
    sexo: str
    n_expandido: int
    pct: float


class EdadBucket(BaseModel):
    bucket: str
    n_expandido: int
    pct: float


class DemographicsResponse(BaseModel):
    scope: str
    n_personas_muestra: int
    n_personas_expandido: int
    sexo: list[SexoCount]
    edad: list[EdadBucket]


class RubroRow(BaseModel):
    slug: str
    nombre: str
    mean_gasto_trim: float
    mean_gasto_mensual: float
    pct_del_monetario: float
    oficial_mensual: float | None
    bound_delta_pct: float | None


class RubrosResponse(BaseModel):
    decil: int | None
    mean_gasto_mon_trim: float
    rubros: list[RubroRow]


# ---------------------------------------------------------------------
# Grupo B — actividad económica
# ---------------------------------------------------------------------


class ActividadDecilRow(BaseModel):
    decil: int
    n_hogares_muestra: int
    n_hogares_expandido: int
    pct_share_actividad: float


class ActividadEntidadRow(BaseModel):
    clave: str
    nombre: str
    n_hogares_expandido: int


class ActividadAgroResponse(BaseModel):
    n_hogares_muestra: int
    n_hogares_expandido: int
    pct_del_universo: float
    sum_ventas_trim: int
    sum_gasto_negocio_trim: int
    mean_ventas_por_hogar: float
    por_decil: list[ActividadDecilRow]
    top_entidades: list[ActividadEntidadRow]
    note: str


class ActividadNoagroResponse(BaseModel):
    n_hogares_muestra: int
    n_hogares_expandido: int
    pct_del_universo: float
    sum_ventas_trim: int
    sum_ingreso_trim: int
    mean_ventas_por_hogar: float
    por_decil: list[ActividadDecilRow]
    top_entidades: list[ActividadEntidadRow]
    note: str


class JcfEntidadRow(BaseModel):
    clave: str
    nombre: str
    beneficiarios_muestra: int
    beneficiarios_expandido: int


class ActividadJcfResponse(BaseModel):
    n_beneficiarios_muestra: int
    n_beneficiarios_expandido: int
    sum_ingreso_trim: int
    mean_ingreso_trim_por_beneficiario: float
    por_entidad: list[JcfEntidadRow]
    note: str
