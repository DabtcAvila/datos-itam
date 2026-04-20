import datetime
from decimal import Decimal

from pydantic import BaseModel


class ServidorListItem(BaseModel):
    id: int
    nombre: str
    apellido_1: str
    apellido_2: str | None
    sexo: str
    edad: int | None
    sueldo_bruto: Decimal | None
    sueldo_neto: Decimal | None
    sector: str | None
    puesto: str | None


class ServidorDetail(BaseModel):
    id: int
    nombre: str
    apellido_1: str
    apellido_2: str | None
    sexo: str
    edad: int | None
    sueldo_bruto: Decimal | None
    sueldo_neto: Decimal | None
    fecha_ingreso: datetime.date | None
    id_nivel_salarial: int | None
    sector: str | None
    puesto: str | None
    tipo_contratacion: str | None
    tipo_personal: str | None
    tipo_nomina: str | None
    universo: str | None


class SueldoDistribucion(BaseModel):
    rango: str
    count: int


class ServidorStats(BaseModel):
    total: int
    sueldo_bruto_avg: float | None
    sueldo_bruto_median: float | None
    sueldo_bruto_p25: float | None
    sueldo_bruto_p75: float | None
    sueldo_bruto_min: float | None
    sueldo_bruto_max: float | None
    sueldo_neto_avg: float | None
    edad_avg: float | None
    count_hombres: int
    count_mujeres: int
    brecha_genero_pct: float | None
    distribucion_sueldo: list[SueldoDistribucion]
