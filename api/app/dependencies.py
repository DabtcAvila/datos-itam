from dataclasses import dataclass
from decimal import Decimal

from fastapi import Query
from sqlalchemy import Select

from app.models.catalogs import CatSexo
from app.models.servidores import Nombramiento, Persona


@dataclass
class ServidorFilters:
    sector_id: int | None = None
    sexo: str | None = None
    edad_min: int | None = None
    edad_max: int | None = None
    sueldo_min: Decimal | None = None
    sueldo_max: Decimal | None = None
    puesto_search: str | None = None
    tipo_contratacion_id: int | None = None
    tipo_personal_id: int | None = None
    universo_id: int | None = None
    page: int = 1
    per_page: int = 50
    order_by: str = "id"
    order: str = "asc"


def get_filters(
    sector_id: int | None = Query(None),
    sexo: str | None = Query(None),
    edad_min: int | None = Query(None),
    edad_max: int | None = Query(None),
    sueldo_min: Decimal | None = Query(None),
    sueldo_max: Decimal | None = Query(None),
    puesto_search: str | None = Query(None),
    tipo_contratacion_id: int | None = Query(None),
    tipo_personal_id: int | None = Query(None),
    universo_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    order_by: str = Query("id"),
    order: str = Query("asc"),
) -> ServidorFilters:
    return ServidorFilters(
        sector_id=sector_id,
        sexo=sexo,
        edad_min=edad_min,
        edad_max=edad_max,
        sueldo_min=sueldo_min,
        sueldo_max=sueldo_max,
        puesto_search=puesto_search,
        tipo_contratacion_id=tipo_contratacion_id,
        tipo_personal_id=tipo_personal_id,
        universo_id=universo_id,
        page=page,
        per_page=per_page,
        order_by=order_by,
        order=order,
    )


ALLOWED_ORDER_COLUMNS = {
    "id", "nombre", "apellido_1", "edad", "sueldo_bruto", "sueldo_neto", "fecha_ingreso",
}

# Columns that live on Persona vs Nombramiento
_PERSONA_ORDER_COLS = {"id", "nombre", "apellido_1", "edad"}
_NOMBRAMIENTO_ORDER_COLS = {"sueldo_bruto", "sueldo_neto", "fecha_ingreso"}


def apply_filters(stmt: Select, filters: ServidorFilters, *, _sexo_joined: bool = False) -> Select:
    """Apply filters to a statement that already joins Persona and Nombramiento."""
    N = Nombramiento
    P = Persona
    if filters.sector_id is not None:
        stmt = stmt.where(N.sector_id == filters.sector_id)
    if filters.sexo is not None:
        if not _sexo_joined:
            stmt = stmt.join(CatSexo, P.sexo_id == CatSexo.id)
        stmt = stmt.where(CatSexo.nombre == filters.sexo)
    if filters.edad_min is not None:
        stmt = stmt.where(P.edad >= filters.edad_min)
    if filters.edad_max is not None:
        stmt = stmt.where(P.edad <= filters.edad_max)
    if filters.sueldo_min is not None:
        stmt = stmt.where(N.sueldo_bruto >= filters.sueldo_min)
    if filters.sueldo_max is not None:
        stmt = stmt.where(N.sueldo_bruto <= filters.sueldo_max)
    if filters.puesto_search is not None:
        from app.models.catalogs import CatPuesto
        stmt = stmt.join(CatPuesto, N.puesto_id == CatPuesto.id).where(
            CatPuesto.nombre.ilike(f"%{filters.puesto_search}%")
        )
    if filters.tipo_contratacion_id is not None:
        stmt = stmt.where(N.tipo_contratacion_id == filters.tipo_contratacion_id)
    if filters.tipo_personal_id is not None:
        stmt = stmt.where(N.tipo_personal_id == filters.tipo_personal_id)
    if filters.universo_id is not None:
        stmt = stmt.where(N.universo_id == filters.universo_id)
    return stmt


def apply_ordering(stmt: Select, filters: ServidorFilters) -> Select:
    col_name = filters.order_by if filters.order_by in ALLOWED_ORDER_COLUMNS else "id"
    if col_name in _PERSONA_ORDER_COLS:
        col = getattr(Persona, col_name)
    else:
        col = getattr(Nombramiento, col_name)
    if filters.order == "desc":
        stmt = stmt.order_by(col.desc())
    else:
        stmt = stmt.order_by(col.asc())
    return stmt
