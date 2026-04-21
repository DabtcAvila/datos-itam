from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_session
from app.models.catalogs import CatSexo
from app.models.servidores import Nombramiento, Persona
from app.models.users import User
from app.rate_limit import limiter
from app.schemas.pagination import PaginatedResponse
from app.schemas.personas import PersonaCreate, PersonaResponse, PersonaUpdate

router = APIRouter(prefix="/api/v1/personas", tags=["personas"])


@router.get("/", response_model=PaginatedResponse[PersonaResponse])
@limiter.limit("30/minute")
async def list_personas(
    request: Request,
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    nombre: str | None = Query(None),
    sexo_id: int | None = Query(None),
):
    base = select(Persona)
    count_base = select(func.count(Persona.id))

    if nombre:
        like = f"%{nombre}%"
        base = base.where(
            (Persona.nombre.ilike(like))
            | (Persona.apellido_1.ilike(like))
            | (Persona.apellido_2.ilike(like))
        )
        count_base = count_base.where(
            (Persona.nombre.ilike(like))
            | (Persona.apellido_1.ilike(like))
            | (Persona.apellido_2.ilike(like))
        )
    if sexo_id is not None:
        base = base.where(Persona.sexo_id == sexo_id)
        count_base = count_base.where(Persona.sexo_id == sexo_id)

    total = (await session.execute(count_base)).scalar_one()
    stmt = base.order_by(Persona.id).offset((page - 1) * per_page).limit(per_page)
    result = await session.execute(stmt)
    data = [PersonaResponse.model_validate(r, from_attributes=True) for r in result.scalars().all()]

    return PaginatedResponse(
        data=data, total=total, page=page, per_page=per_page,
        pages=(total + per_page - 1) // per_page if total > 0 else 0,
    )


@router.get("/{persona_id}", response_model=PersonaResponse)
@limiter.limit("60/minute")
async def get_persona(
    request: Request,
    persona_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Persona).where(Persona.id == persona_id))
    persona = result.scalar_one_or_none()
    if persona is None:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return persona


@router.post("/", response_model=PersonaResponse, status_code=201)
async def create_persona(
    body: PersonaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if body.sexo_id is not None:
        sexo = await session.get(CatSexo, body.sexo_id)
        if sexo is None:
            raise HTTPException(status_code=422, detail=f"sexo_id {body.sexo_id} does not exist")

    persona = Persona(**body.model_dump())
    session.add(persona)
    await session.commit()
    await session.refresh(persona)
    return persona


@router.put("/{persona_id}", response_model=PersonaResponse)
async def update_persona(
    persona_id: int,
    body: PersonaUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    persona = await session.get(Persona, persona_id)
    if persona is None:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    update_data = body.model_dump(exclude_unset=True)
    if "sexo_id" in update_data and update_data["sexo_id"] is not None:
        sexo = await session.get(CatSexo, update_data["sexo_id"])
        if sexo is None:
            raise HTTPException(status_code=422, detail=f"sexo_id {update_data['sexo_id']} does not exist")

    for key, value in update_data.items():
        setattr(persona, key, value)

    session.add(persona)
    await session.commit()
    await session.refresh(persona)
    return persona


@router.delete("/{persona_id}", status_code=204)
async def delete_persona(
    persona_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    persona = await session.get(Persona, persona_id)
    if persona is None:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    # Check for active nombramientos
    count_result = await session.execute(
        select(func.count(Nombramiento.id)).where(Nombramiento.persona_id == persona_id)
    )
    if count_result.scalar_one() > 0:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete persona with active nombramientos",
        )

    await session.delete(persona)
    await session.commit()
