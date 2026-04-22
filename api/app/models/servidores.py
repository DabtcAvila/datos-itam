import datetime
from decimal import Decimal

from sqlmodel import Field, SQLModel

# `personas` and `nombramientos` live in the `cdmx` schema (migration 005).
# ForeignKey strings must include the schema to resolve against cdmx.* tables.
_CDMX = {"schema": "cdmx"}


class Persona(SQLModel, table=True):
    __tablename__ = "personas"
    __table_args__ = _CDMX
    id: int = Field(primary_key=True)
    nombre: str
    apellido_1: str
    apellido_2: str | None = None
    sexo_id: int | None = Field(default=None, foreign_key="cdmx.cat_sexos.id")
    edad: int | None = None


class Nombramiento(SQLModel, table=True):
    __tablename__ = "nombramientos"
    __table_args__ = _CDMX
    id: int = Field(primary_key=True)
    persona_id: int = Field(foreign_key="cdmx.personas.id")
    puesto_id: int | None = Field(default=None, foreign_key="cdmx.cat_puestos.id")
    sector_id: int | None = Field(default=None, foreign_key="cdmx.cat_sectores.id")
    tipo_nomina_id: int | None = Field(default=None, foreign_key="cdmx.cat_tipos_nomina.id")
    tipo_contratacion_id: int | None = Field(default=None, foreign_key="cdmx.cat_tipos_contratacion.id")
    tipo_personal_id: int | None = Field(default=None, foreign_key="cdmx.cat_tipos_personal.id")
    universo_id: int | None = Field(default=None, foreign_key="cdmx.cat_universos.id")
    nivel_salarial_id: int | None = Field(default=None, foreign_key="cdmx.cat_niveles_salariales.id")
    fecha_ingreso: datetime.date | None = None
    sueldo_bruto: Decimal | None = None
    sueldo_neto: Decimal | None = None
