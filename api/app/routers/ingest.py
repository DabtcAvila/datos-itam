import csv
import io
import time
from datetime import date
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_session
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
from app.models.users import User
from app.schemas.ingest import IngestResult

router = APIRouter(prefix="/api/v1/ingest", tags=["ingest"])

# Cache for catalog lookups within a single ingest run
CatalogCache = dict[str, dict[str, int]]


async def _get_or_create_nombre(session: AsyncSession, model, nombre: str, cache: dict[str, int]) -> int | None:
    """Get or create a catalog item by nombre. Returns id."""
    if not nombre or not nombre.strip():
        return None
    nombre = nombre.strip()
    if nombre in cache:
        return cache[nombre]
    result = await session.execute(select(model).where(model.nombre == nombre))
    item = result.scalar_one_or_none()
    if item is None:
        item = model(nombre=nombre)
        session.add(item)
        await session.flush()
    cache[nombre] = item.id
    return item.id


async def _get_or_create_clave(session: AsyncSession, model, clave_raw: str, cache: dict[str, int]) -> int | None:
    """Get or create a catalog item by clave (int). Returns id."""
    if not clave_raw or not clave_raw.strip():
        return None
    try:
        clave = int(clave_raw.strip())
    except ValueError:
        return None
    key = str(clave)
    if key in cache:
        return cache[key]
    result = await session.execute(select(model).where(model.clave == clave))
    item = result.scalar_one_or_none()
    if item is None:
        item = model(clave=clave)
        session.add(item)
        await session.flush()
    cache[key] = item.id
    return item.id


async def _get_or_create_clave_nombre(
    session: AsyncSession, model, clave: str, nombre: str, cache: dict[str, int]
) -> int | None:
    """Get or create a catalog item by clave+nombre. Returns id."""
    if not clave or not clave.strip():
        return None
    clave = clave.strip()
    if clave in cache:
        return cache[clave]
    result = await session.execute(select(model).where(model.clave == clave))
    item = result.scalar_one_or_none()
    if item is None:
        item = model(clave=clave, nombre=(nombre or "").strip())
        session.add(item)
        await session.flush()
    cache[clave] = item.id
    return item.id


def _parse_decimal(val: str) -> Decimal | None:
    if not val or not val.strip():
        return None
    try:
        return Decimal(val.strip().replace(",", ""))
    except InvalidOperation:
        return None


def _parse_int(val: str) -> int | None:
    if not val or not val.strip():
        return None
    try:
        return int(val.strip())
    except ValueError:
        return None


def _parse_date(val: str) -> date | None:
    if not val or not val.strip():
        return None
    val = val.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return date.fromisoformat(val) if fmt == "%Y-%m-%d" else date(*time.strptime(val, fmt)[:3])
        except ValueError:
            continue
    return None


@router.post("/csv", response_model=IngestResult)
async def ingest_csv(
    file: UploadFile,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=422, detail="File must be a .csv")

    start = time.time()
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    # Caches for catalog lookups
    cache_sexo: dict[str, int] = {}
    cache_puesto: dict[str, int] = {}
    cache_sector: dict[str, int] = {}
    cache_tipo_nomina: dict[str, int] = {}
    cache_tipo_contratacion: dict[str, int] = {}
    cache_tipo_personal: dict[str, int] = {}
    cache_universo: dict[str, int] = {}
    cache_nivel_salarial: dict[str, int] = {}

    inserted = 0
    errors = 0
    error_details: list[str] = []
    batch_count = 0

    for i, row in enumerate(reader, start=2):  # row 1 is header
        try:
            # Resolve catalogs
            sexo_id = await _get_or_create_nombre(session, CatSexo, row.get("sexo", ""), cache_sexo)
            puesto_id = await _get_or_create_nombre(session, CatPuesto, row.get("n_puesto", ""), cache_puesto)
            tipo_contratacion_id = await _get_or_create_nombre(
                session, CatTipoContratacion, row.get("tipo_contratacion", ""), cache_tipo_contratacion
            )
            tipo_personal_id = await _get_or_create_nombre(
                session, CatTipoPersonal, row.get("tipo_personal", ""), cache_tipo_personal
            )
            tipo_nomina_id = await _get_or_create_clave(
                session, CatTipoNomina, row.get("tipo_nomina", ""), cache_tipo_nomina
            )

            # sector: n_cabeza_sector could be "clave - nombre" or just a name
            sector_raw = row.get("n_cabeza_sector", "").strip()
            sector_id = None
            if sector_raw:
                if " - " in sector_raw:
                    parts = sector_raw.split(" - ", 1)
                    sector_id = await _get_or_create_clave_nombre(
                        session, CatSector, parts[0].strip(), parts[1].strip(), cache_sector
                    )
                else:
                    sector_id = await _get_or_create_clave_nombre(
                        session, CatSector, sector_raw, sector_raw, cache_sector
                    )

            # Create persona
            nombre = (row.get("nombre") or "").strip()
            apellido_1 = (row.get("apellido_1") or "").strip()
            apellido_2 = (row.get("apellido_2") or "").strip() or None
            edad = _parse_int(row.get("edad", ""))

            if not nombre or not apellido_1:
                errors += 1
                if len(error_details) < 50:
                    error_details.append(f"Row {i}: missing nombre or apellido_1")
                continue

            persona = Persona(
                nombre=nombre,
                apellido_1=apellido_1,
                apellido_2=apellido_2,
                sexo_id=sexo_id,
                edad=edad,
            )
            session.add(persona)
            await session.flush()

            # Create nombramiento
            nombramiento = Nombramiento(
                persona_id=persona.id,
                puesto_id=puesto_id,
                sector_id=sector_id,
                tipo_nomina_id=tipo_nomina_id,
                tipo_contratacion_id=tipo_contratacion_id,
                tipo_personal_id=tipo_personal_id,
                universo_id=None,
                nivel_salarial_id=None,
                fecha_ingreso=_parse_date(row.get("fecha_ingreso", "")),
                sueldo_bruto=_parse_decimal(row.get("sueldo_tabular_bruto", "")),
                sueldo_neto=_parse_decimal(row.get("sueldo_tabular_neto", "")),
            )
            session.add(nombramiento)
            inserted += 1
            batch_count += 1

            if batch_count >= 1000:
                await session.commit()
                batch_count = 0

        except Exception as exc:
            errors += 1
            if len(error_details) < 50:
                error_details.append(f"Row {i}: {exc!s}")
            await session.rollback()
            batch_count = 0

    # Final commit
    if batch_count > 0:
        await session.commit()

    duration = round(time.time() - start, 2)
    return IngestResult(
        inserted=inserted,
        errors=errors,
        error_details=error_details,
        duration_seconds=duration,
    )
