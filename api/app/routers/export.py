import csv
import io

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import cast, select, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.dependencies import ServidorFilters, apply_filters, apply_ordering, get_filters
from app.rate_limit import limiter
from app.models.catalogs import (
    CatPuesto,
    CatSector,
    CatSexo,
    CatTipoContratacion,
    CatTipoNomina,
    CatTipoPersonal,
    CatUniverso,
)
from app.models.servidores import Nombramiento, Persona

router = APIRouter(prefix="/api/v1/export", tags=["export"])

P = Persona
N = Nombramiento
MAX_EXPORT_ROWS = 50_000


@router.get("/csv")
@limiter.limit("5/minute")
async def export_csv(
    request: Request,
    filters: ServidorFilters = Depends(get_filters),
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(
            P.id, P.nombre, P.apellido_1, P.apellido_2,
            CatSexo.nombre.label("sexo"), P.edad,
            N.sueldo_bruto, N.sueldo_neto,
            N.fecha_ingreso,
            CatSector.nombre.label("sector"),
            CatPuesto.nombre.label("puesto"),
            CatTipoContratacion.nombre.label("tipo_contratacion"),
            CatTipoPersonal.nombre.label("tipo_personal"),
            cast(CatTipoNomina.clave, String).label("tipo_nomina"),
            CatUniverso.nombre.label("universo"),
        )
        .select_from(P)
        .join(N, N.persona_id == P.id)
        .outerjoin(CatSexo, P.sexo_id == CatSexo.id)
        .outerjoin(CatSector, N.sector_id == CatSector.id)
        .outerjoin(CatPuesto, N.puesto_id == CatPuesto.id)
        .outerjoin(CatTipoContratacion, N.tipo_contratacion_id == CatTipoContratacion.id)
        .outerjoin(CatTipoPersonal, N.tipo_personal_id == CatTipoPersonal.id)
        .outerjoin(CatTipoNomina, N.tipo_nomina_id == CatTipoNomina.id)
        .outerjoin(CatUniverso, N.universo_id == CatUniverso.id)
    )
    stmt = apply_filters(stmt, filters, _sexo_joined=True)
    stmt = apply_ordering(stmt, filters)
    stmt = stmt.limit(MAX_EXPORT_ROWS)

    result = await session.execute(stmt)
    rows = result.all()

    columns = [
        "id", "nombre", "apellido_1", "apellido_2", "sexo", "edad",
        "sueldo_bruto", "sueldo_neto", "fecha_ingreso",
        "sector", "puesto", "tipo_contratacion", "tipo_personal",
        "tipo_nomina", "universo",
    ]

    def generate():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(columns)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        for row in rows:
            writer.writerow([getattr(row, col, None) for col in columns])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=remuneraciones_cdmx.csv"},
    )
