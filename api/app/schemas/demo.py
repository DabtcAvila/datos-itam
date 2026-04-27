"""Pydantic models para /demo y /admin/demo (S15).

Schema PostgreSQL: demo.curso_bd (migración 010 + 011).
Tabla pedagógica de checkpoint ITAM Bases de Datos 2026 — NO confundir
con datasets oficiales del observatorio (cdmx/enigh/consar).

S15.2: agregados sueldo_diario_mxn y tipo (refactor a aplicación
HR/payroll empresarial). Bono $50,000 MXN flat por reclamación.
"""
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field


# Constante de negocio para el bono (flat, independiente del sueldo).
BONO_MXN: int = 50_000


# ---------------------------------------------------------------------
# Lectura pública
# ---------------------------------------------------------------------


class EstudianteRow(BaseModel):
    id: int
    nombre_completo: str
    rol: Literal["estudiante", "profesor"]
    tipo: Literal["profesor", "equipo", "estudiante"]
    seccion: str
    sueldo_diario_mxn: Decimal
    reclamar_bono: bool
    fecha_creacion: datetime
    fecha_actualizacion: datetime


class EstudiantesResponse(BaseModel):
    count: int
    estudiantes: list[EstudianteRow]
    seccion: str
    fuente: str = "demo.curso_bd (PostgreSQL Neon)"


class ResumenResponse(BaseModel):
    """Agregados que el dashboard /demo muestra en la KPI bar."""
    total_empleados: int
    bonos_reclamados: int
    bono_unitario_mxn: int = BONO_MXN
    monto_distribuido_mxn: int
    monto_disponible_mxn: int
    monto_total_posible_mxn: int
    nomina_diaria_total_mxn: Decimal
    fecha: datetime


# ---------------------------------------------------------------------
# Toggle público (auth: require_demo_user)
# ---------------------------------------------------------------------


class ToggleBonoResponse(BaseModel):
    id: int
    nombre_completo: str
    reclamar_bono: bool
    fecha_actualizacion: datetime
    actor_username: str = Field(
        description=(
            "Username del JWT que realizó el toggle. Útil para depurar "
            "demos en vivo cuando varios usuarios comparten la cuenta."
        ),
    )


# ---------------------------------------------------------------------
# Admin (auth: require_admin)
# ---------------------------------------------------------------------


class CrearEstudianteRequest(BaseModel):
    nombre_completo: str = Field(min_length=2, max_length=120)
    rol: Literal["estudiante", "profesor"] = "estudiante"
    tipo: Literal["profesor", "equipo", "estudiante"] = "estudiante"
    seccion: Optional[str] = Field(
        default=None,
        max_length=40,
        description="Si se omite, hereda el default de la columna ('BASES DE DATOS - 001').",
    )
    sueldo_diario_mxn: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)


class EditarEstudianteRequest(BaseModel):
    nombre_completo: Optional[str] = Field(default=None, min_length=2, max_length=120)
    rol: Optional[Literal["estudiante", "profesor"]] = None
    tipo: Optional[Literal["profesor", "equipo", "estudiante"]] = None
    seccion: Optional[str] = Field(default=None, max_length=40)
    sueldo_diario_mxn: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    reclamar_bono: Optional[bool] = None


class DeleteEstudianteResponse(BaseModel):
    id: int
    deleted: bool


class ResetResponse(BaseModel):
    filas_reseteadas: int
    fecha: datetime
