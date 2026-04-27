"""Pydantic models para /demo y /admin/demo (S15).

Schema PostgreSQL: demo.curso_bd (migración 010).
Tabla pedagógica de checkpoint ITAM Bases de Datos 2026 — NO confundir
con datasets oficiales del observatorio (cdmx/enigh/consar).
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------
# Lectura pública
# ---------------------------------------------------------------------


class EstudianteRow(BaseModel):
    id: int
    nombre_completo: str
    rol: Literal["estudiante", "profesor"]
    seccion: str
    reclamar_bono: bool
    fecha_creacion: datetime
    fecha_actualizacion: datetime


class EstudiantesResponse(BaseModel):
    count: int
    estudiantes: list[EstudianteRow]
    seccion: str
    fuente: str = "demo.curso_bd (PostgreSQL Neon)"


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
    seccion: Optional[str] = Field(
        default=None,
        max_length=40,
        description="Si se omite, hereda el default de la columna ('BASES DE DATOS - 001').",
    )


class EditarEstudianteRequest(BaseModel):
    nombre_completo: Optional[str] = Field(default=None, min_length=2, max_length=120)
    rol: Optional[Literal["estudiante", "profesor"]] = None
    seccion: Optional[str] = Field(default=None, max_length=40)
    reclamar_bono: Optional[bool] = None


class DeleteEstudianteResponse(BaseModel):
    id: int
    deleted: bool


class ResetResponse(BaseModel):
    filas_reseteadas: int
    fecha: datetime
