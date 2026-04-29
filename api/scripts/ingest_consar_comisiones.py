#!/usr/bin/env python3
"""
Ingesta CONSAR comisiones mensuales por AFORE al schema `consar`.

Fuente: datos.gob.mx CONSAR (CC-BY-4.0)
  https://repodatos.atdt.gob.mx/api_update/consar/comisiones/datosgob_06_comisiones.csv
  MD5 referencia: 9a0051e07211b08fbd7105d4454bd558
  Shape: 2,080 filas × 3 cols (fecha, afore, comision)
  Cobertura: 2008-03-01 → 2025-06-01 (~208 meses × 10 AFOREs)

Transformación:
  Formato angosto, sin pivot. Drop de filas con comision NULL/empty
  (sentinels — no aportan información).
  Esperado: 2,071 filas en consar.comisiones (2,080 - 9 empty cells)

Pension Bienestar (FPB9) NO reporta comisión: régimen administrativo
diferenciado. Hence solo 10 de las 11 afores aparecen en este fact.

Representación:
  comision = porcentaje anual sobre saldo administrado (e.g. 1.96 = 1.96%)
  Rango histórico empírico [0.52, 3.30].

Uso:
  uv run python api/scripts/ingest_consar_comisiones.py --db local
  uv run python api/scripts/ingest_consar_comisiones.py --db neon
  uv run python api/scripts/ingest_consar_comisiones.py --db both
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import os
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Tuple

import asyncpg

# ---------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------

CSV_PATH = Path(
    "/Users/davicho/datos-itam/Proyecto-Final-main/normalizacion/dataset_3/data/raw/datosgob_06_comisiones.csv"
)
EXPECTED_MD5 = "9a0051e07211b08fbd7105d4454bd558"
EXPECTED_RAW_ROWS = 2_080
EXPECTED_INGESTED_ROWS = 2_071  # 2080 - 9 empty cells
EXPECTED_AFORES_REPORTING = 10  # Pension Bienestar excluida (régimen diferenciado)
EXPECTED_AFORES_CATALOG = 11    # consar.afores tiene las 11 (sanity check)


# ---------------------------------------------------------------------
# CSV parsing
# ---------------------------------------------------------------------


def verify_md5(path: Path, expected: str) -> None:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    actual = h.hexdigest()
    if actual != expected:
        raise RuntimeError(
            f"MD5 mismatch en {path.name}: actual={actual} esperado={expected}"
        )
    print(f"✓ MD5 byte-exact: {actual}")


def parse_csv(path: Path) -> List[Tuple[str, str, Decimal]]:
    """Devuelve [(fecha, afore_csv, comision_decimal)]. Drop filas con comision empty."""
    out: List[Tuple[str, str, Decimal]] = []
    raw_rows = 0
    empty_rows = 0
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise RuntimeError("CSV vacío o sin header")
        expected_cols = {"fecha", "afore", "comision"}
        if set(reader.fieldnames) != expected_cols:
            raise RuntimeError(
                f"Columnas inesperadas: {reader.fieldnames} (esperadas: {expected_cols})"
            )
        for row in reader:
            raw_rows += 1
            fecha = row["fecha"].strip()
            afore = row["afore"].strip()
            comision_str = row["comision"].strip()
            if comision_str == "":
                empty_rows += 1
                continue
            out.append((fecha, afore, Decimal(comision_str)))
    if raw_rows != EXPECTED_RAW_ROWS:
        raise RuntimeError(
            f"Filas raw CSV: {raw_rows}, esperaba {EXPECTED_RAW_ROWS}"
        )
    if len(out) != EXPECTED_INGESTED_ROWS:
        raise RuntimeError(
            f"Filas ingestables: {len(out)}, esperaba {EXPECTED_INGESTED_ROWS}"
        )
    print(
        f"✓ CSV parseado: {raw_rows} filas raw → {len(out)} ingestables "
        f"({empty_rows} empty/sentinel descartadas)"
    )
    return out


# ---------------------------------------------------------------------
# DB operations
# ---------------------------------------------------------------------


def _normalize_dsn(dsn: str) -> str:
    if dsn.startswith("postgresql+asyncpg://"):
        dsn = "postgresql://" + dsn[len("postgresql+asyncpg://"):]
    if "?" in dsn:
        dsn, _, _ = dsn.partition("?")
    return dsn


async def connect(dsn: str) -> asyncpg.Connection:
    clean = _normalize_dsn(dsn)
    is_neon = "neon.tech" in clean
    kwargs: Dict = {"statement_cache_size": 0 if is_neon else 100}
    if is_neon:
        kwargs["ssl"] = "require"
    return await asyncpg.connect(clean, **kwargs)


async def load_afore_lookup(conn: asyncpg.Connection) -> Dict[str, int]:
    rows = await conn.fetch("SELECT id, nombre_csv FROM consar.afores")
    afores = {r["nombre_csv"]: r["id"] for r in rows}
    if len(afores) != EXPECTED_AFORES_CATALOG:
        raise RuntimeError(
            f"consar.afores tiene {len(afores)}, esperaba {EXPECTED_AFORES_CATALOG}"
        )
    return afores


async def ingest(conn: asyncpg.Connection, label: str) -> None:
    print(f"\n{'=' * 60}\n[{label}] Ingesta CONSAR comisiones (#06)\n{'=' * 60}")

    # 1) Parse CSV
    rows = parse_csv(CSV_PATH)

    # 2) Resolve FKs
    afores_lookup = await load_afore_lookup(conn)
    records: List[Tuple] = []
    afores_seen: set = set()
    for fecha, afore_csv, comision in rows:
        afore_id = afores_lookup.get(afore_csv)
        if afore_id is None:
            raise RuntimeError(f"AFORE no en catálogo: {afore_csv!r}")
        afores_seen.add(afore_csv)
        records.append((date.fromisoformat(fecha), afore_id, comision))

    if len(afores_seen) != EXPECTED_AFORES_REPORTING:
        raise RuntimeError(
            f"AFOREs reportando: {len(afores_seen)}, esperaba "
            f"{EXPECTED_AFORES_REPORTING} (Pensión Bienestar excluida)"
        )
    print(f"✓ FKs resueltas. {len(afores_seen)} afores reportan comisión.")

    # 3) TRUNCATE + COPY
    async with conn.transaction():
        await conn.execute("TRUNCATE TABLE consar.comisiones")
        await conn.copy_records_to_table(
            "comisiones",
            schema_name="consar",
            columns=("fecha", "afore_id", "comision"),
            records=records,
        )

    await verify(conn, label)


async def verify(conn: asyncpg.Connection, label: str) -> None:
    print(f"\n[{label}] Verificaciones post-load:")

    n = await conn.fetchval("SELECT COUNT(*) FROM consar.comisiones")
    print(f"  COUNT(*): {n}")
    if n != EXPECTED_INGESTED_ROWS:
        raise RuntimeError(f"COUNT esperado {EXPECTED_INGESTED_ROWS}, real {n}")

    afores_n = await conn.fetchval(
        "SELECT COUNT(DISTINCT afore_id) FROM consar.comisiones"
    )
    print(f"  AFOREs distintas: {afores_n}")
    if afores_n != EXPECTED_AFORES_REPORTING:
        raise RuntimeError(
            f"AFOREs reportando {afores_n}, esperaba {EXPECTED_AFORES_REPORTING}"
        )

    rng = await conn.fetchrow(
        "SELECT MIN(fecha) AS fmin, MAX(fecha) AS fmax,"
        " MIN(comision) AS cmin, MAX(comision) AS cmax,"
        " COUNT(DISTINCT fecha) AS meses"
        " FROM consar.comisiones"
    )
    print(
        f"  Rango fechas: {rng['fmin']} → {rng['fmax']} ({rng['meses']} meses)"
    )
    print(f"  Rango comisión: [{rng['cmin']}, {rng['cmax']}]")

    # Sample row inspect
    sample = await conn.fetch(
        "SELECT a.nombre_corto, c.fecha, c.comision"
        " FROM consar.comisiones c JOIN consar.afores a ON a.id = c.afore_id"
        " WHERE a.codigo = 'profuturo' ORDER BY c.fecha LIMIT 3"
    )
    print(f"  Sample profuturo (primeras 3): {[dict(r) for r in sample]}")

    print(f"✓ [{label}] OK")


# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------


def env_dsn(env_path: Path) -> str:
    if not env_path.exists():
        raise RuntimeError(f"No existe {env_path}")
    for line in env_path.read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError(f"No DATABASE_URL en {env_path}")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", choices=["local", "neon", "both"], required=True)
    args = parser.parse_args()

    api_dir = Path(__file__).resolve().parent.parent
    local_dsn = env_dsn(api_dir / ".env")
    neon_dsn = env_dsn(api_dir / ".env.neon")

    verify_md5(CSV_PATH, EXPECTED_MD5)

    targets: List[Tuple[str, str]] = []
    if args.db in ("local", "both"):
        targets.append(("LOCAL", local_dsn))
    if args.db in ("neon", "both"):
        targets.append(("NEON", neon_dsn))

    for label, dsn in targets:
        conn = await connect(dsn)
        try:
            await ingest(conn, label)
        finally:
            await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
