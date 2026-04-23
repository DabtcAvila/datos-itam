#!/usr/bin/env python3
"""
Ingesta CONSAR recursos mensuales AFORE al schema `consar`.

Fuente: datos.gob.mx CONSAR (CC-BY-4.0)
  https://repodatos.atdt.gob.mx/api_update/consar/monto_recursos_registrados_afore/09_recursos.csv
  MD5 referencia: 19083c9a46d9d958b1428056c2f5f0b1
  Shape: 3,586 filas × 17 cols (fecha + afore + 15 montos)
  Cobertura: 1998-05-01 → 2025-06-01 (326 meses × 11 AFOREs)

Transformación:
  Ancho (15 cols de monto) → largo (tipo_recurso_id, monto_mxn_mm)
  Drop de celdas NULL (no aportan información)
  Esperado: 35,617 filas en consar.recursos_mensuales

Identidades verificadas en CSV:
  vivienda = infonavit + fovissste                           (±0.01 MXN)
  ahorro_vol_y_sol = voluntario + solidario                  (±0.01 MXN)
  sar_total = 8 componentes (rcv_imss + rcv_issste + bono +
              vivienda + vol_sol + capital + banxico +
              fondos_prevision_social)                       (98.83% al peso,
                                                              100% en 2020+,
                                                              residue XXI-Banorte
                                                              2010-2012)

Uso:
  uv run python api/scripts/ingest_consar_recursos.py --db local
  uv run python api/scripts/ingest_consar_recursos.py --db neon
  uv run python api/scripts/ingest_consar_recursos.py --db both
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
from typing import Dict, List, Optional, Tuple

import asyncpg

# ---------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------

CSV_PATH = Path("/Users/davicho/datos-itam/datos-itam/datosgob_09_recursos.csv")
EXPECTED_MD5 = "19083c9a46d9d958b1428056c2f5f0b1"
EXPECTED_RAW_ROWS = 3_586
EXPECTED_LONG_ROWS = 35_617
EXPECTED_AFORES = 11
EXPECTED_MONTHS = 326
EXPECTED_TIPOS = 15

# Columnas de monto en el CSV → código snake_case en consar.tipos_recurso.codigo
# Orden preservado del CSV para melt determinista.
CSV_COLUMN_TO_TIPO_CODIGO: Dict[str, str] = {
    "monto_ahorro solidario":                           "ahorro_solidario",
    "monto_ahorro voluntario":                          "ahorro_voluntario",
    "monto_ahorro voluntario y solidario":              "ahorro_voluntario_y_solidario",
    "monto_bono de pension issste":                     "bono_pension_issste",
    "monto_capital de las afores":                      "capital_afores",
    "monto_fondos de prevision social":                 "fondos_prevision_social",
    "monto_fovissste":                                  "fovissste",
    "monto_infonavit":                                  "infonavit",
    "monto_rcv - imss":                                 "rcv_imss",
    "monto_rcv - issste":                               "rcv_issste",
    "monto_recursos administrados por las afores":      "recursos_administrados",
    "monto_recursos de los trabajadores":               "recursos_trabajadores",
    "monto_recursos depositados en banco de méxico":    "banxico",
    "monto_recursos registrados en el sar":             "sar_total",
    "monto_vivienda":                                   "vivienda",
}


# ---------------------------------------------------------------------
# CSV validation + streaming
# ---------------------------------------------------------------------


def validate_md5(path: Path) -> None:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    actual = h.hexdigest()
    if actual != EXPECTED_MD5:
        raise RuntimeError(
            f"MD5 mismatch: expected {EXPECTED_MD5}, got {actual}"
        )
    print(f"✓ MD5 CSV: {actual}")


def melt_csv(path: Path) -> List[Tuple[str, str, str, Decimal]]:
    """Lee CSV ancho (17 cols) y devuelve lista de tuplas largas:
       (fecha, afore_csv_name, tipo_codigo, monto).
    Filas NULL se descartan.
    """
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames
        if header is None:
            raise RuntimeError("CSV vacío o sin header")
        # Validar que todas las columnas de monto esperadas están presentes
        missing = set(CSV_COLUMN_TO_TIPO_CODIGO.keys()) - set(header)
        if missing:
            raise RuntimeError(f"Columnas faltantes en CSV: {missing}")
        if "fecha" not in header or "afore" not in header:
            raise RuntimeError("CSV sin columnas 'fecha' o 'afore'")

        out: List[Tuple[str, str, str, Decimal]] = []
        raw_rows = 0
        for row in reader:
            raw_rows += 1
            fecha = row["fecha"].strip()
            afore = row["afore"].strip()
            for csv_col, codigo in CSV_COLUMN_TO_TIPO_CODIGO.items():
                val = row[csv_col].strip()
                if val == "":
                    continue
                out.append((fecha, afore, codigo, Decimal(val)))
    if raw_rows != EXPECTED_RAW_ROWS:
        raise RuntimeError(
            f"Filas raw CSV: {raw_rows}, esperaba {EXPECTED_RAW_ROWS}"
        )
    print(f"✓ CSV parseado: {raw_rows} filas ancho → {len(out)} filas largo")
    if len(out) != EXPECTED_LONG_ROWS:
        raise RuntimeError(
            f"Filas largo: {len(out)}, esperaba {EXPECTED_LONG_ROWS}"
        )
    return out


# ---------------------------------------------------------------------
# DB operations
# ---------------------------------------------------------------------


def _strip_query_params(dsn: str) -> str:
    """asyncpg no acepta sslmode/channel_binding como query params."""
    if "?" in dsn:
        base, _, _ = dsn.partition("?")
        return base
    return dsn


async def connect(dsn: str) -> asyncpg.Connection:
    clean = _strip_query_params(dsn)
    is_neon = "neon.tech" in clean
    kwargs: Dict = {"statement_cache_size": 0 if is_neon else 100}
    if is_neon:
        kwargs["ssl"] = "require"
    return await asyncpg.connect(clean, **kwargs)


async def load_catalog_lookups(
    conn: asyncpg.Connection,
) -> Tuple[Dict[str, int], Dict[str, int]]:
    """Devuelve (afore_csv_name → afore_id, tipo_codigo → tipo_recurso_id)."""
    afores = {
        r["nombre_csv"]: r["id"]
        for r in await conn.fetch("SELECT id, nombre_csv FROM consar.afores")
    }
    tipos = {
        r["codigo"]: r["id"]
        for r in await conn.fetch("SELECT id, codigo FROM consar.tipos_recurso")
    }
    if len(afores) != EXPECTED_AFORES:
        raise RuntimeError(f"consar.afores tiene {len(afores)}, esperaba {EXPECTED_AFORES}")
    if len(tipos) != EXPECTED_TIPOS:
        raise RuntimeError(f"consar.tipos_recurso tiene {len(tipos)}, esperaba {EXPECTED_TIPOS}")
    return afores, tipos


async def ingest(conn: asyncpg.Connection, label: str) -> None:
    print(f"\n{'=' * 60}\n[{label}] Ingesta CONSAR recursos mensuales\n{'=' * 60}")

    # 1) Parse CSV → long
    long_rows = melt_csv(CSV_PATH)

    # 2) Resolve FKs
    afores_lookup, tipos_lookup = await load_catalog_lookups(conn)
    records: List[Tuple] = []
    for fecha, afore_csv, codigo, monto in long_rows:
        afore_id = afores_lookup.get(afore_csv)
        if afore_id is None:
            raise RuntimeError(f"AFORE no en catálogo: {afore_csv!r}")
        tipo_id = tipos_lookup.get(codigo)
        if tipo_id is None:
            raise RuntimeError(f"tipo no en catálogo: {codigo!r}")
        # asyncpg.copy_records_to_table exige datetime.date (no str) para DATE
        fecha_dt = date.fromisoformat(fecha)
        records.append((fecha_dt, afore_id, tipo_id, monto))

    # 3) TRUNCATE + COPY
    async with conn.transaction():
        await conn.execute("TRUNCATE TABLE consar.recursos_mensuales")
        await conn.copy_records_to_table(
            "recursos_mensuales",
            schema_name="consar",
            columns=("fecha", "afore_id", "tipo_recurso_id", "monto_mxn_mm"),
            records=records,
        )

    # 4) Verificación post-load
    await verify(conn, label)


async def verify(conn: asyncpg.Connection, label: str) -> None:
    print(f"\n[{label}] Verificaciones post-load:")

    n = await conn.fetchval("SELECT COUNT(*) FROM consar.recursos_mensuales")
    print(f"  COUNT(*): {n}")
    if n != EXPECTED_LONG_ROWS:
        raise RuntimeError(f"COUNT(*) = {n}, esperaba {EXPECTED_LONG_ROWS}")

    n_afores = await conn.fetchval(
        "SELECT COUNT(DISTINCT afore_id) FROM consar.recursos_mensuales"
    )
    print(f"  COUNT(DISTINCT afore_id): {n_afores}")
    if n_afores != EXPECTED_AFORES:
        raise RuntimeError(f"afores únicos = {n_afores}, esperaba {EXPECTED_AFORES}")

    n_fechas = await conn.fetchval(
        "SELECT COUNT(DISTINCT fecha) FROM consar.recursos_mensuales"
    )
    print(f"  COUNT(DISTINCT fecha): {n_fechas}")
    if n_fechas != EXPECTED_MONTHS:
        raise RuntimeError(f"fechas únicas = {n_fechas}, esperaba {EXPECTED_MONTHS}")

    fmin, fmax = await conn.fetchrow(
        "SELECT MIN(fecha) AS fmin, MAX(fecha) AS fmax FROM consar.recursos_mensuales"
    )
    print(f"  fecha range: {fmin} → {fmax}")
    if str(fmin) != "1998-05-01" or str(fmax) != "2025-06-01":
        raise RuntimeError(f"rango fecha incorrecto: {fmin} → {fmax}")

    # Identidad 1: vivienda = infonavit + fovissste (debe cerrar al peso)
    mismatches_viv = await conn.fetchval(
        """
        WITH pivot AS (
            SELECT fecha, afore_id,
                   SUM(monto_mxn_mm) FILTER (WHERE tr.codigo = 'vivienda')       AS v,
                   SUM(monto_mxn_mm) FILTER (WHERE tr.codigo = 'infonavit')      AS i,
                   SUM(monto_mxn_mm) FILTER (WHERE tr.codigo = 'fovissste')      AS f
            FROM consar.recursos_mensuales rm
            JOIN consar.tipos_recurso tr ON tr.id = rm.tipo_recurso_id
            WHERE tr.codigo IN ('vivienda','infonavit','fovissste')
            GROUP BY fecha, afore_id
        )
        SELECT COUNT(*) FROM pivot
        WHERE v IS NOT NULL
          AND COALESCE(i, 0) + COALESCE(f, 0) <> v
          AND ABS(COALESCE(i, 0) + COALESCE(f, 0) - v) > 0.05
        """
    )
    print(f"  identidad vivienda = infonavit + fovissste: {mismatches_viv} filas con Δ > 0.05")
    if mismatches_viv > 0:
        raise RuntimeError(
            f"Identidad vivienda rota en {mismatches_viv} filas — HALT"
        )

    # Identidad 2: ahorro_vol_y_sol = ahorro_voluntario + ahorro_solidario
    mismatches_vs = await conn.fetchval(
        """
        WITH pivot AS (
            SELECT fecha, afore_id,
                   SUM(monto_mxn_mm) FILTER (WHERE tr.codigo = 'ahorro_voluntario_y_solidario') AS vs,
                   SUM(monto_mxn_mm) FILTER (WHERE tr.codigo = 'ahorro_voluntario')              AS v,
                   SUM(monto_mxn_mm) FILTER (WHERE tr.codigo = 'ahorro_solidario')               AS s
            FROM consar.recursos_mensuales rm
            JOIN consar.tipos_recurso tr ON tr.id = rm.tipo_recurso_id
            WHERE tr.codigo IN ('ahorro_voluntario_y_solidario','ahorro_voluntario','ahorro_solidario')
            GROUP BY fecha, afore_id
        )
        SELECT COUNT(*) FROM pivot
        WHERE vs IS NOT NULL
          AND v IS NOT NULL
          AND s IS NOT NULL
          AND ABS(COALESCE(v, 0) + COALESCE(s, 0) - vs) > 0.05
        """
    )
    print(f"  identidad ahorro_vol_sol = vol + sol: {mismatches_vs} filas con Δ > 0.05")
    if mismatches_vs > 0:
        raise RuntimeError(
            f"Identidad ahorro vol_sol rota en {mismatches_vs} filas — HALT"
        )

    # Identidad 3: sar_total = 8 componentes (verificar que ~98.83% cierre al peso)
    rows_ident3 = await conn.fetch(
        """
        WITH comp AS (
            SELECT fecha, afore_id,
                   SUM(monto_mxn_mm) FILTER (WHERE tr.codigo = 'sar_total')                     AS total,
                   SUM(monto_mxn_mm) FILTER (WHERE tr.codigo IN (
                      'rcv_imss','rcv_issste','bono_pension_issste','vivienda',
                      'ahorro_voluntario_y_solidario','capital_afores','banxico',
                      'fondos_prevision_social'))                                                AS suma_comp
            FROM consar.recursos_mensuales rm
            JOIN consar.tipos_recurso tr ON tr.id = rm.tipo_recurso_id
            GROUP BY fecha, afore_id
        )
        SELECT
          COUNT(*) FILTER (WHERE total IS NOT NULL)                                       AS n_eval,
          COUNT(*) FILTER (WHERE total IS NOT NULL AND ABS(total - COALESCE(suma_comp,0)) <= 0.05) AS n_exact,
          MAX(ABS(total - COALESCE(suma_comp,0))) FILTER (WHERE total IS NOT NULL)        AS max_abs,
          COUNT(*) FILTER (WHERE total IS NOT NULL AND ABS(total - COALESCE(suma_comp,0)) > 0.05
                                AND EXTRACT(YEAR FROM fecha) >= 2020)                     AS n_residue_2020
        FROM comp
        """
    )
    r = rows_ident3[0]
    n_eval = r["n_eval"]
    n_exact = r["n_exact"]
    max_abs = r["max_abs"]
    n_residue_2020 = r["n_residue_2020"]
    pct = 100.0 * (n_exact or 0) / (n_eval or 1)
    print(f"  identidad sar_total = 8 componentes:")
    print(f"    n_eval: {n_eval}    n_exactas (Δ ≤ 0.05): {n_exact}  ({pct:.2f}%)")
    print(f"    max |Δ|: {max_abs}")
    print(f"    residuo 2020+: {n_residue_2020} filas (esperado: 0)")
    if n_residue_2020 != 0:
        raise RuntimeError(
            f"Residuo 2020+ = {n_residue_2020} (esperado 0 — identidad debe cerrar al peso en años recientes)"
        )
    if pct < 98.0:
        raise RuntimeError(
            f"Identidad sar_total cierra solo en {pct:.2f}% (esperado ≥98.8%)"
        )

    # Top 5 residuos — para confirmar que son XXI-Banorte 2010-2012
    top5 = await conn.fetch(
        """
        WITH comp AS (
            SELECT fecha, afore_id,
                   SUM(monto_mxn_mm) FILTER (WHERE tr.codigo = 'sar_total')                     AS total,
                   SUM(monto_mxn_mm) FILTER (WHERE tr.codigo IN (
                      'rcv_imss','rcv_issste','bono_pension_issste','vivienda',
                      'ahorro_voluntario_y_solidario','capital_afores','banxico',
                      'fondos_prevision_social'))                                                AS suma_comp
            FROM consar.recursos_mensuales rm
            JOIN consar.tipos_recurso tr ON tr.id = rm.tipo_recurso_id
            GROUP BY fecha, afore_id
        )
        SELECT c.fecha, a.codigo AS afore, c.total, c.suma_comp,
               ABS(c.total - COALESCE(c.suma_comp, 0)) AS delta_abs
        FROM comp c
        JOIN consar.afores a ON a.id = c.afore_id
        WHERE c.total IS NOT NULL
        ORDER BY delta_abs DESC
        LIMIT 5
        """
    )
    print(f"\n  TOP 5 residuos sar_total (esperado: XXI-Banorte 2010-2012):")
    for r in top5:
        print(f"    {r['fecha']}  {r['afore']:<20s}  total={r['total']:>12}  suma={r['suma_comp']:>12}  Δ={r['delta_abs']:>10}")

    # Snapshot 2025-06 total SAR nacional
    snap = await conn.fetchval(
        """
        SELECT SUM(monto_mxn_mm)
        FROM consar.recursos_mensuales rm
        JOIN consar.tipos_recurso tr ON tr.id = rm.tipo_recurso_id
        WHERE tr.codigo = 'sar_total' AND fecha = '2025-06-01'
        """
    )
    print(f"\n  SAR nacional 2025-06-01: {snap:,} mm MXN (≈ 10.13 bill MXN esperado)")

    print(f"\n[{label}] ✓ TODAS las verificaciones pasaron.")


# ---------------------------------------------------------------------
# DSN resolution
# ---------------------------------------------------------------------


def load_env_file(path: Path) -> Dict[str, str]:
    env: Dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def resolve_dsn(which: str) -> str:
    env_root = Path("/Users/davicho/datos-itam/api")
    if which == "local":
        env = load_env_file(env_root / ".env")
        # Override host to localhost Docker
        return "postgresql://datos_public:datos_public_2026@localhost:54322/remuneraciones_cdmx"
    elif which == "neon":
        env = load_env_file(env_root / ".env.neon")
        dsn = env.get("DATABASE_URL", "")
        if not dsn:
            raise RuntimeError(".env.neon no contiene DATABASE_URL")
        return dsn
    else:
        raise ValueError(f"--db debe ser local|neon|both, recibí: {which}")


# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", choices=["local", "neon", "both"], default="local")
    args = parser.parse_args()

    # 1) MD5 CSV (una sola vez)
    validate_md5(CSV_PATH)

    targets = ["local", "neon"] if args.db == "both" else [args.db]
    for which in targets:
        dsn = resolve_dsn(which)
        conn = await connect(dsn)
        try:
            await ingest(conn, label=which.upper())
        finally:
            await conn.close()

    print("\n✓ Ingesta CONSAR completada.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
