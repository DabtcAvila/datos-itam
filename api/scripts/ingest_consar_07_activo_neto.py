"""Ingest dataset #07 (CONSAR activo neto) into consar.activo_neto + consar.activo_neto_agg.

Lógica de 3 casos:
  A) tipo_recurso ∈ 3 agregados → activo_neto_agg
  B) tipo_recurso siefore-específico + afore canonical/alias → activo_neto
  C) afore sub-variant concat → activo_neto vía afore_siefore_alias

Source: datosgob_07_activos_netos.csv (9,849 rows, 2019-12 → 2025-06).
Preserves NULLs as-is (sparsity estructural en sb 95-99 / sb 55-59).

Usage:
    cd api/
    python scripts/ingest_consar_07_activo_neto.py --db local
    python scripts/ingest_consar_07_activo_neto.py --db neon
"""
import argparse
import csv
import os
import subprocess
import sys
import hashlib
from pathlib import Path
from collections import Counter, defaultdict

CSV_PATH = Path(__file__).resolve().parents[2] / "Proyecto-Final-main/normalizacion/dataset_3/data/raw/datosgob_07_activos_netos.csv"
EXPECTED_MD5 = "2b022dea4f0bba6afbbd3044b20839ce"
EXPECTED_ROWS = 9849

# tipo_recurso (NL en #07) → slug en consar.cat_siefore
ALIAS_07_NL_TO_SLUG = {
    "siefore básica 55-59":       "sb 55-59",
    "siefore básica 60-64":       "sb 60-64",
    "siefore básica 65-69":       "sb 65-69",
    "siefore básica 70-74":       "sb 70-74",
    "siefore básica 75-79":       "sb 75-79",
    "siefore básica 80-84":       "sb 80-84",
    "siefore básica 85-89":       "sb 85-89",
    "siefore básica 90-94":       "sb 90-94",
    "siefore básica 95-99":       "sb 95-99",
    "siefore básica de pensiones": "sb_pensiones",
    "siefore básica inicial":     "sb0",
}

# tipo_recurso agregado → categoria en activo_neto_agg
AGG_CATEGORIAS = {
    "activos netos de las siefores":                "act_neto_total_siefores",
    "activos netos de las siefores básicas":        "act_neto_total_basicas",
    "activo neto total de las siefores adicionales":"act_neto_total_adicionales",
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
    """Run a query, return list of rows (tab-separated tuples) when tuples_only=True."""
    if db == "local":
        cmd = list(DOCKER_PSQL) + (["-tAF\t"] if tuples_only else []) + ["-c", sql]
    else:
        cmd = ["psql", DB_URLS["neon"]] + (["-tAF\t"] if tuples_only else []) + ["-c", sql]
    r = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return r.stdout.strip().split("\n") if r.stdout.strip() else []


def psql_exec_file(db, sql_text):
    """Execute multi-statement SQL from stdin."""
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
    canonical = {}  # nombre_csv → afore_id
    for line in psql_query(db, "SELECT nombre_csv, id FROM consar.afores;"):
        nombre, _id = line.split("\t")
        canonical[nombre] = int(_id)

    aliases = {}  # alias_text → afore_id
    for line in psql_query(db, "SELECT alias_text, afore_id FROM consar.afore_alias;"):
        alias_text, afore_id = line.split("\t")
        aliases[alias_text] = int(afore_id)

    siefore_slug = {}  # slug → siefore_id
    for line in psql_query(db, "SELECT slug, id FROM consar.cat_siefore;"):
        slug, _id = line.split("\t")
        siefore_slug[slug] = int(_id)

    asa_07 = {}  # alias_text (#07) → (afore_id, siefore_id)
    for line in psql_query(db, "SELECT alias_text, afore_id, siefore_id FROM consar.afore_siefore_alias WHERE fuente_csv='#07';"):
        alias_text, afore_id, siefore_id = line.split("\t")
        asa_07[alias_text] = (int(afore_id), int(siefore_id))

    print(f"    canonical afores: {len(canonical)}")
    print(f"    aliases afore: {len(aliases)}")
    print(f"    cat_siefore: {len(siefore_slug)}")
    print(f"    afore_siefore_alias #07: {len(asa_07)}")
    return canonical, aliases, siefore_slug, asa_07


def classify_row(row, canonical, aliases, siefore_slug, asa_07):
    """Return ('activo_neto' | 'activo_neto_agg' | None, fields_dict | None, note)."""
    afore_str = row["afore"]
    tipo_str = row["tipo_recurso"]
    fecha = row["fecha"]
    monto = row["monto"] if row["monto"] != "" else None

    # Caso A: tipo_recurso es uno de los 3 agregados
    if tipo_str in AGG_CATEGORIAS:
        # afore puede ser canonical, alias, o sub-variant
        if afore_str in canonical:
            afore_id = canonical[afore_str]
        elif afore_str in aliases:
            afore_id = aliases[afore_str]
        elif afore_str in asa_07:
            # sub-variant aparece con tipo='adicionales' → ESTO va a activo_neto, NO al agg
            # Ejemplo: 'xxi banorte 1' aparece con tipo='adicionales'.
            # La fila representa el activo neto de (xxi_banorte, sps1) en esa fecha.
            af_id, sf_id = asa_07[afore_str]
            return ("activo_neto", {
                "afore_id": af_id, "siefore_id": sf_id, "fecha": fecha, "monto": monto
            }, "subvariant_decomposed")
        else:
            return (None, None, f"unknown_afore: {afore_str!r}")
        return ("activo_neto_agg", {
            "afore_id": afore_id,
            "categoria": AGG_CATEGORIAS[tipo_str],
            "fecha": fecha,
            "monto": monto,
        }, "agregate")

    # Caso B: tipo_recurso es siefore-específico
    if tipo_str in ALIAS_07_NL_TO_SLUG:
        siefore_slug_str = ALIAS_07_NL_TO_SLUG[tipo_str]
        siefore_id = siefore_slug.get(siefore_slug_str)
        if siefore_id is None:
            return (None, None, f"unknown_siefore_slug: {siefore_slug_str!r}")
        # afore: canonical, alias, o (raro) sub-variant
        if afore_str in canonical:
            afore_id = canonical[afore_str]
        elif afore_str in aliases:
            afore_id = aliases[afore_str]
        else:
            return (None, None, f"unknown_afore_for_atomic: {afore_str!r}")
        return ("activo_neto", {
            "afore_id": afore_id, "siefore_id": siefore_id,
            "fecha": fecha, "monto": monto,
        }, "atomic")

    return (None, None, f"unknown_tipo_recurso: {tipo_str!r}")


def fmt_decimal_or_null(v):
    return "NULL" if v is None else str(v)


def fmt_date(d):
    return f"'{d}'"


def build_insert_statements(rows_atomic, rows_agg):
    """Generate multi-row INSERT statements (batched 500/stmt)."""
    stmts = []
    BATCH = 500

    for i in range(0, len(rows_atomic), BATCH):
        batch = rows_atomic[i:i+BATCH]
        values = ",\n  ".join(
            f"({r['afore_id']}, {r['siefore_id']}, {fmt_date(r['fecha'])}, {fmt_decimal_or_null(r['monto'])})"
            for r in batch
        )
        stmts.append(
            f"INSERT INTO consar.activo_neto (afore_id, siefore_id, fecha, monto_mxn_mm) VALUES\n  {values};"
        )

    for i in range(0, len(rows_agg), BATCH):
        batch = rows_agg[i:i+BATCH]
        values = ",\n  ".join(
            f"({r['afore_id']}, '{r['categoria']}', {fmt_date(r['fecha'])}, {fmt_decimal_or_null(r['monto'])})"
            for r in batch
        )
        stmts.append(
            f"INSERT INTO consar.activo_neto_agg (afore_id, categoria, fecha, monto_mxn_mm) VALUES\n  {values};"
        )
    return stmts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", choices=["local", "neon"], required=True)
    parser.add_argument("--apply", action="store_true", help="Actually write to DB. Without --apply, dry-run.")
    parser.add_argument("--truncate-first", action="store_true", help="TRUNCATE consar.activo_neto and activo_neto_agg first (idempotency).")
    args = parser.parse_args()

    print(f"=== Ingest CONSAR #07 → {args.db} {'(APPLY)' if args.apply else '(DRY-RUN)'} ===")

    # 1. md5 verify
    actual_md5 = md5_of(CSV_PATH)
    assert actual_md5 == EXPECTED_MD5, f"md5 mismatch: {actual_md5} vs {EXPECTED_MD5}"
    print(f"  CSV md5: {actual_md5} ✓")

    # 2. load maps
    canonical, aliases, siefore_slug, asa_07 = load_lookup_maps(args.db)

    # 3. classify rows
    rows_atomic = []
    rows_agg = []
    errors = []
    counters = Counter()
    sub_decomposed = 0

    with CSV_PATH.open(newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            kind, fields, note = classify_row(row, canonical, aliases, siefore_slug, asa_07)
            counters[note] += 1
            if kind == "activo_neto":
                rows_atomic.append(fields)
                if note == "subvariant_decomposed":
                    sub_decomposed += 1
            elif kind == "activo_neto_agg":
                rows_agg.append(fields)
            else:
                errors.append((row, note))

    total_processed = len(rows_atomic) + len(rows_agg)
    print(f"\n  CSV rows total: {EXPECTED_ROWS}")
    print(f"  → activo_neto:      {len(rows_atomic)} (atomic + sub-variant decomposed)")
    print(f"     of which subvariant_decomposed: {sub_decomposed}")
    print(f"  → activo_neto_agg:  {len(rows_agg)}")
    print(f"  → errors/unmapped:  {len(errors)}")
    print(f"  → total processed:  {total_processed}")
    print(f"  Counters: {dict(counters)}")
    if errors:
        print(f"  First 5 errors: {errors[:5]}")
        sys.exit(1)
    assert total_processed == EXPECTED_ROWS, f"row count mismatch: processed {total_processed} vs CSV {EXPECTED_ROWS}"
    print("  ✓ All rows classified, no errors")

    # NULLs sanity
    nulls_atomic = sum(1 for r in rows_atomic if r["monto"] is None)
    nulls_agg = sum(1 for r in rows_agg if r["monto"] is None)
    print(f"  NULLs preserved: activo_neto={nulls_atomic}, activo_neto_agg={nulls_agg}, total={nulls_atomic+nulls_agg}")
    print("  Esperado total NULLs (CSV): 670")

    if not args.apply:
        print("\n  [DRY-RUN] No DB write. Pass --apply to commit.")
        return

    # 4. build SQL
    pre = []
    if args.truncate_first:
        pre.append("TRUNCATE consar.activo_neto, consar.activo_neto_agg;")
    stmts = build_insert_statements(rows_atomic, rows_agg)
    print(f"\n  Generated {len(stmts)} INSERT batches ({sum(s.count(chr(10)+'  (') for s in stmts) + len(stmts)} rows total)")

    # 5. execute
    full = "BEGIN;\n" + "\n".join(pre + stmts) + "\nCOMMIT;\n"
    print(f"  Executing on {args.db}...")
    psql_exec_file(args.db, full)

    # 6. verify counts post-insert
    out_atomic = psql_query(args.db, "SELECT COUNT(*) FROM consar.activo_neto;")[0]
    out_agg    = psql_query(args.db, "SELECT COUNT(*) FROM consar.activo_neto_agg;")[0]
    out_nulls  = psql_query(args.db, "SELECT COUNT(*) FROM consar.activo_neto WHERE monto_mxn_mm IS NULL;")[0]
    out_nulls_agg = psql_query(args.db, "SELECT COUNT(*) FROM consar.activo_neto_agg WHERE monto_mxn_mm IS NULL;")[0]
    print(f"\n  POST-INSERT counts on {args.db}:")
    print(f"    activo_neto:     {out_atomic}  (expected {len(rows_atomic)})")
    print(f"    activo_neto_agg: {out_agg}  (expected {len(rows_agg)})")
    print(f"    NULLs in activo_neto: {out_nulls}, in activo_neto_agg: {out_nulls_agg}")
    assert int(out_atomic) == len(rows_atomic)
    assert int(out_agg) == len(rows_agg)
    print("  ✓ Counts match")


if __name__ == "__main__":
    main()
