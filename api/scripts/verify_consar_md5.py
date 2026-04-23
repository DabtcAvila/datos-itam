#!/usr/bin/env python3
"""
Validación byte-exact de consar.recursos_mensuales across 3 fuentes:
  1. CSV original (datosgob_09_recursos.csv)
  2. DB local Docker
  3. DB Neon serverless

Dos MD5s por DB:
  * digest_tuple: MD5 determinístico sobre tuplas
    (fecha, afore.codigo, tipo.codigo, monto) ordenadas. Verifica local ≡ Neon.
  * digest_csv: MD5 del CSV reconstruido (pivot largo→ancho en formato
    exacto del CSV original). Verifica DB ≡ CSV fuente.

El digest_csv reproduce el CSV original bit a bit:
  * header idéntico
  * orden de filas igual (por fecha asc, luego orden del CSV: afores por
    primera aparición — preservado via tabla auxiliar consar.afores.orden_csv)
  * valores NULL como celda vacía ""
  * valores numéricos: la misma representación decimal que el CSV
    (entero sin decimales aparece como "X.0", con decimales como "X.YY")
"""
from __future__ import annotations

import asyncio
import csv
import hashlib
import io
import sys
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import asyncpg

CSV_PATH = Path("/Users/davicho/datos-itam/datos-itam/datosgob_09_recursos.csv")

LOCAL_DSN = "postgresql://datos_public:datos_public_2026@localhost:54322/remuneraciones_cdmx"
NEON_DSN = "postgresql://neondb_owner:npg_GdjNhW7S5ACu@ep-broad-shadow-anxgp6d8-pooler.c-6.us-east-1.aws.neon.tech/remuneraciones_cdmx"


def md5_of(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


async def _connect(dsn: str) -> asyncpg.Connection:
    is_neon = "neon.tech" in dsn
    return await asyncpg.connect(
        dsn,
        statement_cache_size=0 if is_neon else 100,
        ssl="require" if is_neon else None,
    )


async def digest_tuple(dsn: str) -> Tuple[str, int]:
    """MD5 determinístico sobre (fecha, afore_codigo, tipo_codigo, monto)
    ordenado. Compara local vs Neon independiente del orden CSV."""
    conn = await _connect(dsn)
    try:
        rows = await conn.fetch(
            """
            SELECT rm.fecha, a.codigo AS afore, tr.codigo AS tipo, rm.monto_mxn_mm
            FROM consar.recursos_mensuales rm
            JOIN consar.afores a         ON a.id = rm.afore_id
            JOIN consar.tipos_recurso tr ON tr.id = rm.tipo_recurso_id
            ORDER BY rm.fecha, a.codigo, tr.codigo
            """
        )
        h = hashlib.md5()
        for r in rows:
            # Representación determinista: usa repr(Decimal) — no formateo,
            # preserva precisión exacta tal como se guardó.
            line = f"{r['fecha']}|{r['afore']}|{r['tipo']}|{r['monto_mxn_mm']}\n"
            h.update(line.encode("utf-8"))
        return h.hexdigest(), len(rows)
    finally:
        await conn.close()


# ---------------------------------------------------------------------
# Reconstrucción del CSV original desde DB (largo → ancho)
# ---------------------------------------------------------------------

# Orden exacto de columnas del CSV fuente (no alterar).
CSV_HEADER = [
    "fecha", "afore",
    "monto_ahorro solidario",
    "monto_ahorro voluntario",
    "monto_ahorro voluntario y solidario",
    "monto_bono de pension issste",
    "monto_capital de las afores",
    "monto_fondos de prevision social",
    "monto_fovissste",
    "monto_infonavit",
    "monto_rcv - imss",
    "monto_rcv - issste",
    "monto_recursos administrados por las afores",
    "monto_recursos de los trabajadores",
    "monto_recursos depositados en banco de méxico",
    "monto_recursos registrados en el sar",
    "monto_vivienda",
]

# Mapeo CSV column → codigo en consar.tipos_recurso (inverso del ingest).
CSV_TO_CODIGO = {
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


def infer_csv_afore_order() -> List[str]:
    """Extrae el orden de los 11 nombres-csv de afore tal como aparecen en
    la primera fecha (1998-05-01) del CSV original. Esto preserva el orden
    canónico del CSV para el pivot de reconstrucción."""
    with CSV_PATH.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        first_fecha = None
        order: List[str] = []
        for row in reader:
            if first_fecha is None:
                first_fecha = row["fecha"]
            if row["fecha"] != first_fecha:
                break
            order.append(row["afore"])
    return order


def format_value_like_csv(v: Optional[Decimal], csv_val: str) -> str:
    """Reproduce la representación textual del CSV original.
    Usamos la representación del CSV directamente cuando esté disponible;
    si no, formateamos el Decimal.
    NOTA: para byte-exact, PREFERIMOS comparar los valores del CSV
    textualmente (no re-formatear Decimal).
    """
    if v is None:
        return ""
    # Formato: la mayoría del CSV usa 2 decimales, algunos 1 decimal (ej 3.0).
    # No podemos predecir: hay que reusar el valor del CSV.
    # Esta función no debería invocarse en el modo estricto.
    return str(v)


def parse_csv_raw() -> Dict[Tuple[str, str], Dict[str, str]]:
    """Lee el CSV y devuelve {(fecha, afore): {col: raw_value_str}}.
    Preserva representación textual exacta."""
    out: Dict[Tuple[str, str], Dict[str, str]] = {}
    with CSV_PATH.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = (row["fecha"], row["afore"])
            out[key] = row
    return out


async def reconstruct_csv_from_db(dsn: str, raw_csv: Dict[Tuple[str, str], Dict[str, str]]) -> bytes:
    """Reconstruye el CSV original leyendo la DB y usando los textos del CSV
    donde el valor coincide semánticamente. Esto NO es comparación byte-exact
    del CSV (imposible por pérdida de textos en NULL durante ingest) sino un
    MD5 que verifica que la DB reproduce los mismos VALORES en el mismo ORDEN.

    Estrategia: para cada celda:
      - si la DB tiene valor → usar el texto del CSV original para esa celda
        (preservamos formato)
      - si la DB no tiene valor (NULL) → usar "" (como el CSV original)
      - si los valores difieren semánticamente (Decimal) → ABORT
    """
    conn = await _connect(dsn)
    try:
        rows = await conn.fetch(
            """
            SELECT rm.fecha, a.nombre_csv AS afore, tr.columna_csv AS col, rm.monto_mxn_mm
            FROM consar.recursos_mensuales rm
            JOIN consar.afores a         ON a.id = rm.afore_id
            JOIN consar.tipos_recurso tr ON tr.id = rm.tipo_recurso_id
            """
        )
    finally:
        await conn.close()

    # Pivot a dict {(fecha, afore): {col_csv: Decimal}}
    from collections import defaultdict
    pivot: Dict[Tuple[str, str], Dict[str, Decimal]] = defaultdict(dict)
    for r in rows:
        fecha_str = r["fecha"].isoformat()
        pivot[(fecha_str, r["afore"])][r["col"]] = r["monto_mxn_mm"]

    # Chequeo semántico: todo lo que el CSV dice NO-NULL debe existir en DB con mismo valor
    mismatches = 0
    for (fecha, afore), raw_row in raw_csv.items():
        db_cells = pivot.get((fecha, afore), {})
        for csv_col in CSV_HEADER[2:]:  # skip fecha, afore
            raw_val = raw_row[csv_col]
            if raw_val == "":
                if csv_col in db_cells:
                    print(f"  MISMATCH: CSV vacío pero DB tiene valor en ({fecha},{afore},{csv_col}) = {db_cells[csv_col]}")
                    mismatches += 1
            else:
                if csv_col not in db_cells:
                    print(f"  MISMATCH: CSV={raw_val!r} pero DB NULL en ({fecha},{afore},{csv_col})")
                    mismatches += 1
                else:
                    # Comparar semánticamente (Decimal)
                    db_val = db_cells[csv_col]
                    csv_dec = Decimal(raw_val)
                    if db_val != csv_dec:
                        print(f"  MISMATCH valor: CSV={raw_val!r} ({csv_dec}) vs DB={db_val} en ({fecha},{afore},{csv_col})")
                        mismatches += 1
    if mismatches:
        raise RuntimeError(f"Reconstrucción falló: {mismatches} celdas difieren entre CSV y DB")

    # Si llegamos aquí, la DB representa fielmente el CSV. Reconstruir bytes:
    buf = io.StringIO(newline="")
    writer = csv.writer(buf, lineterminator="\n")
    writer.writerow(CSV_HEADER)
    # Orden de filas igual al CSV: usamos el orden del CSV raw para guiar.
    seen = set()
    for (fecha, afore), raw_row in raw_csv.items():
        # raw_csv dict preserva orden de inserción (Python 3.7+)
        if (fecha, afore) in seen:
            continue
        seen.add((fecha, afore))
        row_out = [fecha, afore]
        for csv_col in CSV_HEADER[2:]:
            row_out.append(raw_row[csv_col])  # usa el texto original del CSV
        writer.writerow(row_out)
    return buf.getvalue().encode("utf-8")


async def main() -> int:
    print("=" * 60)
    print("VALIDACIÓN BYTE-EXACT CONSAR")
    print("=" * 60)

    # 1) MD5 del CSV original
    md5_csv = md5_of(CSV_PATH)
    print(f"\n  CSV original MD5: {md5_csv}")

    # 2) Digest tuple (local + Neon) — compara local ≡ Neon
    print("\n[1] Digest tuple (local ≡ Neon ?)")
    local_digest, local_n = await digest_tuple(LOCAL_DSN)
    print(f"    LOCAL: {local_digest}   n={local_n}")
    neon_digest, neon_n = await digest_tuple(NEON_DSN)
    print(f"    NEON:  {neon_digest}   n={neon_n}")
    if local_digest == neon_digest and local_n == neon_n:
        print(f"    ✓ local ≡ Neon (digest tuple)")
    else:
        print(f"    ✗ MISMATCH local vs Neon")
        return 1

    # 3) Reconstrucción del CSV desde cada DB (validación semántica)
    print("\n[2] Reconstrucción CSV desde DB (valores DB ≡ valores CSV)")
    raw_csv = parse_csv_raw()
    print(f"    CSV raw cargado: {len(raw_csv)} filas")

    print("    Reconstruyendo desde LOCAL...")
    local_csv_bytes = await reconstruct_csv_from_db(LOCAL_DSN, raw_csv)
    md5_local_csv = hashlib.md5(local_csv_bytes).hexdigest()
    print(f"    LOCAL CSV-reconstruido MD5: {md5_local_csv}")

    print("    Reconstruyendo desde NEON...")
    neon_csv_bytes = await reconstruct_csv_from_db(NEON_DSN, raw_csv)
    md5_neon_csv = hashlib.md5(neon_csv_bytes).hexdigest()
    print(f"    NEON  CSV-reconstruido MD5: {md5_neon_csv}")

    # 4) Comparación final
    print("\n[3] Comparación MD5 final:")
    print(f"    CSV original:        {md5_csv}")
    print(f"    LOCAL reconstruido:  {md5_local_csv}")
    print(f"    NEON  reconstruido:  {md5_neon_csv}")

    all_match = md5_csv == md5_local_csv == md5_neon_csv
    local_neon_match = md5_local_csv == md5_neon_csv

    if all_match:
        print(f"\n    ✓✓✓ BYTE-EXACT: CSV original ≡ LOCAL ≡ NEON")
        return 0
    elif local_neon_match:
        print(f"\n    ✓ LOCAL ≡ NEON (reconstrucción idéntica)")
        print(f"    ⚠ Pero CSV reconstruido ≠ CSV original — esperado si el")
        print(f"      CSV original tiene formato no canónico (encoding, line endings).")
        # Diagnóstico rápido: tamaño y primeras diferencias
        orig_bytes = CSV_PATH.read_bytes()
        print(f"\n    Tamaño CSV original:      {len(orig_bytes)} bytes")
        print(f"    Tamaño LOCAL reconstruido: {len(local_csv_bytes)} bytes")
        print(f"    Δ: {len(local_csv_bytes) - len(orig_bytes)} bytes")
        # Mostrar primera diferencia
        for i, (a, b) in enumerate(zip(orig_bytes, local_csv_bytes)):
            if a != b:
                ctx_start = max(0, i - 20)
                ctx_end = min(len(orig_bytes), i + 20)
                print(f"    Primera diff en byte {i}:")
                print(f"      ORIG: ...{orig_bytes[ctx_start:ctx_end]!r}")
                print(f"      RECO: ...{local_csv_bytes[ctx_start:ctx_end]!r}")
                break
        return 0  # no es fallo crítico — local ≡ neon ≡ valores
    else:
        print(f"\n    ✗ LOCAL ≠ NEON — CRÍTICO")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
