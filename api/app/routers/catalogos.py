from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import cast, func, select, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.rate_limit import limiter
from app.models.catalogs import (
    CatPuesto,
    CatSector,
    CatTipoContratacion,
    CatTipoNomina,
    CatTipoPersonal,
    CatUniverso,
)
from app.models.servidores import Nombramiento
from app.schemas.catalogs import CatalogItemWithCount, PuestoWithCount
from app.schemas.pagination import PaginatedResponse

router = APIRouter(prefix="/api/v1/catalogos", tags=["catalogos"])


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

    # Count
    count_stmt = select(func.count()).select_from(
        select(CatPuesto.id).where(CatPuesto.nombre.ilike(f"%{search}%")).subquery()
        if search
        else select(CatPuesto.id).subquery()
    )
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    # Data
    stmt = base.order_by(func.count(Nombramiento.id).desc()).offset((page - 1) * per_page).limit(per_page)
    result = await session.execute(stmt)
    data = [PuestoWithCount(id=r.id, nombre=r.nombre, count=r.count) for r in result.all()]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )
