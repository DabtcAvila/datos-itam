"""Ingest dataset #10 (CONSAR rendimientos) into consar.rendimiento + consar.rendimiento_sis.

Lógica de 3 casos (S16 Sub-fase 5):
  A) afore == tipo_recurso (ambos system-aggregate strings) → rendimiento_sis
  B) afore canonical (10) + tipo_recurso siefore-específico (sin "adicionales") → rendimiento
  C) afore sub-variant concat (17) → rendimiento vía afore_siefore_alias #10

Pattern análogo a #07 (mig 020) extendido con dim adicional `plazo` (5 valores).

Source: datosgob_10_rendimientos_precio_bolsa.csv (35,041 rows, 2019-12 → 2025-06).
Esperado: 32,026 atomic + 3,015 system-agg = 35,041.

Usage:
    cd api/
    python scripts/ingest_consar_10_rendimiento.py --db local --apply
    python scripts/ingest_consar_10_rendimiento.py --db neon  --apply  (gate explícito)
"""
import argparse
import csv
import hashlib
import subprocess
import sys
from pathlib import Path
from collections import Counter

CSV_PATH = Path(__file__).resolve().parents[2] / "Proyecto-Final-main/normalizacion/dataset_3/data/raw/datosgob_10_rendimientos_precio_bolsa.csv"
EXPECTED_MD5 = "49a279e87fa8d62030c0ca14a0f9b26a"
EXPECTED_ROWS = 35041
EXPECTED_ATOMIC = 32026
EXPECTED_SYSAGG = 3015

# tipo_recurso (CSV #10) → slug en consar.cat_siefore
# Las 12 strings con suffix "promedio ponderado". 11 mapean a siefores reales,
# 1 mapea al slug nuevo agregado_adicionales (categoria sistema_agregado).
TR_TO_SIEFORE_SLUG = {
    "sb 55-59 promedio ponderado":     "sb 55-59",
    "sb 60-64 promedio ponderado":     "sb 60-64",
    "sb 65-69 promedio ponderado":     "sb 65-69",
    "sb 70-74 promedio ponderado":     "sb 70-74",
    "sb 75-79 promedio ponderado":     "sb 75-79",
    "sb 80-84 promedio ponderado":     "sb 80-84",
    "sb 85-89 promedio ponderado":     "sb 85-89",
    "sb 90-94 promedio ponderado":     "sb 90-94",
    "sb 95-99 promedio ponderado":     "sb 95-99",
    "sb 1000 promedio ponderado":      "sb 1000",
    "sb pensiones promedio ponderado": "sb_pensiones",
    "adicionales promedio ponderado":  "agregado_adicionales",
}

PLAZO_MAP = {
    "12 meses":  "12_meses",
    "24 meses":  "24_meses",
    "36 meses":  "36_meses",
    "5 años":    "5_anios",
    "historico": "historico",
}

DB_URLS = {
    "local": "postgresql://datos_public:datos_public_2026@localhost:54322/remuneraciones_cdmx",
    "neon":  "postgresql://neondb_owner:npg_GdjNhW7S5ACu@ep-broad-shadow-anxgp6d8-pooler.c-6.us-east-1.aws.neon.tech/remuneraciones_cdmx?sslmode=require",
}

DOCKER_PSQL = ["docker", "exec", "-i", "ProyectoDATOS-public-v1-DB",
               "psql", "-U", "datos_public", "-d", "remuneraciones_cdmx"]


def md5_of(path):
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def psql_query(db, sql, tuples_only=True):
    if db == "local":
        cmd = list(DOCKER_PSQL) + (["-tAF\t"] if tuples_only else []) + ["-c", sql]
    else:
        cmd = ["psql", DB_URLS["neon"]] + (["-tAF\t"] if tuples_only else []) + ["-c", sql]
    r = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return r.stdout.strip().split("\n") if r.stdout.strip() else []


def psql_exec_file(db, sql_text):
    if db == "local":
        cmd = list(DOCKER_PSQL)
    else:
        cmd = ["psql", DB_URLS["neon"]]
    r = subprocess.run(cmd, input=sql_text, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(f"psql failed:\nSTDOUT: {r.stdout}\nSTDERR: {r.stderr}\n")
        raise RuntimeError("psql failed")
    return r.stdout


def load_lookup_maps(db):
    print(f"  Loading lookup maps from {db}...")
    canonical = {}
    for line in psql_query(db, "SELECT nombre_csv, id FROM consar.afores;"):
        nombre, _id = line.split("\t")
        canonical[nombre] = int(_id)

    aliases = {}
    for line in psql_query(db, "SELECT alias_text, afore_id FROM consar.afore_alias;"):
        alias_text, afore_id = line.split("\t")
        aliases[alias_text] = int(afore_id)

    siefore_slug = {}
    for line in psql_query(db, "SELECT slug, id FROM consar.cat_siefore;"):
        slug, _id = line.split("\t")
        siefore_slug[slug] = int(_id)

    asa_10 = {}
    for line in psql_query(db, "SELECT alias_text, afore_id, siefore_id FROM consar.afore_siefore_alias WHERE fuente_csv='#10';"):
        alias_text, afore_id, siefore_id = line.split("\t")
        asa_10[alias_text] = (int(afore_id), int(siefore_id))

    print(f"    canonical afores: {len(canonical)}  (expected 11)")
    print(f"    aliases afore: {len(aliases)}")
    print(f"    cat_siefore: {len(siefore_slug)}  (expected 28)")
    print(f"    afore_siefore_alias #10: {len(asa_10)}  (expected 17)")
    return canonical, aliases, siefore_slug, asa_10


def classify_row(row, canonical, aliases, siefore_slug, asa_10):
    afore_str = row["afore"]
    tipo_str = row["tipo_recurso"]
    fecha = row["fecha"]
    plazo_csv = row["plazo"]
    monto = row["monto"]

    plazo = PLAZO_MAP.get(plazo_csv)
    if plazo is None:
        return (None, None, f"unknown_plazo: {plazo_csv!r}")

    # Caso A: system-aggregate (afore == tipo_recurso, ambos system-agg strings)
    if afore_str == tipo_str:
        slug = TR_TO_SIEFORE_SLUG.get(tipo_str)
        if slug is None:
            return (None, None, f"unknown_sysagg_tipo: {tipo_str!r}")
        siefore_id = siefore_slug.get(slug)
        if siefore_id is None:
            return (None, None, f"unknown_siefore_slug_for_sysagg: {slug!r}")
        return ("rendimiento_sis", {
            "siefore_id": siefore_id,
            "fecha": fecha,
            "plazo": plazo,
            "rendimiento_pct": monto,
        }, "sysagg")

    # Caso B: canonical afore + tipo_recurso siefore-específico (NO 'adicionales')
    if afore_str in canonical:
        slug = TR_TO_SIEFORE_SLUG.get(tipo_str)
        if slug is None:
            return (None, None, f"unknown_canonical_tipo: {tipo_str!r}")
        if slug == "agregado_adicionales":
            return (None, None, f"canonical_reports_adicionales_unexpected: afore={afore_str!r}")
        siefore_id = siefore_slug.get(slug)
        if siefore_id is None:
            return (None, None, f"unknown_siefore_slug_canonical: {slug!r}")
        return ("rendimiento", {
            "afore_id": canonical[afore_str],
            "siefore_id": siefore_id,
            "fecha": fecha,
            "plazo": plazo,
            "rendimiento_pct": monto,
        }, "canonical")

    # Caso C: sub-variant concat decompose
    if afore_str in asa_10:
        af_id, sf_id = asa_10[afore_str]
        # Verificación: tipo_recurso DEBE ser 'adicionales' aquí
        if tipo_str != "adicionales promedio ponderado":
            return (None, None, f"subvariant_unexpected_tipo: afore={afore_str!r} tipo={tipo_str!r}")
        return ("rendimiento", {
            "afore_id": af_id,
            "siefore_id": sf_id,
            "fecha": fecha,
            "plazo": plazo,
            "rendimiento_pct": monto,
        }, "subvariant_decomposed")

    # alias standalone (e.g. 'xxi-banorte' standalone) — no esperado en #10
    if afore_str in aliases:
        return (None, None, f"unexpected_alias_standalone: {afore_str!r}")

    return (None, None, f"unknown_afore: {afore_str!r}")


def fmt_decimal(v):
    return str(v)


def fmt_date(d):
    return f"'{d}'"


def build_insert_statements(rows_atomic, rows_sysagg):
    stmts = []
    BATCH = 500

    for i in range(0, len(rows_atomic), BATCH):
        batch = rows_atomic[i:i+BATCH]
        values = ",\n  ".join(
            f"({r['afore_id']}, {r['siefore_id']}, {fmt_date(r['fecha'])}, '{r['plazo']}', {fmt_decimal(r['rendimiento_pct'])})"
            for r in batch
        )
        stmts.append(
            f"INSERT INTO consar.rendimiento (afore_id, siefore_id, fecha, plazo, rendimiento_pct) VALUES\n  {values};"
        )

    for i in range(0, len(rows_sysagg), BATCH):
        batch = rows_sysagg[i:i+BATCH]
        values = ",\n  ".join(
            f"({r['siefore_id']}, {fmt_date(r['fecha'])}, '{r['plazo']}', {fmt_decimal(r['rendimiento_pct'])})"
            for r in batch
        )
        stmts.append(
            f"INSERT INTO consar.rendimiento_sis (siefore_id, fecha, plazo, rendimiento_pct) VALUES\n  {values};"
        )
    return stmts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", choices=["local", "neon"], required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--truncate-first", action="store_true")
    args = parser.parse_args()

    print(f"=== Ingest CONSAR #10 → {args.db} {'(APPLY)' if args.apply else '(DRY-RUN)'} ===")

    actual_md5 = md5_of(CSV_PATH)
    assert actual_md5 == EXPECTED_MD5, f"md5 mismatch: {actual_md5} vs {EXPECTED_MD5}"
    print(f"  CSV md5: {actual_md5} ✓")

    canonical, aliases, siefore_slug, asa_10 = load_lookup_maps(args.db)

    rows_atomic = []
    rows_sysagg = []
    errors = []
    counters = Counter()

    with CSV_PATH.open(newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            kind, fields, note = classify_row(row, canonical, aliases, siefore_slug, asa_10)
            counters[note] += 1
            if kind == "rendimiento":
                rows_atomic.append(fields)
            elif kind == "rendimiento_sis":
                rows_sysagg.append(fields)
            else:
                errors.append((row, note))

    total_processed = len(rows_atomic) + len(rows_sysagg)
    print(f"\n  CSV rows total: {EXPECTED_ROWS}")
    print(f"  → rendimiento:     {len(rows_atomic)} (canonical + sub-variant decomposed)  expected {EXPECTED_ATOMIC}")
    print(f"  → rendimiento_sis: {len(rows_sysagg)} (system-aggregate)                     expected {EXPECTED_SYSAGG}")
    print(f"  → errors/unmapped: {len(errors)}")
    print(f"  → total processed: {total_processed}")
    print(f"  Counters: {dict(counters)}")
    if errors:
        print(f"  First 5 errors: {errors[:5]}")
        sys.exit(1)
    assert total_processed == EXPECTED_ROWS, f"row count mismatch: {total_processed} vs {EXPECTED_ROWS}"
    assert len(rows_atomic) == EXPECTED_ATOMIC, f"atomic count mismatch: {len(rows_atomic)} vs {EXPECTED_ATOMIC}"
    assert len(rows_sysagg) == EXPECTED_SYSAGG, f"sysagg count mismatch: {len(rows_sysagg)} vs {EXPECTED_SYSAGG}"
    print("  ✓ All rows classified, no errors")

    if not args.apply:
        print("\n  [DRY-RUN] No DB write. Pass --apply to commit.")
        return

    pre = []
    if args.truncate_first:
        pre.append("TRUNCATE consar.rendimiento, consar.rendimiento_sis;")
    stmts = build_insert_statements(rows_atomic, rows_sysagg)
    print(f"\n  Generated {len(stmts)} INSERT batches")

    full = "BEGIN;\n" + "\n".join(pre + stmts) + "\nCOMMIT;\n"
    print(f"  Executing on {args.db}...")
    psql_exec_file(args.db, full)

    out_atomic = psql_query(args.db, "SELECT COUNT(*) FROM consar.rendimiento;")[0]
    out_sysagg = psql_query(args.db, "SELECT COUNT(*) FROM consar.rendimiento_sis;")[0]
    print(f"\n  POST-INSERT counts on {args.db}:")
    print(f"    rendimiento:     {out_atomic}  (expected {len(rows_atomic)})")
    print(f"    rendimiento_sis: {out_sysagg}  (expected {len(rows_sysagg)})")
    assert int(out_atomic) == len(rows_atomic)
    assert int(out_sysagg) == len(rows_sysagg)
    print("  ✓ Counts match")


if __name__ == "__main__":
    main()
