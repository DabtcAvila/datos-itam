#!/usr/bin/env python3
"""
Ingesta CONSAR traspasos de cuentas por AFORE al schema `consar`.

Fuente: datos.gob.mx CONSAR (CC-BY-4.0)
  https://repodatos.atdt.gob.mx/api_update/consar/...datosgob_08_traspasos.csv
  MD5 referencia: e796f110a35914647b199f6ed2e478e0
  Shape: 3,200 filas × 4 cols (fecha, afore, num_tras_cedido, num_tras_recibido)
  Cobertura: 1998-11-01 → 2025-06-01 (320 meses × 10 AFOREs)

NULLs preservados: 336 filas tienen ambas columnas NULL (afore listada en mes
pre-alta — informativo, no se descarta).

Identidad implícita: para cada fecha, Σ cedido = Σ recibido (cada traspaso
es 1 cedido + 1 recibido). Se verifica empíricamente post-load.

Uso:
  uv run python api/scripts/ingest_consar_traspaso.py --db local
  uv run python api/scripts/ingest_consar_traspaso.py --db neon
  uv run python api/scripts/ingest_consar_traspaso.py --db both
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
from typing import Dict, List, Optional, Tuple

import asyncpg

CSV_PATH = Path(
    "/Users/davicho/datos-itam/Proyecto-Final-main/normalizacion/dataset_3/data/raw/datosgob_08_traspasos.csv"
)
EXPECTED_MD5 = "e796f110a35914647b199f6ed2e478e0"
EXPECTED_RAW_ROWS = 3_200
EXPECTED_INGESTED_ROWS = 3_200  # NULLs preservados
EXPECTED_AFORES_REPORTING = 10
EXPECTED_AFORES_CATALOG = 11
EXPECTED_BOTH_NULL_ROWS = 336  # afores en mes pre-alta


def verify_md5(path: Path, expected: str) -> None:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    actual = h.hexdigest()
    if actual != expected:
        raise RuntimeError(f"MD5 mismatch en {path.name}: actual={actual} esperado={expected}")
    print(f"✓ MD5 byte-exact: {actual}")


def parse_csv(path: Path) -> List[Tuple[str, str, Optional[int], Optional[int]]]:
    out: List[Tuple[str, str, Optional[int], Optional[int]]] = []
    raw_rows = 0
    both_null = 0
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise RuntimeError("CSV vacío o sin header")
        expected = {"fecha", "afore", "num_tras_cedido", "num_tras_recibido"}
        if set(reader.fieldnames) != expected:
            raise RuntimeError(f"Columnas inesperadas: {reader.fieldnames}")
        for row in reader:
            raw_rows += 1
            fecha = row["fecha"].strip()
            afore = row["afore"].strip()
            ced_raw = row["num_tras_cedido"].strip()
            rec_raw = row["num_tras_recibido"].strip()
            ced = int(Decimal(ced_raw)) if ced_raw else None
            rec = int(Decimal(rec_raw)) if rec_raw else None
            if ced is None and rec is None:
                both_null += 1
            out.append((fecha, afore, ced, rec))
    if raw_rows != EXPECTED_RAW_ROWS:
        raise RuntimeError(f"Filas raw CSV: {raw_rows}, esperaba {EXPECTED_RAW_ROWS}")
    if both_null != EXPECTED_BOTH_NULL_ROWS:
        raise RuntimeError(
            f"Filas con ambas NULL: {both_null}, esperaba {EXPECTED_BOTH_NULL_ROWS}"
        )
    print(f"✓ CSV parseado: {raw_rows} filas (de las cuales {both_null} con ambas NULL preservadas)")
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
    print(f"\n{'=' * 60}\n[{label}] Ingesta CONSAR traspaso (#08)\n{'=' * 60}")

    rows = parse_csv(CSV_PATH)
    afores_lookup = await load_afore_lookup(conn)
    records: List[Tuple] = []
    afores_seen: set = set()
    for fecha, afore_csv, ced, rec in rows:
        afore_id = afores_lookup.get(afore_csv)
        if afore_id is None:
            raise RuntimeError(f"AFORE no en catálogo: {afore_csv!r}")
        afores_seen.add(afore_csv)
        records.append((date.fromisoformat(fecha), afore_id, ced, rec))

    if len(afores_seen) != EXPECTED_AFORES_REPORTING:
        raise RuntimeError(
            f"AFOREs reportando: {len(afores_seen)}, esperaba {EXPECTED_AFORES_REPORTING}"
        )
    print(f"✓ FKs resueltas. {len(afores_seen)} afores.")

    async with conn.transaction():
        await conn.execute("TRUNCATE TABLE consar.traspaso")
        await conn.copy_records_to_table(
            "traspaso",
            schema_name="consar",
            columns=("fecha", "afore_id", "num_tras_cedido", "num_tras_recibido"),
            records=records,
        )

    await verify(conn, label)


async def verify(conn: asyncpg.Connection, label: str) -> None:
    print(f"\n[{label}] Verificaciones post-load:")
    n = await conn.fetchval("SELECT COUNT(*) FROM consar.traspaso")
    print(f"  COUNT(*): {n}")
    if n != EXPECTED_INGESTED_ROWS:
        raise RuntimeError(f"COUNT esperado {EXPECTED_INGESTED_ROWS}, real {n}")

    nn = await conn.fetchval(
        "SELECT COUNT(*) FROM consar.traspaso "
        "WHERE num_tras_cedido IS NULL AND num_tras_recibido IS NULL"
    )
    print(f"  Filas con ambas NULL: {nn}")
    if nn != EXPECTED_BOTH_NULL_ROWS:
        raise RuntimeError(f"NULLs esperados {EXPECTED_BOTH_NULL_ROWS}, real {nn}")

    afores_n = await conn.fetchval("SELECT COUNT(DISTINCT afore_id) FROM consar.traspaso")
    print(f"  AFOREs distintas: {afores_n}")

    rng = await conn.fetchrow(
        "SELECT MIN(fecha) AS fmin, MAX(fecha) AS fmax,"
        " MIN(num_tras_cedido) AS cmin, MAX(num_tras_cedido) AS cmax,"
        " MIN(num_tras_recibido) AS rmin, MAX(num_tras_recibido) AS rmax,"
        " COUNT(DISTINCT fecha) AS meses"
        " FROM consar.traspaso"
    )
    print(f"  Rango fechas: {rng['fmin']} → {rng['fmax']} ({rng['meses']} meses)")
    print(f"  Cedidos range: [{rng['cmin']}, {rng['cmax']}]")
    print(f"  Recibidos range: [{rng['rmin']}, {rng['rmax']}]")

    # Verificación identidad implícita Σcedido = Σrecibido por mes
    print(f"\n[{label}] Identidad mensual Σcedido = Σrecibido:")
    rows = await conn.fetch(
        "SELECT fecha,"
        " COALESCE(SUM(num_tras_cedido),0)   AS sum_ced,"
        " COALESCE(SUM(num_tras_recibido),0) AS sum_rec,"
        " COALESCE(SUM(num_tras_cedido),0) - COALESCE(SUM(num_tras_recibido),0) AS delta"
        " FROM consar.traspaso GROUP BY fecha ORDER BY fecha"
    )
    n_total = len(rows)
    n_cierre = sum(1 for r in rows if r["delta"] == 0)
    n_ambos_cero = sum(1 for r in rows if r["sum_ced"] == 0 and r["sum_rec"] == 0)
    n_real = n_total - n_ambos_cero
    print(f"  Meses totales: {n_total}")
    print(f"  Meses con datos (ambas suma > 0): {n_real}")
    print(f"  Meses Σced == Σrec: {n_cierre}/{n_total}")
    if n_real > 0:
        max_delta_row = max(rows, key=lambda r: abs(r["delta"]))
        print(
            f"  Max |delta| observado: {abs(max_delta_row['delta'])} en {max_delta_row['fecha']}"
            f" (ced={max_delta_row['sum_ced']}, rec={max_delta_row['sum_rec']})"
        )
        violators = [(r['fecha'], r['delta']) for r in rows if r['delta'] != 0]
        if violators:
            print(f"  Meses con delta!=0: {len(violators)}; primeras 5: {violators[:5]}")
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
