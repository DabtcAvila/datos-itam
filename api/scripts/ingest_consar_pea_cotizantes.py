#!/usr/bin/env python3
"""
Ingesta CONSAR PEA vs cotizantes (serie anual macro nacional).

Fuente: datos.gob.mx CONSAR (CC-BY-4.0)
  File: datosgob_02_pea_vs_cotizantes_datos_abiertos_2024.csv
  MD5: 7744934484033bd6ded53d8bc8c4c424
  Shape: 15 filas × 4 cols (anio, cotizantes, pea, porcentaje_pea_afore)
  Cobertura: 2010 → 2024

Sin dimensión AFORE (serie macro). Sin catálogos derivados.

Uso:
  uv run python api/scripts/ingest_consar_pea_cotizantes.py --db local
  uv run python api/scripts/ingest_consar_pea_cotizantes.py --db neon
  uv run python api/scripts/ingest_consar_pea_cotizantes.py --db both
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Tuple

import asyncpg

CSV_PATH = Path(
    "/Users/davicho/datos-itam/Proyecto-Final-main/normalizacion/dataset_3/data/raw/datosgob_02_pea_vs_cotizantes_datos_abiertos_2024.csv"
)
EXPECTED_MD5 = "7744934484033bd6ded53d8bc8c4c424"
EXPECTED_RAW_ROWS = 15
EXPECTED_INGESTED_ROWS = 15
EXPECTED_ANIO_MIN = 2010
EXPECTED_ANIO_MAX = 2024


def verify_md5(path: Path, expected: str) -> None:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    actual = h.hexdigest()
    if actual != expected:
        raise RuntimeError(f"MD5 mismatch en {path.name}: actual={actual} esperado={expected}")
    print(f"✓ MD5 byte-exact: {actual}")


def parse_csv(path: Path) -> List[Tuple[int, int, int, Decimal]]:
    out: List[Tuple[int, int, int, Decimal]] = []
    raw_rows = 0
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise RuntimeError("CSV vacío o sin header")
        expected = {"anio", "cotizantes", "pea", "porcentaje_pea_afore"}
        if set(reader.fieldnames) != expected:
            raise RuntimeError(f"Columnas inesperadas: {reader.fieldnames}")
        for row in reader:
            raw_rows += 1
            anio = int(row["anio"].strip())
            cotizantes = int(row["cotizantes"].strip())
            pea = int(row["pea"].strip())
            pct = Decimal(row["porcentaje_pea_afore"].strip())
            if cotizantes > pea:
                raise RuntimeError(
                    f"Invariante violado en anio={anio}: cotizantes={cotizantes} > pea={pea}"
                )
            out.append((anio, cotizantes, pea, pct))
    if raw_rows != EXPECTED_RAW_ROWS:
        raise RuntimeError(f"Filas raw CSV: {raw_rows}, esperaba {EXPECTED_RAW_ROWS}")
    print(f"✓ CSV parseado: {raw_rows} filas (invariante cotizantes <= pea cumplido)")
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


async def ingest(conn: asyncpg.Connection, label: str) -> None:
    print(f"\n{'=' * 60}\n[{label}] Ingesta CONSAR pea_cotizantes (#02)\n{'=' * 60}")
    rows = parse_csv(CSV_PATH)
    async with conn.transaction():
        await conn.execute("TRUNCATE TABLE consar.pea_cotizantes")
        await conn.copy_records_to_table(
            "pea_cotizantes",
            schema_name="consar",
            columns=("anio", "cotizantes", "pea", "porcentaje_pea_afore"),
            records=rows,
        )
    await verify(conn, label)


async def verify(conn: asyncpg.Connection, label: str) -> None:
    print(f"\n[{label}] Verificaciones post-load:")
    n = await conn.fetchval("SELECT COUNT(*) FROM consar.pea_cotizantes")
    print(f"  COUNT(*): {n}")
    if n != EXPECTED_INGESTED_ROWS:
        raise RuntimeError(f"COUNT esperado {EXPECTED_INGESTED_ROWS}, real {n}")

    rng = await conn.fetchrow(
        "SELECT MIN(anio) AS amin, MAX(anio) AS amax,"
        " MIN(cotizantes) AS cmin, MAX(cotizantes) AS cmax,"
        " MIN(pea) AS pmin, MAX(pea) AS pmax,"
        " MIN(porcentaje_pea_afore) AS pctmin, MAX(porcentaje_pea_afore) AS pctmax"
        " FROM consar.pea_cotizantes"
    )
    print(f"  Rango años: {rng['amin']} → {rng['amax']}")
    print(f"  Cotizantes: [{rng['cmin']:,}, {rng['cmax']:,}]")
    print(f"  PEA:        [{rng['pmin']:,}, {rng['pmax']:,}]")
    print(f"  Cobertura % range: [{rng['pctmin']}, {rng['pctmax']}]")

    if rng["amin"] != EXPECTED_ANIO_MIN or rng["amax"] != EXPECTED_ANIO_MAX:
        raise RuntimeError(
            f"Cobertura años {rng['amin']}-{rng['amax']}, esperaba "
            f"{EXPECTED_ANIO_MIN}-{EXPECTED_ANIO_MAX}"
        )

    sample = await conn.fetch(
        "SELECT anio, cotizantes, pea, porcentaje_pea_afore"
        " FROM consar.pea_cotizantes ORDER BY anio LIMIT 1"
    )
    sample_last = await conn.fetch(
        "SELECT anio, cotizantes, pea, porcentaje_pea_afore"
        " FROM consar.pea_cotizantes ORDER BY anio DESC LIMIT 1"
    )
    print(f"  Primer año: {dict(sample[0])}")
    print(f"  Último año: {dict(sample_last[0])}")
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
    parser.add_argument("--db", choices=["local", "neon", "both"], required=True)
    args = parser.parse_args()

    api_dir = Path(__file__).resolve().parent.parent
    verify_md5(CSV_PATH, EXPECTED_MD5)

    targets: List[Tuple[str, str]] = []
    if args.db in ("local", "both"):
        targets.append((
            "LOCAL",
            env_dsn(api_dir / ".env.local") if (api_dir / ".env.local").exists()
            else "postgresql://datos_public:datos_public_2026@localhost:54322/remuneraciones_cdmx",
        ))
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
