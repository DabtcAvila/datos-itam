"""Ingest dataset #03 (CONSAR medidas de sensibilidad) into consar.medida_sensibilidad.

Pivot wide→long (S16 Sub-fase 6):
  CSV wide: 3 dim (fecha, siefore, afore) + 7 columnas métrica = 7,840 rows
  DB long:  (fecha, afore_id, siefore_id, metrica_id, valor) — skip empties
  Esperado: ~46,657 long rows (42,101 canonical + 4,556 sub-variant decompuestos)

Lógica de 2 ramas:
  A) afore canonical (10) → siefore via ALIAS_03_NL_TO_SLUG → up to 7 long rows/wide
  B) afore sub-variant (17, idénticos a #10) → decompose via afore_siefore_alias
     fuente_csv='#10' → up to 4 long rows/wide (sólo CL/DCVaR/PPP/VaR; nunca tracking_error/escenarios_var/PID)

Source: datosgob_03_medidas.csv (7,840 rows, 2019-12 → 2025-06).

Usage:
    cd api/
    python scripts/ingest_consar_03_medida_sensibilidad.py --db local --apply
    python scripts/ingest_consar_03_medida_sensibilidad.py --db neon  --apply  (gate)
"""
import argparse
import csv
import hashlib
import subprocess
import sys
from pathlib import Path
from collections import Counter

CSV_PATH = Path(__file__).resolve().parents[2] / "Proyecto-Final-main/normalizacion/dataset_3/data/raw/datosgob_03_medidas.csv"
EXPECTED_MD5 = "2a2fda6bf2a30818230921db286992c1"
EXPECTED_WIDE_ROWS = 7840
EXPECTED_LONG_ROWS = 46657
EXPECTED_CANONICAL_LONG = 42101
EXPECTED_SUBVARIANT_LONG = 4556

# 7 métricas wide-pivoted (orden importa = orden_display en cat_metrica_sensibilidad)
METRIC_COLUMNS = [
    "coeficiente_liquidez",
    "diferencial_valor_riesgo_condicional_dcvar",
    "error_seguimiento",
    "escenarios_valor_riesgo_var",
    "plazo_promedio_ponderado_ppp",
    "provision_exposicion_instrumentos_derivados_pid",
    "valor_riesgo_var",
]

# Strings 'siefore' del CSV #03 → slug en consar.cat_siefore
# Atención: "siefore básica pensiones" en #03 (sin "de") vs "siefore básica de pensiones" en #07
ALIAS_03_NL_TO_SLUG = {
    "siefore básica 55-59":     "sb 55-59",
    "siefore básica 60-64":     "sb 60-64",
    "siefore básica 65-69":     "sb 65-69",
    "siefore básica 70-74":     "sb 70-74",
    "siefore básica 75-79":     "sb 75-79",
    "siefore básica 80-84":     "sb 80-84",
    "siefore básica 85-89":     "sb 85-89",
    "siefore básica 90-94":     "sb 90-94",
    "siefore básica 95-99":     "sb 95-99",
    "siefore básica inicial":   "sb0",
    "siefore básica pensiones": "sb_pensiones",
}

# Categoria que se IGNORA cuando aparece con sub-variants (siefore real viene del decompose)
SIEFORE_CATEGORIA_AGREGADA = "siefores adicionales"

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

    # Reuso 100% de #10 (mismos 17 strings exactos en #03)
    asa_10 = {}
    for line in psql_query(db, "SELECT alias_text, afore_id, siefore_id FROM consar.afore_siefore_alias WHERE fuente_csv='#10';"):
        alias_text, afore_id, siefore_id = line.split("\t")
        asa_10[alias_text] = (int(afore_id), int(siefore_id))

    metrica_slug_to_id = {}
    metrica_col_to_id = {}
    for line in psql_query(db, "SELECT slug, columna_csv, id FROM consar.cat_metrica_sensibilidad;"):
        slug, col, _id = line.split("\t")
        metrica_slug_to_id[slug] = int(_id)
        metrica_col_to_id[col] = int(_id)

    print(f"    canonical afores: {len(canonical)}  (expected 11)")
    print(f"    aliases afore: {len(aliases)}")
    print(f"    cat_siefore: {len(siefore_slug)}  (expected 28)")
    print(f"    afore_siefore_alias #10: {len(asa_10)}  (expected 17)")
    print(f"    cat_metrica_sensibilidad: {len(metrica_col_to_id)}  (expected 7)")
    return canonical, aliases, siefore_slug, asa_10, metrica_col_to_id


def emit_long_rows(row, canonical, aliases, siefore_slug, asa_10, metrica_col_to_id):
    """Yield (afore_id, siefore_id, metrica_id, fecha, valor_str) tuples for non-empty cells.
    Returns also a classification note (canonical | subvariant_decomposed | error_*) for counters."""
    afore_str = row["afore"]
    siefore_str = row["siefore"]
    fecha = row["fecha"]

    # Caso A: afore canonical
    if afore_str in canonical:
        af_id = canonical[afore_str]
        # siefore via ALIAS_03_NL_TO_SLUG
        slug = ALIAS_03_NL_TO_SLUG.get(siefore_str)
        if slug is None:
            return [], f"unknown_siefore_canonical: {siefore_str!r}"
        sf_id = siefore_slug.get(slug)
        if sf_id is None:
            return [], f"unknown_siefore_slug: {slug!r}"
        return _emit_metrics(row, af_id, sf_id, fecha, metrica_col_to_id), "canonical"

    # Caso B: afore sub-variant (decompose vía afore_siefore_alias #10)
    if afore_str in asa_10:
        af_id, sf_id = asa_10[afore_str]
        # siefore_str debe ser 'siefores adicionales' (categoría) — IGNORADO
        if siefore_str != SIEFORE_CATEGORIA_AGREGADA:
            return [], f"subvariant_unexpected_siefore: afore={afore_str!r} siefore={siefore_str!r}"
        return _emit_metrics(row, af_id, sf_id, fecha, metrica_col_to_id), "subvariant_decomposed"

    # alias standalone (xxi-banorte standalone) — no esperado en #03
    if afore_str in aliases:
        return [], f"unexpected_alias_standalone: {afore_str!r}"

    return [], f"unknown_afore: {afore_str!r}"


def _emit_metrics(row, af_id, sf_id, fecha, metrica_col_to_id):
    """Emit up to 7 long rows (one per non-empty metric cell)."""
    out = []
    for col in METRIC_COLUMNS:
        v = row[col]
        if v == "" or v is None:
            continue
        m_id = metrica_col_to_id[col]
        out.append((af_id, sf_id, m_id, fecha, v))
    return out


def fmt_decimal(v):
    return str(v)


def build_insert_statements(long_rows):
    stmts = []
    BATCH = 1000
    for i in range(0, len(long_rows), BATCH):
        batch = long_rows[i:i+BATCH]
        values = ",\n  ".join(
            f"({af}, {sf}, {m}, '{f}', {fmt_decimal(v)})"
            for (af, sf, m, f, v) in batch
        )
        stmts.append(
            f"INSERT INTO consar.medida_sensibilidad (afore_id, siefore_id, metrica_id, fecha, valor) VALUES\n  {values};"
        )
    return stmts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", choices=["local", "neon"], required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--truncate-first", action="store_true")
    args = parser.parse_args()

    print(f"=== Ingest CONSAR #03 → {args.db} {'(APPLY)' if args.apply else '(DRY-RUN)'} ===")

    actual_md5 = md5_of(CSV_PATH)
    assert actual_md5 == EXPECTED_MD5, f"md5 mismatch: {actual_md5} vs {EXPECTED_MD5}"
    print(f"  CSV md5: {actual_md5} ✓")

    canonical, aliases, siefore_slug, asa_10, metrica_col_to_id = load_lookup_maps(args.db)

    long_rows = []
    errors = []
    counters = Counter()
    metric_counts = Counter()
    sub_decomposed_wide = 0
    canonical_wide = 0

    with CSV_PATH.open(newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            emitted, note = emit_long_rows(row, canonical, aliases, siefore_slug, asa_10, metrica_col_to_id)
            counters[note] += 1
            if note == "canonical":
                canonical_wide += 1
                long_rows.extend(emitted)
                for tup in emitted:
                    metric_counts[(note, tup[2])] += 1
            elif note == "subvariant_decomposed":
                sub_decomposed_wide += 1
                long_rows.extend(emitted)
                for tup in emitted:
                    metric_counts[(note, tup[2])] += 1
            else:
                errors.append((row, note))

    canonical_long = sum(c for k, c in metric_counts.items() if k[0] == "canonical")
    subvariant_long = sum(c for k, c in metric_counts.items() if k[0] == "subvariant_decomposed")

    print(f"\n  CSV wide rows: {EXPECTED_WIDE_ROWS}")
    print(f"  → wide canonical:           {canonical_wide}")
    print(f"  → wide subvariant_decomposed: {sub_decomposed_wide}")
    print(f"  → wide errors/unmapped:     {len(errors)}")
    print(f"  → wide total processed:     {canonical_wide + sub_decomposed_wide + len(errors)}")
    print()
    print(f"  Long rows total: {len(long_rows)}  (expected {EXPECTED_LONG_ROWS})")
    print(f"  → canonical long:    {canonical_long}  (expected {EXPECTED_CANONICAL_LONG})")
    print(f"  → subvariant long:   {subvariant_long}  (expected {EXPECTED_SUBVARIANT_LONG})")
    print(f"  Counters wide: {dict(counters)}")
    print()
    print(f"  Long rows per metric (canonical / subvariant):")
    for mc in sorted(set(k[1] for k in metric_counts)):
        cn = metric_counts.get(("canonical", mc), 0)
        sv = metric_counts.get(("subvariant_decomposed", mc), 0)
        print(f"    metrica_id={mc}  canonical={cn:>5}  subvariant={sv:>5}")

    if errors:
        print(f"\n  First 5 errors: {errors[:5]}")
        sys.exit(1)
    assert canonical_wide + sub_decomposed_wide == EXPECTED_WIDE_ROWS, f"wide row mismatch"
    assert len(long_rows) == EXPECTED_LONG_ROWS, f"long row mismatch: {len(long_rows)} vs {EXPECTED_LONG_ROWS}"
    print("  ✓ Counts match expected")

    if not args.apply:
        print("\n  [DRY-RUN] No DB write. Pass --apply to commit.")
        return

    pre = []
    if args.truncate_first:
        pre.append("TRUNCATE consar.medida_sensibilidad;")
    stmts = build_insert_statements(long_rows)
    print(f"\n  Generated {len(stmts)} INSERT batches")

    full = "BEGIN;\n" + "\n".join(pre + stmts) + "\nCOMMIT;\n"
    print(f"  Executing on {args.db}...")
    psql_exec_file(args.db, full)

    out_count = psql_query(args.db, "SELECT COUNT(*) FROM consar.medida_sensibilidad;")[0]
    print(f"\n  POST-INSERT count on {args.db}: {out_count}  (expected {len(long_rows)})")
    assert int(out_count) == len(long_rows)
    print("  ✓ Counts match")


if __name__ == "__main__":
    main()
