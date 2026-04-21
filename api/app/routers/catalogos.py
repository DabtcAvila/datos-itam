from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from sqlalchemy import cast, func, select, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_session
from app.models.users import User
from app.rate_limit import limiter
from app.models.catalogs import (
    CatNivelSalarial,
    CatPuesto,
    CatSector,
    CatSexo,
    CatTipoContratacion,
    CatTipoNomina,
    CatTipoPersonal,
    CatUniverso,
)
from app.models.servidores import Nombramiento, Persona
from app.schemas.catalogs import CatalogItemWithCount, PuestoWithCount
from app.schemas.pagination import PaginatedResponse

router = APIRouter(prefix="/api/v1/catalogos", tags=["catalogos"])

# --- Catalog metadata for generic CRUD ---
CATALOG_MAP: dict[str, dict[str, Any]] = {
    "sexos": {
        "model": CatSexo,
        "fk_col": Persona.sexo_id,
        "fields": ["nombre"],
    },
    "puestos": {
        "model": CatPuesto,
        "fk_col": Nombramiento.puesto_id,
        "fields": ["nombre"],
    },
    "tipos-contratacion": {
        "model": CatTipoContratacion,
        "fk_col": Nombramiento.tipo_contratacion_id,
        "fields": ["nombre"],
    },
    "tipos-personal": {
        "model": CatTipoPersonal,
        "fk_col": Nombramiento.tipo_personal_id,
        "fields": ["nombre"],
    },
    "tipos-nomina": {
        "model": CatTipoNomina,
        "fk_col": Nombramiento.tipo_nomina_id,
        "fields": ["clave"],
    },
    "universos": {
        "model": CatUniverso,
        "fk_col": Nombramiento.universo_id,
        "fields": ["clave", "nombre"],
    },
    "sectores": {
        "model": CatSector,
        "fk_col": Nombramiento.sector_id,
        "fields": ["clave", "nombre"],
    },
    "niveles-salariales": {
        "model": CatNivelSalarial,
        "fk_col": Nombramiento.nivel_salarial_id,
        "fields": ["clave"],
    },
}


def _get_catalog(tipo: str):
    info = CATALOG_MAP.get(tipo)
    if info is None:
        raise HTTPException(status_code=404, detail=f"Catalog type '{tipo}' not found")
    return info


def _item_to_dict(item) -> dict:
    return {"id": item.id, **{c.name: getattr(item, c.name) for c in item.__table__.columns if c.name != "id"}}


# ============ Existing GET endpoints ============

async def _catalog_with_count(session: AsyncSession, model, fk_col):
    stmt = (
        select(model.id, model.nombre, func.count(Nombramiento.id).label("count"))
        .outerjoin(Nombramiento, fk_col == model.id)
        .group_by(model.id, model.nombre)
        .order_by(model.nombre)
    )
    result = await session.execute(stmt)
    return [CatalogItemWithCount(id=r.id, nombre=r.nombre, count=r.count) for r in result.all()]


@router.get("/tipos-contratacion", response_model=list[CatalogItemWithCount])
@limiter.limit("60/minute")
async def tipos_contratacion(request: Request, session: AsyncSession = Depends(get_session)):
    return await _catalog_with_count(session, CatTipoContratacion, Nombramiento.tipo_contratacion_id)


@router.get("/tipos-personal", response_model=list[CatalogItemWithCount])
@limiter.limit("60/minute")
async def tipos_personal(request: Request, session: AsyncSession = Depends(get_session)):
    return await _catalog_with_count(session, CatTipoPersonal, Nombramiento.tipo_personal_id)


@router.get("/tipos-nomina", response_model=list[CatalogItemWithCount])
@limiter.limit("60/minute")
async def tipos_nomina(request: Request, session: AsyncSession = Depends(get_session)):
    stmt = (
        select(
            CatTipoNomina.id,
            cast(CatTipoNomina.clave, String).label("nombre"),
            func.count(Nombramiento.id).label("count"),
        )
        .outerjoin(Nombramiento, Nombramiento.tipo_nomina_id == CatTipoNomina.id)
        .group_by(CatTipoNomina.id, CatTipoNomina.clave)
        .order_by(CatTipoNomina.clave)
    )
    result = await session.execute(stmt)
    return [CatalogItemWithCount(id=r.id, nombre=r.nombre, count=r.count) for r in result.all()]


@router.get("/universos", response_model=list[CatalogItemWithCount])
@limiter.limit("60/minute")
async def universos(request: Request, session: AsyncSession = Depends(get_session)):
    return await _catalog_with_count(session, CatUniverso, Nombramiento.universo_id)


@router.get("/sectores", response_model=list[CatalogItemWithCount])
@limiter.limit("60/minute")
async def sectores(request: Request, session: AsyncSession = Depends(get_session)):
    return await _catalog_with_count(session, CatSector, Nombramiento.sector_id)


@router.get("/puestos", response_model=PaginatedResponse[PuestoWithCount])
@limiter.limit("60/minute")
async def puestos(
    request: Request,
    session: AsyncSession = Depends(get_session),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    base = (
        select(CatPuesto.id, CatPuesto.nombre, func.count(Nombramiento.id).label("count"))
        .outerjoin(Nombramiento, Nombramiento.puesto_id == CatPuesto.id)
        .group_by(CatPuesto.id, CatPuesto.nombre)
    )
    if search:
        base = base.where(CatPuesto.nombre.ilike(f"%{search}%"))

    count_stmt = select(func.count()).select_from(
        select(CatPuesto.id).where(CatPuesto.nombre.ilike(f"%{search}%")).subquery()
        if search
        else select(CatPuesto.id).subquery()
    )
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    stmt = base.order_by(func.count(Nombramiento.id).desc()).offset((page - 1) * per_page).limit(per_page)
    result = await session.execute(stmt)
    data = [PuestoWithCount(id=r.id, nombre=r.nombre, count=r.count) for r in result.all()]

    return PaginatedResponse(
        data=data, total=total, page=page, per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


# ============ Generic CRUD: POST / PUT / DELETE ============

@router.post("/{tipo}", status_code=201)
async def create_catalog_item(
    tipo: str,
    body: dict = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    info = _get_catalog(tipo)
    model = info["model"]
    required_fields = info["fields"]

    # Validate required fields
    for field in required_fields:
        if field not in body:
            raise HTTPException(status_code=422, detail=f"Missing required field: '{field}'")

    kwargs = {f: body[f] for f in required_fields}
    item = model(**kwargs)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return _item_to_dict(item)


@router.put("/{tipo}/{item_id}")
async def update_catalog_item(
    tipo: str,
    item_id: int,
    body: dict = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    info = _get_catalog(tipo)
    model = info["model"]
    allowed_fields = info["fields"]

    item = await session.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"{tipo} item {item_id} not found")

    for field in allowed_fields:
        if field in body:
            setattr(item, field, body[field])

    session.add(item)
    await session.commit()
    await session.refresh(item)
    return _item_to_dict(item)


@router.delete("/{tipo}/{item_id}", status_code=204)
async def delete_catalog_item(
    tipo: str,
    item_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    info = _get_catalog(tipo)
    model = info["model"]
    fk_col = info["fk_col"]

    item = await session.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"{tipo} item {item_id} not found")

    count_result = await session.execute(
        select(func.count()).where(fk_col == item_id)
    )
    ref_count = count_result.scalar_one()
    if ref_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {ref_count} records reference this {tipo} item",
        )

    await session.delete(item)
    await session.commit()
