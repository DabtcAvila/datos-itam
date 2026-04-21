import datetime
from decimal import Decimal

from pydantic import BaseModel


class NombramientoCreate(BaseModel):
    persona_id: int
    puesto_id: int | None = None
    sector_id: int | None = None
    tipo_nomina_id: int | None = None
    tipo_contratacion_id: int | None = None
    tipo_personal_id: int | None = None
    universo_id: int | None = None
    nivel_salarial_id: int | None = None
    fecha_ingreso: datetime.date | None = None
    sueldo_bruto: Decimal | None = None
    sueldo_neto: Decimal | None = None


class NombramientoUpdate(BaseModel):
    puesto_id: int | None = None
    sector_id: int | None = None
    tipo_nomina_id: int | None = None
    tipo_contratacion_id: int | None = None
    tipo_personal_id: int | None = None
    universo_id: int | None = None
    nivel_salarial_id: int | None = None
    fecha_ingreso: datetime.date | None = None
    sueldo_bruto: Decimal | None = None
    sueldo_neto: Decimal | None = None


class NombramientoResponse(BaseModel):
    id: int
    persona_id: int
    puesto_id: int | None = None
    sector_id: int | None = None
    tipo_nomina_id: int | None = None
    tipo_contratacion_id: int | None = None
    tipo_personal_id: int | None = None
    universo_id: int | None = None
    nivel_salarial_id: int | None = None
    fecha_ingreso: datetime.date | None = None
    sueldo_bruto: Decimal | None = None
    sueldo_neto: Decimal | None = None
