"""Endpoints públicos + admin para demo.curso_bd (S15).

Diseño S15.2 (refactor HR/payroll empresarial):
  - GET públicos sin auth (la tabla es lectura libre, /demo es read-only).
  - GET /resumen agrega total empleados + bonos + monto distribuido.
  - PUT /toggle-bono requiere JWT (require_demo_user) — la cuenta `DemoAbril`
    es compartida entre estudiantes + profesor durante el checkpoint en vivo.
  - POST/PUT/DELETE/RESET admin viven bajo /admin/demo/* (require_admin).

Aislamiento: schema demo.curso_bd, NO toca cdmx/enigh/consar.
"""
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text

from app.auth import require_admin, require_demo_user
from app.database import engine
from app.models.users import User
from app.rate_limit import limiter
from app.schemas.demo import (
    BONO_MXN,
    CrearEstudianteRequest,
    DeleteEstudianteResponse,
    EditarEstudianteRequest,
    EstudianteRow,
    EstudiantesResponse,
    ResetResponse,
    ResumenResponse,
    ToggleBonoResponse,
)

# Dos routers — uno público con prefix /demo, uno admin con prefix /admin/demo.
public_router = APIRouter(prefix="/api/v1/demo", tags=["demo"])
admin_router = APIRouter(prefix="/api/v1/admin/demo", tags=["demo-admin"])


# ---------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------

# Orden narrativo para el frontend HR/payroll:
#   1. profesor (1 fila)
#   2. equipo (4 filas, organizadores)
#   3. estudiante (7 filas)
# Dentro de cada tipo, ORDER BY sueldo_diario_mxn DESC.
SQL_LIST = """
SELECT id, nombre_completo, rol, tipo, seccion, sueldo_diario_mxn, reclamar_bono,
       fecha_creacion, fecha_actualizacion
FROM demo.curso_bd
ORDER BY
    CASE tipo WHEN 'profesor' THEN 1 WHEN 'equipo' THEN 2 ELSE 3 END,
    sueldo_diario_mxn DESC,
    nombre_completo
"""

SQL_GET_ONE = """
SELECT id, nombre_completo, rol, tipo, seccion, sueldo_diario_mxn, reclamar_bono,
       fecha_creacion, fecha_actualizacion
FROM demo.curso_bd
WHERE id = :id
"""

SQL_RESUMEN = """
SELECT
    COUNT(*)::int                                        AS total_empleados,
    COUNT(*) FILTER (WHERE reclamar_bono)::int           AS bonos_reclamados,
    COALESCE(SUM(sueldo_diario_mxn), 0)::numeric         AS nomina_diaria_total_mxn
FROM demo.curso_bd
"""

SQL_TOGGLE_BONO = """
UPDATE demo.curso_bd
SET reclamar_bono = NOT reclamar_bono
WHERE id = :id
RETURNING id, nombre_completo, reclamar_bono, fecha_actualizacion
"""

SQL_INSERT = """
INSERT INTO demo.curso_bd (nombre_completo, rol, tipo, seccion, sueldo_diario_mxn)
VALUES (:nombre_completo, :rol, :tipo,
        COALESCE(:seccion, 'BASES DE DATOS - 001'),
        :sueldo_diario_mxn)
RETURNING id, nombre_completo, rol, tipo, seccion, sueldo_diario_mxn, reclamar_bono,
          fecha_creacion, fecha_actualizacion
"""

SQL_DELETE = """
DELETE FROM demo.curso_bd WHERE id = :id RETURNING id
"""

SQL_RESET_ALL = """
UPDATE demo.curso_bd
SET reclamar_bono = FALSE
WHERE reclamar_bono = TRUE
RETURNING id
"""


# ---------------------------------------------------------------------
# 1. GET /api/v1/demo/estudiantes (público)
# ---------------------------------------------------------------------


@public_router.get(
    "/estudiantes",
    response_model=EstudiantesResponse,
    summary="Lista del curso ITAM Bases de Datos sección 001",
    description=(
        "Retorna las 12 personas del curso (1 profesor + 4 equipo + 7 estudiantes) "
        "con sueldo diario, tipo, y estado actual de `reclamar_bono`. "
        "Lectura pública sin auth. Orden: profesor → equipo (por sueldo desc) → "
        "estudiantes (por sueldo desc)."
    ),
)
@limiter.limit("60/minute")
async def list_estudiantes(request: Request) -> EstudiantesResponse:
    async with engine.connect() as conn:
        rows = (await conn.execute(text(SQL_LIST))).mappings().all()
    if not rows:
        raise HTTPException(status_code=500, detail="demo.curso_bd vacía")
    seccion = rows[0]["seccion"]
    return EstudiantesResponse(
        count=len(rows),
        estudiantes=[EstudianteRow(**dict(r)) for r in rows],
        seccion=seccion,
    )


# ---------------------------------------------------------------------
# 2. GET /api/v1/demo/estudiantes/{id} (público)
# ---------------------------------------------------------------------


@public_router.get(
    "/estudiantes/{id}",
    response_model=EstudianteRow,
    summary="Detalle de una persona del curso",
)
@limiter.limit("120/minute")
async def get_estudiante(request: Request, id: int) -> EstudianteRow:
    async with engine.connect() as conn:
        row = (await conn.execute(text(SQL_GET_ONE), {"id": id})).mappings().one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"id={id} no encontrado")
    return EstudianteRow(**dict(row))


# ---------------------------------------------------------------------
# 3. GET /api/v1/demo/resumen (público) — KPIs agregados para el dashboard
# ---------------------------------------------------------------------


@public_router.get(
    "/resumen",
    response_model=ResumenResponse,
    summary="Agregados para la KPI bar del dashboard /demo",
    description=(
        "Totales en una sola llamada: empleados, bonos reclamados, monto distribuido "
        "(N × $50,000 MXN), monto disponible (resto del pool), monto total posible "
        "(12 × $50,000 = $600,000 MXN), y nómina diaria total."
    ),
)
@limiter.limit("60/minute")
async def get_resumen(request: Request) -> ResumenResponse:
    async with engine.connect() as conn:
        row = (await conn.execute(text(SQL_RESUMEN))).mappings().one()
    total = int(row["total_empleados"])
    bonos = int(row["bonos_reclamados"])
    return ResumenResponse(
        total_empleados=total,
        bonos_reclamados=bonos,
        bono_unitario_mxn=BONO_MXN,
        monto_distribuido_mxn=bonos * BONO_MXN,
        monto_disponible_mxn=(total - bonos) * BONO_MXN,
        monto_total_posible_mxn=total * BONO_MXN,
        nomina_diaria_total_mxn=Decimal(row["nomina_diaria_total_mxn"]),
        fecha=datetime.utcnow(),
    )


# ---------------------------------------------------------------------
# 4. PUT /api/v1/demo/estudiantes/{id}/toggle-bono (auth: require_demo_user)
# ---------------------------------------------------------------------


@public_router.put(
    "/estudiantes/{id}/toggle-bono",
    response_model=ToggleBonoResponse,
    summary="Toggle del campo reclamar_bono (requiere login)",
    description=(
        "Invierte el booleano `reclamar_bono` de la fila indicada. Cualquier "
        "usuario autenticado puede tocar cualquier fila — la cuenta `DemoAbril` "
        "es compartida durante la demo en vivo. Para auditoría se retorna "
        "`actor_username`. El monto del bono es flat $50,000 MXN."
    ),
)
@limiter.limit("30/minute")
async def toggle_bono(
    request: Request,
    id: int,
    user: User = Depends(require_demo_user),
) -> ToggleBonoResponse:
    async with engine.connect() as conn:
        result = await conn.execute(text(SQL_TOGGLE_BONO), {"id": id})
        row = result.mappings().one_or_none()
        if row is None:
            raise HTTPException(status_code=404, detail=f"id={id} no encontrado")
        await conn.commit()
    return ToggleBonoResponse(
        id=row["id"],
        nombre_completo=row["nombre_completo"],
        reclamar_bono=row["reclamar_bono"],
        fecha_actualizacion=row["fecha_actualizacion"],
        actor_username=user.username,
    )


# ---------------------------------------------------------------------
# 5. POST /api/v1/admin/demo/estudiantes (admin)
# ---------------------------------------------------------------------


@admin_router.post(
    "/estudiantes",
    response_model=EstudianteRow,
    status_code=201,
    summary="Crear un nuevo registro en demo.curso_bd (admin)",
)
@limiter.limit("20/minute")
async def crear_estudiante(
    request: Request,
    payload: CrearEstudianteRequest,
    _admin: User = Depends(require_admin),
) -> EstudianteRow:
    async with engine.connect() as conn:
        try:
            row = (await conn.execute(
                text(SQL_INSERT),
                {
                    "nombre_completo": payload.nombre_completo,
                    "rol": payload.rol,
                    "tipo": payload.tipo,
                    "seccion": payload.seccion,
                    "sueldo_diario_mxn": payload.sueldo_diario_mxn,
                },
            )).mappings().one()
            await conn.commit()
        except Exception as exc:
            # UNIQUE violation on nombre_completo, etc.
            if "curso_bd_nombre_unq" in str(exc):
                raise HTTPException(status_code=409, detail="nombre_completo ya existe")
            raise
    return EstudianteRow(**dict(row))


# ---------------------------------------------------------------------
# 6. PUT /api/v1/admin/demo/estudiantes/{id} (admin)
# ---------------------------------------------------------------------


@admin_router.put(
    "/estudiantes/{id}",
    response_model=EstudianteRow,
    summary="Editar campos de un registro (admin)",
    description="Edición parcial: solo los campos enviados se modifican.",
)
@limiter.limit("20/minute")
async def editar_estudiante(
    request: Request,
    id: int,
    payload: EditarEstudianteRequest,
    _admin: User = Depends(require_admin),
) -> EstudianteRow:
    updates: dict[str, object] = {
        k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None
    }
    if not updates:
        raise HTTPException(status_code=422, detail="ningún campo enviado")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    sql = (
        f"UPDATE demo.curso_bd SET {set_clause} WHERE id = :id "
        "RETURNING id, nombre_completo, rol, tipo, seccion, sueldo_diario_mxn, "
        "reclamar_bono, fecha_creacion, fecha_actualizacion"
    )
    params: dict[str, object] = {**updates, "id": id}

    async with engine.connect() as conn:
        result = await conn.execute(text(sql), params)
        row = result.mappings().one_or_none()
        if row is None:
            raise HTTPException(status_code=404, detail=f"id={id} no encontrado")
        await conn.commit()
    return EstudianteRow(**dict(row))


# ---------------------------------------------------------------------
# 7. DELETE /api/v1/admin/demo/estudiantes/{id} (admin)
# ---------------------------------------------------------------------


@admin_router.delete(
    "/estudiantes/{id}",
    response_model=DeleteEstudianteResponse,
    summary="Borrar un registro (admin)",
)
@limiter.limit("20/minute")
async def borrar_estudiante(
    request: Request,
    id: int,
    _admin: User = Depends(require_admin),
) -> DeleteEstudianteResponse:
    async with engine.connect() as conn:
        result = await conn.execute(text(SQL_DELETE), {"id": id})
        row = result.mappings().one_or_none()
        if row is None:
            raise HTTPException(status_code=404, detail=f"id={id} no encontrado")
        await conn.commit()
    return DeleteEstudianteResponse(id=row["id"], deleted=True)


# ---------------------------------------------------------------------
# 8. POST /api/v1/admin/demo/reset (admin) — limpia todos los toggles
# ---------------------------------------------------------------------


@admin_router.post(
    "/reset",
    response_model=ResetResponse,
    summary="Resetear todos los reclamar_bono a FALSE (admin)",
    description=(
        "Útil para repetir la demo si alguien tocó filas antes de tiempo. "
        "Solo afecta filas con reclamar_bono=TRUE."
    ),
)
@limiter.limit("10/minute")
async def reset_bonos(
    request: Request,
    _admin: User = Depends(require_admin),
) -> ResetResponse:
    async with engine.connect() as conn:
        result = await conn.execute(text(SQL_RESET_ALL))
        rows = result.mappings().all()
        await conn.commit()
    return ResetResponse(filas_reseteadas=len(rows), fecha=datetime.utcnow())
