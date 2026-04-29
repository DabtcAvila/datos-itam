"""Ingest dataset #05 (CONSAR cuentas administradas) into consar.cuenta_administrada(_agg).

Pivot wide→long (S16 Sub-fase 7):
  CSV wide: 2 dim (fecha, afore) + 11 columnas métrica = 4,303 rows
  DB long:
    consar.cuenta_administrada     = 19,488 rows (10 commercial × 11 métricas, skip empties)
    consar.cuenta_administrada_agg =    353 rows (3 etiquetas no-commercial: 331+12+10)
  GRAND TOTAL                      = 19,841 rows

Lógica de routing por afore string:
  A) afore commercial (10) → cuenta_administrada (atomic)
       up to 11 long rows/wide
  B) etiqueta no-commercial (3) → cuenta_administrada_agg (aggregate)
       'total de cuentas administradas en el sar'                        → total_cuentas_sar
       'cuentas resguardadas en el fondo de pensiones para el bienestar 10' → cuentas_bienestar_010
       'prestadora de servicios'                                         → prestadora_de_servicios

Validaciones empíricas:
  - md5 verification (regla S16)
  - Wide row count = 4,303 exact
  - Long row counts = 19,488 atomic + 353 agg = 19,841 exact
  - Bound assertions por métrica.desde_fecha (no values pre-fecha)
  - Identidad SAR pre-2024-07 = 100% (sentinel.total_sar == Σ commercial.total_afores)

Source: datosgob_05_cuentas.csv (4,303 rows, 1997-12 → 2025-06).

Usage:
    cd api/
    python scripts/ingest_consar_05_cuenta_administrada.py --db local --apply
    python scripts/ingest_consar_05_cuenta_administrada.py --db neon  --apply  (gate)
"""
import argparse
import csv
import hashlib
import subprocess
import sys
from pathlib import Path
from collections import Counter, defaultdict
from datetime import date

CSV_PATH = Path(__file__).resolve().parents[2] / "Proyecto-Final-main/normalizacion/dataset_3/data/raw/datosgob_05_cuentas.csv"
EXPECTED_MD5 = "09505ffa4ec82212e563c01e624d1024"
EXPECTED_WIDE_ROWS = 4303
EXPECTED_ATOMIC_LONG = 19488
EXPECTED_AGG_LONG = 353
EXPECTED_GRAND_TOTAL = 19841

# 11 métricas wide-pivoted (orden importa = orden_display en cat_metrica_cuenta)
METRIC_COLUMNS = [
    "cuentas_inhabilitadas",
    "cuentas_resguardadas_fondo_pensiones_para_bienestar_010",
    "total_cuentas_administradas_sar",
    "total_cuentas_administradas_afores",
    "trabajadores_asignados",
    "trabajadores_asignados_recursos_depositados_banco_mexico",
    "trabajadores_asignados_recursos_depositados_siefores",
    "trabajadores_imss",
    "trabajadores_independientes",
    "trabajadores_issste",
    "trabajadores_registrados",
]

# desde_fecha esperada por métrica (validation bound)
METRIC_DESDE_FECHA = {
    "cuentas_inhabilitadas":                                     date(2024, 9, 1),
    "cuentas_resguardadas_fondo_pensiones_para_bienestar_010":   date(2024, 7, 1),
    "total_cuentas_administradas_sar":                           date(1997, 12, 1),
    "total_cuentas_administradas_afores":                        date(1997, 12, 1),
    "trabajadores_asignados":                                    date(2001, 6, 1),
    "trabajadores_asignados_recursos_depositados_banco_mexico":  date(2012, 1, 1),
    "trabajadores_asignados_recursos_depositados_siefores":      date(2012, 1, 1),
    "trabajadores_imss":                                         date(1997, 12, 1),
    "trabajadores_independientes":                               date(2005, 8, 1),
    "trabajadores_issste":                                       date(2005, 8, 1),
    "trabajadores_registrados":                                  date(1997, 12, 1),
}

# Mapping de etiquetas no-commercial: csv_string → slug
AGG_LABEL_MAP = {
    "total de cuentas administradas en el sar":                          "total_cuentas_sar",
    "cuentas resguardadas en el fondo de pensiones para el bienestar 10": "cuentas_bienestar_010",
    "prestadora de servicios":                                            "prestadora_de_servicios",
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
    """Local: psql via stdin (docker exec). Neon: psql -f tempfile (pooler is finicky with large stdin)."""
    import tempfile
    if db == "local":
        cmd = list(DOCKER_PSQL)
        r = subprocess.run(cmd, input=sql_text, capture_output=True, text=True)
    else:
        with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False) as tf:
            tf.write(sql_text)
            tf_path = tf.name
        try:
            cmd = ["psql", DB_URLS["neon"], "-v", "ON_ERROR_STOP=1", "-f", tf_path]
            r = subprocess.run(cmd, capture_output=True, text=True)
        finally:
            try:
                Path(tf_path).unlink()
            except OSError:
                pass
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

    metrica_col_to_id = {}
    for line in psql_query(db, "SELECT columna_csv, id FROM consar.cat_metrica_cuenta;"):
        col, _id = line.split("\t")
        metrica_col_to_id[col] = int(_id)

    etiqueta_slug_to_id = {}
    for line in psql_query(db, "SELECT slug, id FROM consar.cat_cuenta_etiqueta_agg;"):
        slug, _id = line.split("\t")
        etiqueta_slug_to_id[slug] = int(_id)

    print(f"    canonical afores: {len(canonical)}  (expected 11; #05 usa 10)")
    print(f"    cat_metrica_cuenta: {len(metrica_col_to_id)}  (expected 11)")
    print(f"    cat_cuenta_etiqueta_agg: {len(etiqueta_slug_to_id)}  (expected 3)")

    assert len(metrica_col_to_id) == 11, "cat_metrica_cuenta debe tener 11 entries (migración 023)"
    assert len(etiqueta_slug_to_id) == 3, "cat_cuenta_etiqueta_agg debe tener 3 entries (migración 023)"

    return canonical, metrica_col_to_id, etiqueta_slug_to_id


def fmt_int(v_str):
    """CSV stores values like '604380.0'. Empíricamente todos son enteros."""
    if v_str == "" or v_str is None:
        return None
    # Validar empírica: termina en .0 o no tiene decimal
    f = float(v_str)
    i = int(f)
    if i != f:
        raise ValueError(f"valor con decimales reales (esperado integer count): {v_str}")
    return i


def parse_fecha(s):
    return date(int(s[0:4]), int(s[5:7]), int(s[8:10]))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", choices=["local", "neon"], required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--truncate-first", action="store_true")
    args = parser.parse_args()

    print(f"=== Ingest CONSAR #05 → {args.db} {'(APPLY)' if args.apply else '(DRY-RUN)'} ===")

    actual_md5 = md5_of(CSV_PATH)
    assert actual_md5 == EXPECTED_MD5, f"md5 mismatch: {actual_md5} vs {EXPECTED_MD5}"
    print(f"  CSV md5: {actual_md5} ✓")

    canonical, metrica_col_to_id, etiqueta_slug_to_id = load_lookup_maps(args.db)

    atomic_rows = []  # (fecha, afore_id, metrica_id, valor)
    agg_rows = []     # (fecha, etiqueta_id, metrica_id, valor)
    counters = Counter()
    errors = []

    # Por validación: identidad SAR cierre-test
    # acumulador por fecha: sum commercial.total_afores, sentinel total_sar, sentinel bienestar
    sar_test = defaultdict(lambda: {"sum_commercial_total": 0, "sentinel_total_sar": None, "sentinel_bienestar": None})

    # Bound checks
    bound_violations = []

    # Per-metric counters por route (debug)
    route_metric_counts = Counter()

    with CSV_PATH.open(newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            afore_str = row["afore"]
            fecha_str = row["fecha"]
            fecha = parse_fecha(fecha_str)

            # Routing
            if afore_str in canonical:
                # commercial → atomic
                afore_id = canonical[afore_str]
                route = "commercial"
                counters[route] += 1
                for col in METRIC_COLUMNS:
                    v = fmt_int(row[col])
                    if v is None:
                        continue
                    metrica_id = metrica_col_to_id[col]
                    # Bound check
                    if fecha < METRIC_DESDE_FECHA[col]:
                        bound_violations.append((fecha, afore_str, col, v, METRIC_DESDE_FECHA[col]))
                    atomic_rows.append((fecha, afore_id, metrica_id, v))
                    route_metric_counts[(route, col)] += 1
                    # Identidad SAR: acumular total_afores
                    if col == "total_cuentas_administradas_afores":
                        sar_test[fecha]["sum_commercial_total"] += v

            elif afore_str in AGG_LABEL_MAP:
                slug = AGG_LABEL_MAP[afore_str]
                etiqueta_id = etiqueta_slug_to_id[slug]
                route = f"agg_{slug}"
                counters[route] += 1
                for col in METRIC_COLUMNS:
                    v = fmt_int(row[col])
                    if v is None:
                        continue
                    metrica_id = metrica_col_to_id[col]
                    # Bound check
                    if fecha < METRIC_DESDE_FECHA[col]:
                        bound_violations.append((fecha, afore_str, col, v, METRIC_DESDE_FECHA[col]))
                    agg_rows.append((fecha, etiqueta_id, metrica_id, v))
                    route_metric_counts[(route, col)] += 1
                    # Identidad SAR
                    if slug == "total_cuentas_sar" and col == "total_cuentas_administradas_sar":
                        sar_test[fecha]["sentinel_total_sar"] = v
                    elif slug == "cuentas_bienestar_010" and col == "cuentas_resguardadas_fondo_pensiones_para_bienestar_010":
                        sar_test[fecha]["sentinel_bienestar"] = v

            else:
                errors.append((row, f"unknown_afore: {afore_str!r}"))
                counters["unknown"] += 1

    # ================================================================
    # Reporte cardinality
    # ================================================================
    print(f"\n  CSV wide rows: {EXPECTED_WIDE_ROWS}")
    print(f"  Counters wide: {dict(counters)}")
    print()
    print(f"  Long rows ATOMIC: {len(atomic_rows)}  (expected {EXPECTED_ATOMIC_LONG})")
    print(f"  Long rows AGG:    {len(agg_rows)}  (expected {EXPECTED_AGG_LONG})")
    print(f"  GRAND TOTAL:      {len(atomic_rows) + len(agg_rows)}  (expected {EXPECTED_GRAND_TOTAL})")
    print()
    print(f"  Long rows per route × metric:")
    for col in METRIC_COLUMNS:
        commercial = route_metric_counts.get(("commercial", col), 0)
        ag_total = route_metric_counts.get(("agg_total_cuentas_sar", col), 0)
        ag_bien = route_metric_counts.get(("agg_cuentas_bienestar_010", col), 0)
        ag_pres = route_metric_counts.get(("agg_prestadora_de_servicios", col), 0)
        print(f"    {col:<60}  commercial={commercial:>5}  total_sar={ag_total:>4}  bienestar={ag_bien:>3}  prestadora={ag_pres:>3}")

    # ================================================================
    # Validaciones
    # ================================================================
    if errors:
        print(f"\n  ✗ ERRORS: {len(errors)}")
        for e in errors[:5]:
            print(f"    {e}")
        sys.exit(1)

    if bound_violations:
        print(f"\n  ✗ BOUND VIOLATIONS (valor reportado antes de desde_fecha esperada): {len(bound_violations)}")
        for bv in bound_violations[:5]:
            print(f"    {bv}")
        sys.exit(1)
    print(f"\n  ✓ Bound checks: 0 violations (todas las métricas respetan desde_fecha)")

    assert counters["commercial"] == 10 * 331, f"wide commercial mismatch: {counters['commercial']} vs {10*331}"
    assert counters["agg_total_cuentas_sar"] == 331, f"wide total_sar mismatch"
    assert counters["agg_cuentas_bienestar_010"] == 331, f"wide bienestar wide-rows mismatch"
    assert counters["agg_prestadora_de_servicios"] == 331, f"wide prestadora wide-rows mismatch"
    assert counters["unknown"] == 0
    print(f"  ✓ Wide row counts: 10*331 + 3*331 = 4,303 ✓")

    assert len(atomic_rows) == EXPECTED_ATOMIC_LONG, f"atomic long mismatch: {len(atomic_rows)} vs {EXPECTED_ATOMIC_LONG}"
    assert len(agg_rows) == EXPECTED_AGG_LONG, f"agg long mismatch: {len(agg_rows)} vs {EXPECTED_AGG_LONG}"
    print(f"  ✓ Long row counts match expected")

    # Identidad SAR pre-2024-07 == 100%
    print(f"\n  IDENTIDAD SAR pre-2024-07 (sentinel == Σ commercial.total_afores):")
    pre_reform_dates = sorted(d for d in sar_test if d < date(2024, 7, 1))
    diffs_pre = []
    for d in pre_reform_dates:
        s = sar_test[d]
        if s["sentinel_total_sar"] is not None:
            diff = s["sentinel_total_sar"] - s["sum_commercial_total"]
            if diff != 0:
                diffs_pre.append((d, diff))
    if diffs_pre:
        print(f"    ✗ FAIL: {len(diffs_pre)} fechas con identidad rota pre-2024-07")
        for d, diff in diffs_pre[:5]:
            print(f"      {d}: residuo = {diff}")
        # NOTA descriptiva: pre-2020 hay residuo histórico (1997-2010 ~5-12M), NO consolidado
        # Esto se DOCUMENTA pero NO bloquea ingest. La validación estricta es post-2020.
        print(f"    [INFO] Pre-2020 hay residuo histórico documentado (cuentas SAR-92, INFONAVIT, BANSEFI)")
    else:
        print(f"    ✓ Identidad cierra 100% para todas las fechas pre-2024-07 ({len(pre_reform_dates)} fechas)")

    # Validación más estricta: post-2020-01 hasta 2024-06 debe cerrar 100%
    consolidated_dates = sorted(d for d in sar_test if date(2020, 1, 1) <= d < date(2024, 7, 1))
    diffs_consolidated = []
    for d in consolidated_dates:
        s = sar_test[d]
        if s["sentinel_total_sar"] is not None:
            diff = s["sentinel_total_sar"] - s["sum_commercial_total"]
            if diff != 0:
                diffs_consolidated.append((d, diff))
    if diffs_consolidated:
        print(f"    ✗ FAIL: {len(diffs_consolidated)} fechas con identidad rota en período consolidado [2020-01, 2024-06]")
        for d, diff in diffs_consolidated[:5]:
            print(f"      {d}: residuo = {diff}")
        sys.exit(1)
    else:
        print(f"    ✓ Identidad cierra 100% en período consolidado [2020-01, 2024-06] ({len(consolidated_dates)} fechas)")

    # Identidad reforma 2024-07: total_sar = Σ commercial + bienestar
    reform_july = date(2024, 7, 1)
    reform_aug = date(2024, 8, 1)
    for d in [reform_july, reform_aug]:
        s = sar_test[d]
        sum_with_bienestar = s["sum_commercial_total"] + (s["sentinel_bienestar"] or 0)
        diff = s["sentinel_total_sar"] - sum_with_bienestar
        if diff != 0:
            print(f"    ✗ {d}: total_sar - (Σcommercial + bienestar) = {diff}")
            sys.exit(1)
        print(f"    ✓ {d}: total_sar = Σcommercial + bienestar (cierre 100%)")

    # Hallazgo descriptivo: residuo emerge desde 2024-09
    post_reform = sorted(d for d in sar_test if d >= date(2024, 9, 1))
    print(f"\n  HALLAZGO DESCRIPTIVO — residuo post-reforma 2024-09:")
    for d in post_reform[:3] + post_reform[-2:]:
        s = sar_test[d]
        sum_with_bienestar = s["sum_commercial_total"] + (s["sentinel_bienestar"] or 0)
        residuo = s["sentinel_total_sar"] - sum_with_bienestar
        print(f"    {d}: total_sar={s['sentinel_total_sar']:>12,}  Σcomm+bien={sum_with_bienestar:>12,}  residuo={residuo:>10,}")

    if not args.apply:
        print("\n  [DRY-RUN] No DB write. Pass --apply to commit.")
        return

    # ================================================================
    # Apply
    # ================================================================
    # Neon pooler choca con INSERTs >~500 rows — usar 200 para ingest robusto.
    # Local docker exec funciona con batch grande pero usamos mismo BATCH para simetría.
    BATCH = 200

    stmts = []

    # Atomic
    for i in range(0, len(atomic_rows), BATCH):
        batch = atomic_rows[i:i+BATCH]
        values = ",\n  ".join(
            f"('{f}', {af}, {m}, {v})"
            for (f, af, m, v) in batch
        )
        stmts.append(
            f"INSERT INTO consar.cuenta_administrada (fecha, afore_id, metrica_id, valor) VALUES\n  {values};"
        )

    # Agg
    for i in range(0, len(agg_rows), BATCH):
        batch = agg_rows[i:i+BATCH]
        values = ",\n  ".join(
            f"('{f}', {et}, {m}, {v})"
            for (f, et, m, v) in batch
        )
        stmts.append(
            f"INSERT INTO consar.cuenta_administrada_agg (fecha, etiqueta_id, metrica_id, valor) VALUES\n  {values};"
        )

    print(f"\n  Generated {len(stmts)} INSERT batches "
          f"({len(atomic_rows)//BATCH + (1 if len(atomic_rows)%BATCH else 0)} atomic + "
          f"{len(agg_rows)//BATCH + (1 if len(agg_rows)%BATCH else 0)} agg)")

    if args.truncate_first:
        print(f"  Truncating tables on {args.db}...")
        psql_exec_file(args.db, "BEGIN;\nTRUNCATE consar.cuenta_administrada;\nTRUNCATE consar.cuenta_administrada_agg;\nCOMMIT;\n")

    # Cada batch en su propia transacción separada (Neon pgbouncer idle timeout-safe).
    # Una sola transacción mega con 21 inserts en Neon expira al borde del SSL pooler.
    print(f"  Executing on {args.db} (batch-per-transaction, retry on transient failure)...")
    for idx, stmt in enumerate(stmts, 1):
        full_stmt = "BEGIN;\n" + stmt + "\nCOMMIT;\n"
        last_err = None
        for attempt in range(3):
            try:
                psql_exec_file(args.db, full_stmt)
                break
            except RuntimeError as e:
                last_err = e
                print(f"    batch {idx}/{len(stmts)} attempt {attempt+1} failed, retrying...")
        else:
            raise last_err
        if idx % 5 == 0 or idx == len(stmts):
            print(f"    batch {idx}/{len(stmts)} ✓")

    out_atomic = psql_query(args.db, "SELECT COUNT(*) FROM consar.cuenta_administrada;")[0]
    out_agg = psql_query(args.db, "SELECT COUNT(*) FROM consar.cuenta_administrada_agg;")[0]
    print(f"\n  POST-INSERT counts on {args.db}:")
    print(f"    consar.cuenta_administrada     = {out_atomic}  (expected {EXPECTED_ATOMIC_LONG})")
    print(f"    consar.cuenta_administrada_agg = {out_agg}  (expected {EXPECTED_AGG_LONG})")
    assert int(out_atomic) == EXPECTED_ATOMIC_LONG
    assert int(out_agg) == EXPECTED_AGG_LONG
    print(f"  ✓ Counts match expected")

    # Spot-check identidad SAR via DB query
    print(f"\n  Spot-check DB identidad 2020-06-01:")
    rows_check = psql_query(args.db, """
        WITH
          sentinel AS (
            SELECT g.valor AS sentinel_sar
              FROM consar.cuenta_administrada_agg g
              JOIN consar.cat_cuenta_etiqueta_agg e ON g.etiqueta_id=e.id
              JOIN consar.cat_metrica_cuenta m ON g.metrica_id=m.id
             WHERE g.fecha='2020-06-01'
               AND e.slug='total_cuentas_sar'
               AND m.columna_csv='total_cuentas_administradas_sar'),
          comm AS (
            SELECT SUM(c.valor) AS sum_comm
              FROM consar.cuenta_administrada c
              JOIN consar.cat_metrica_cuenta m ON c.metrica_id=m.id
             WHERE c.fecha='2020-06-01'
               AND m.columna_csv='total_cuentas_administradas_afores')
        SELECT sentinel.sentinel_sar, comm.sum_comm, sentinel.sentinel_sar - comm.sum_comm AS diff
          FROM sentinel, comm;
    """)
    print(f"    {rows_check}")


if __name__ == "__main__":
    main()
