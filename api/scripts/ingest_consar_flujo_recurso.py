#!/usr/bin/env python3
"""
Ingesta CONSAR flujo de recursos mensuales por AFORE al schema `consar`.

Fuente: datos.gob.mx CONSAR (CC-BY-4.0)
  https://repodatos.atdt.gob.mx/api_update/consar/...datosgob_04_entradas_salidas.csv
  MD5 referencia: 1100022826c117e0f10f7794f34b0e04
  Shape: 1,980 filas × 4 cols (fecha, afore, montos_entradas, montos_salidas)
  Cobertura: 2009-01-01 → 2025-06-01 (198 meses × 10 AFOREs, rectangular sin
             celdas empty)

Pension Bienestar (FPB9) NO reporta este dataset: régimen administrativo
diferenciado.

Uso:
  uv run python api/scripts/ingest_consar_flujo_recurso.py --db local
  uv run python api/scripts/ingest_consar_flujo_recurso.py --db neon
  uv run python api/scripts/ingest_consar_flujo_recurso.py --db both

  # Override DSN (e.g. cuando .env apunta a Neon pero quieres local):
  DSN_OVERRIDE='postgresql://...' uv run python api/scripts/ingest_consar_flujo_recurso.py --db override
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import os
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Tuple

import asyncpg

CSV_PATH = Path(
    "/Users/davicho/datos-itam/Proyecto-Final-main/normalizacion/dataset_3/data/raw/datosgob_04_entradas_salidas.csv"
)
EXPECTED_MD5 = "1100022826c117e0f10f7794f34b0e04"
EXPECTED_RAW_ROWS = 1_980
EXPECTED_INGESTED_ROWS = 1_980  # rectangular, no drops
EXPECTED_AFORES_REPORTING = 10
EXPECTED_AFORES_CATALOG = 11


def verify_md5(path: Path, expected: str) -> None:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    actual = h.hexdigest()
    if actual != expected:
        raise RuntimeError(f"MD5 mismatch en {path.name}: actual={actual} esperado={expected}")
    print(f"✓ MD5 byte-exact: {actual}")


def parse_csv(path: Path) -> List[Tuple[str, str, Decimal, Decimal]]:
    out: List[Tuple[str, str, Decimal, Decimal]] = []
    raw_rows = 0
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise RuntimeError("CSV vacío o sin header")
        expected = {"fecha", "afore", "montos_entradas", "montos_salidas"}
        if set(reader.fieldnames) != expected:
            raise RuntimeError(f"Columnas inesperadas: {reader.fieldnames}")
        for row in reader:
            raw_rows += 1
            fecha = row["fecha"].strip()
            afore = row["afore"].strip()
            entradas = row["montos_entradas"].strip()
            salidas = row["montos_salidas"].strip()
            if entradas == "" or salidas == "":
                raise RuntimeError(
                    f"Celda empty inesperada en row {raw_rows}: {row} (CSV debe ser rectangular sin drops)"
                )
            out.append((fecha, afore, Decimal(entradas), Decimal(salidas)))
    if raw_rows != EXPECTED_RAW_ROWS:
        raise RuntimeError(f"Filas raw CSV: {raw_rows}, esperaba {EXPECTED_RAW_ROWS}")
    print(f"✓ CSV parseado: {raw_rows} filas (rectangular, sin drops)")
    return out


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
        raise RuntimeError(f"consar.afores tiene {len(afores)}, esperaba {EXPECTED_AFORES_CATALOG}")
    return afores


async def ingest(conn: asyncpg.Connection, label: str) -> None:
    print(f"\n{'=' * 60}\n[{label}] Ingesta CONSAR flujo_recurso (#04)\n{'=' * 60}")

    rows = parse_csv(CSV_PATH)
    afores_lookup = await load_afore_lookup(conn)
    records: List[Tuple] = []
    afores_seen: set = set()
    for fecha, afore_csv, entradas, salidas in rows:
        afore_id = afores_lookup.get(afore_csv)
        if afore_id is None:
            raise RuntimeError(f"AFORE no en catálogo: {afore_csv!r}")
        afores_seen.add(afore_csv)
        records.append((date.fromisoformat(fecha), afore_id, entradas, salidas))

    if len(afores_seen) != EXPECTED_AFORES_REPORTING:
        raise RuntimeError(
            f"AFOREs reportando: {len(afores_seen)}, esperaba {EXPECTED_AFORES_REPORTING}"
        )
    print(f"✓ FKs resueltas. {len(afores_seen)} afores reportan flujos.")

    async with conn.transaction():
        await conn.execute("TRUNCATE TABLE consar.flujo_recurso")
        await conn.copy_records_to_table(
            "flujo_recurso",
            schema_name="consar",
            columns=("fecha", "afore_id", "montos_entradas", "montos_salidas"),
            records=records,
        )

    await verify(conn, label)


async def verify(conn: asyncpg.Connection, label: str) -> None:
    print(f"\n[{label}] Verificaciones post-load:")
    n = await conn.fetchval("SELECT COUNT(*) FROM consar.flujo_recurso")
    print(f"  COUNT(*): {n}")
    if n != EXPECTED_INGESTED_ROWS:
        raise RuntimeError(f"COUNT esperado {EXPECTED_INGESTED_ROWS}, real {n}")

    afores_n = await conn.fetchval("SELECT COUNT(DISTINCT afore_id) FROM consar.flujo_recurso")
    print(f"  AFOREs distintas: {afores_n}")
    if afores_n != EXPECTED_AFORES_REPORTING:
        raise RuntimeError(f"AFOREs reportando {afores_n}, esperaba {EXPECTED_AFORES_REPORTING}")

    rng = await conn.fetchrow(
        "SELECT MIN(fecha) AS fmin, MAX(fecha) AS fmax,"
        " MIN(montos_entradas) AS emin, MAX(montos_entradas) AS emax,"
        " MIN(montos_salidas) AS smin, MAX(montos_salidas) AS smax,"
        " COUNT(DISTINCT fecha) AS meses"
        " FROM consar.flujo_recurso"
    )
    print(f"  Rango fechas: {rng['fmin']} → {rng['fmax']} ({rng['meses']} meses)")
    print(f"  Entradas range: [{rng['emin']}, {rng['emax']}] mm MXN")
    print(f"  Salidas range:  [{rng['smin']}, {rng['smax']}] mm MXN")

    sample = await conn.fetch(
        "SELECT a.nombre_corto, f.fecha, f.montos_entradas, f.montos_salidas"
        " FROM consar.flujo_recurso f JOIN consar.afores a ON a.id = f.afore_id"
        " WHERE a.codigo = 'xxi_banorte' ORDER BY f.fecha DESC LIMIT 3"
    )
    print(f"  Sample xxi_banorte (last 3): {[dict(r) for r in sample]}")
    print(f"✓ [{label}] OK")


def env_dsn(env_path: Path) -> str:
    if not env_path.exists():
        raise RuntimeError(f"No existe {env_path}")
    for line in env_path.read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError(f"No DATABASE_URL en {env_path}")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", choices=["local", "neon", "both", "override"], required=True)
    args = parser.parse_args()

    api_dir = Path(__file__).resolve().parent.parent

    verify_md5(CSV_PATH, EXPECTED_MD5)

    targets: List[Tuple[str, str]] = []
    if args.db == "override":
        dsn = os.environ.get("DSN_OVERRIDE")
        if not dsn:
            raise RuntimeError("--db override requires DSN_OVERRIDE env var")
        label = "OVERRIDE-NEON" if "neon.tech" in dsn else "OVERRIDE-LOCAL"
        targets.append((label, dsn))
    else:
        if args.db in ("local", "both"):
            targets.append(("LOCAL", env_dsn(api_dir / ".env.local") if (api_dir / ".env.local").exists() else
                            "postgresql://datos_public:datos_public_2026@localhost:54322/remuneraciones_cdmx"))
        if args.db in ("neon", "both"):
            targets.append(("NEON", env_dsn(api_dir / ".env.neon")))

    for label, dsn in targets:
        conn = await connect(dsn)
        try:
            await ingest(conn, label)
        finally:
            await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
