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
