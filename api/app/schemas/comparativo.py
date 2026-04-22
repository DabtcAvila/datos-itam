"""Pydantic response models for cross-schema comparativos CDMX ↔ ENIGH.

Todos los comparativos incluyen `caveats: list[str]` con la nota heredada:
  "cdmx.nombramientos es snapshot sin fecha alta/baja. Incluye todos los
  registros disponibles sin filtro temporal."
"""
from pydantic import BaseModel


# ---------------------------------------------------------------------
# C1 — ingreso/cdmx-vs-nacional
# ---------------------------------------------------------------------


class IngresoCdmxServidor(BaseModel):
    unit: str
    n_servidores: int
    mean_sueldo_bruto_mensual: float
    median_sueldo_bruto_mensual: float


class IngresoEnighHogar(BaseModel):
    unit: str
    scope: str
    n_hogares_expandido: int
    mean_ing_cor_mensual: float


class IngresoComparativoResponse(BaseModel):
    cdmx_servidor: IngresoCdmxServidor
    enigh_hogar_nacional: IngresoEnighHogar
    enigh_hogar_cdmx: IngresoEnighHogar
    brecha_mean_servidor_vs_hogar_nacional: float
    ratio_hogar_nacional_sobre_servidor: float
    brecha_mean_servidor_vs_hogar_cdmx: float
    ratio_hogar_cdmx_sobre_servidor: float
    note: str
    caveats: list[str]


# ---------------------------------------------------------------------
# C2 — decil-servidores-cdmx (tesis central)
# ---------------------------------------------------------------------


class PercentilRow(BaseModel):
    percentil: str
    sueldo_mensual: float


class DecilBound(BaseModel):
    decil: int
    lower_mensual: float
    upper_mensual: float


class EscenarioMapeoRow(BaseModel):
    percentil: str
    ingreso_hogar_supuesto_mensual: float
    decil_hogar_enigh: int | None


class EscenarioResponse(BaseModel):
    nombre: str
    supuesto: str
    ingreso_adicional_mensual: float
    mapeo: list[EscenarioMapeoRow]


class CaveatsInterpretativos(BaseModel):
    frontera_p50: str
    narrativa_correcta: str
    insight_principal: str
    implicacion_narrativa: str


class DecilServidoresResponse(BaseModel):
    cdmx_servidor: dict
    enigh_deciles_mensuales: list[DecilBound]
    escenarios: list[EscenarioResponse]
    narrative: str
    caveats: list[str]
    caveats_interpretativos: CaveatsInterpretativos


# ---------------------------------------------------------------------
# C3 — aportes-vs-jubilaciones-actuales
# ---------------------------------------------------------------------


class CdmxAportesActuales(BaseModel):
    unit: str
    n_servidores: int
    mean_sueldo_bruto: float
    mean_sueldo_neto: float
    mean_deduccion_total: float
    pct_deduccion_sobre_bruto: float


class EnighJubilacionesActuales(BaseModel):
    unit_trim: str
    unit_mes: str
    pct_hogares_con_jubilacion: float
    mean_jubilacion_sobre_todos_trim: float
    mean_jubilacion_solo_jubilados_trim: float
    mean_jubilacion_solo_jubilados_mensual: float
    n_hogares_con_jubilacion_expandido: int


class AportesVsJubilacionesResponse(BaseModel):
    cdmx_aportes_actuales: CdmxAportesActuales
    enigh_jubilaciones_actuales: EnighJubilacionesActuales
    interpretacion: str
    caveats: list[str]


# ---------------------------------------------------------------------
# C4 — actividad-cdmx-vs-nacional
# ---------------------------------------------------------------------


class ActividadComparativa(BaseModel):
    tipo: str
    hogares_expandido_nacional: int
    hogares_expandido_cdmx: int
    pct_nacional: float
    pct_cdmx: float
    ratio_cdmx_sobre_nacional: float


class ActividadCdmxVsNacionalResponse(BaseModel):
    agro: ActividadComparativa
    noagro: ActividadComparativa
    n_hogares_total_nacional: int
    n_hogares_total_cdmx: int
    note: str
    nota_hipotesis: str
    caveats: list[str]


# ---------------------------------------------------------------------
# C5 — gastos/cdmx-vs-nacional
# ---------------------------------------------------------------------


class GastoRubroComparativo(BaseModel):
    slug: str
    nombre: str
    mean_cdmx_mensual: float
    mean_nacional_mensual: float
    delta_absoluto: float
    delta_pct: float
    pct_del_monetario_cdmx: float
    pct_del_monetario_nacional: float


class GastosCdmxVsNacionalResponse(BaseModel):
    mean_gasto_mon_mensual_nacional: float
    mean_gasto_mon_mensual_cdmx: float
    rubros: list[GastoRubroComparativo]
    note: str
    caveats: list[str]


# ---------------------------------------------------------------------
# C6 — bancarizacion
# ---------------------------------------------------------------------


class BancarizacionResponse(BaseModel):
    definicion_operativa: str
    n_hogares_expandido_nacional: int
    n_hogares_expandido_cdmx: int
    hogares_con_uso_tarjeta_nacional: int
    hogares_con_uso_tarjeta_cdmx: int
    pct_nacional: float
    pct_cdmx: float
    delta_pp: float
    ratio_cdmx_sobre_nacional: float
    caveats: list[str]


# ---------------------------------------------------------------------
# C7 — top-vs-bottom
# ---------------------------------------------------------------------


class CdmxPercentilExtremo(BaseModel):
    percentil: str
    sueldo_mensual: float


class EnighDecilExtremo(BaseModel):
    decil: int
    mean_ing_cor_mensual: float
    lower_mensual: float
    upper_mensual: float


class TopVsBottomResponse(BaseModel):
    top_bracket: dict
    bottom_bracket: dict
    narrative: str
    insights: list[str]
    caveats: list[str]
