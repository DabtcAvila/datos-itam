"""Ingest dataset #11 (CONSAR precio_gestion) into consar.precio_gestion via BATCH INSERT.

Estrategia BATCH=200 INSERT VALUES (S16 Sub-fase 9 — pattern Sub-fase 7+8):
  - 588,317 rows efectivos (588,318 CSV − 1 empty skip).
  - Pre-resolución en memoria: afore + siefore strings → IDs vía dicts cargados de DB.
  - PK collision check in-memory PRE-INSERT (fail-fast si >0).
  - Skip 1 empty precio (row 120594 = 2015-08-12/citibanamex/siav).
  - psql -f tempfile.sql con BEGIN+INSERT VALUES (200 rows)+COMMIT por batch.
  - retry 5× con captura subprocess.TimeoutExpired (timeout=60s).
  - Resume mode --skip-rows N para reanudar desde batch parcial.
  - Tempfile cleanup en finally.

Performance esperada (replicado de Sub-fase 8 #01):
  - Pass 1 (read+resolve+collision): ~10s
  - Local docker INSERT VALUES BATCH=200: ~5-10 min
  - Neon INSERT VALUES BATCH=200: ~30 min (rate ~250 rows/s observado en #01)

Source: datosgob_11_precios_gestion_siefores.csv (588,318 rows, 1997-01-07 → 2025-12-06).

Mapping afore strings (11 → 10 afore_ids post-merge):
  azteca → 7         banamex → 3 (mergea con citibanamex)
  coppel → 5         inbursa → 10
  invercap → 9       principal → 8
  profuturo → 1      sura → 4
  xxi-banorte → 2 (alias guion)        xxi → 2 (legacy ≤2012, alias)
  citibanamex → 3 (alias rebrand, MERGE con banamex)

NO aparece pensionissste (afore_id=6) en #11. Diferencia estructural vs #01.

Validación empírica disjoint (Sub-fase A):
  - Merge XXI/XXI-Banorte: xxi cubre sb5 ÚNICA (3,664), xxi-banorte cubre 17
    siefores ≠ sb5 (101,394). Disjoint perfecto en siefore.
  - Merge banamex+citibanamex: banamex 10 siefores (56,568), citibanamex 2
    disjoint sb 55-59 + siav (10,642 − 1 empty skip). Pattern idéntico a #01.
  - PK collisions in-memory post-resolución: 0.

Usage:
    cd api/
    python scripts/ingest_consar_11_precio_gestion.py --db local --apply
    python scripts/ingest_consar_11_precio_gestion.py --db neon  --apply  (gate, ~30 min)
    python scripts/ingest_consar_11_precio_gestion.py --db neon  --apply --skip-rows 100000  (resume)
"""
import argparse
import csv
import hashlib
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from collections import Counter

CSV_PATH = Path(__file__).resolve().parents[2] / "Proyecto-Final-main/normalizacion/dataset_3/data/raw/datosgob_11_precios_gestion_siefores.csv"
EXPECTED_MD5 = "440b156aea6b319b370d78aa5a699efe"
EXPECTED_CSV_LINES = 588318  # data rows in CSV (sin contar header)
EXPECTED_ROWS = 588317       # efectivos post-skip de 1 empty
EXPECTED_SKIPPED_EMPTY = 1   # row 120594 (2015-08-12/citibanamex/siav)
EXPECTED_DISTINCT_FECHAS = 7060
EXPECTED_DISTINCT_PAIRS = 114

# Distribución esperada por afore_id (post-merge banamex+citibanamex y xxi+xxi-banorte)
EXPECTED_AFORE_COUNTS = {
    1:   74694,   # profuturo
    2:  105058,   # xxi_banorte (101,394) + xxi legacy (3,664)
    3:   67210,   # banamex (56,568) + citibanamex (10,642 post-skip empty)
    4:   63406,   # sura
    5:   47838,   # coppel
    # 6 (pensionissste): 0 — NO aparece en #11
    7:   53382,   # azteca
    8:   63406,   # principal
    9:   49917,   # invercap
    10:  63406,   # inbursa
}

DB_URLS = {
    "local":        "postgresql://datos_public:datos_public_2026@localhost:54322/remuneraciones_cdmx",
    "neon":         "postgresql://neondb_owner:npg_GdjNhW7S5ACu@ep-broad-shadow-anxgp6d8-pooler.c-6.us-east-1.aws.neon.tech/remuneraciones_cdmx?sslmode=require",
}

DOCKER_PSQL = ["docker", "exec", "-i", "ProyectoDATOS-public-v1-DB",
               "psql", "-U", "datos_public", "-d", "remuneraciones_cdmx"]


def md5_of(path):
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def psql_query(db, sql):
    if db == "local":
        cmd = list(DOCKER_PSQL) + ["-tAF\t", "-c", sql]
    else:
        cmd = ["psql", DB_URLS["neon"], "-tAF\t", "-c", sql]
    r = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return r.stdout.strip().split("\n") if r.stdout.strip() else []


def load_lookup_maps(db):
    """Load afore + cat_siefore + afore_alias from DB."""
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

    print(f"    canonical afores: {len(canonical)}  (expected 11)")
    print(f"    afore_alias: {len(aliases)}  (expected 3 — xxi-banorte, xxi, citibanamex)")
    print(f"    cat_siefore: {len(siefore_slug)}  (expected 28)")

    assert len(canonical) == 11, "consar.afores debe tener 11 entries"
    assert len(siefore_slug) == 28, "consar.cat_siefore debe tener 28 entries"
    assert "xxi" in aliases, "afore_alias debe incluir 'xxi' (legacy ≤2012)"
    assert "xxi-banorte" in aliases, "afore_alias debe incluir 'xxi-banorte'"
    assert "citibanamex" in aliases, "afore_alias debe incluir 'citibanamex'"
    assert "sb5" in siefore_slug, "cat_siefore debe incluir slug 'sb5' (legacy XXI)"

    return canonical, aliases, siefore_slug


def resolve_afore(s, canonical, aliases):
    """Resolve afore string to afore_id via canonical first, then alias."""
    if s in canonical:
        return canonical[s]
    if s in aliases:
        return aliases[s]
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", choices=["local", "neon"], required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--truncate-first", action="store_true")
    parser.add_argument("--skip-rows", type=int, default=0,
                        help="Skip first N rows (resume mode). Asume DB ya tiene exactamente esos rows en orden.")
    args = parser.parse_args()

    print(f"=== Ingest CONSAR #11 → {args.db} {'(APPLY BATCH INSERT)' if args.apply else '(DRY-RUN)'} ===")

    actual_md5 = md5_of(CSV_PATH)
    assert actual_md5 == EXPECTED_MD5, f"md5 mismatch: {actual_md5} vs {EXPECTED_MD5}"
    print(f"  CSV md5: {actual_md5} ✓")

    canonical, aliases, siefore_slug = load_lookup_maps(args.db)

    # ============================================================
    # Pass 1: pre-resolve all rows in memory + PK collision check
    # ============================================================
    print(f"\n  Pass 1: read CSV + resolve IDs + skip empty + PK collision check...")
    t0 = time.time()

    resolved = []  # (fecha, afore_id, siefore_id, precio_str)
    pk_seen = set()
    pk_collisions = []
    unmapped_afore = Counter()
    unmapped_siefore = Counter()
    afore_counts = Counter()
    skipped_empty = 0
    skipped_empty_rows = []

    with CSV_PATH.open(newline="") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=2):  # start=2 (header is line 1)
            af_str = row["afore"]
            sf_str = row["siefore"]
            fecha = row["fecha"]
            precio = row["precio"]

            if precio == "" or precio is None:
                skipped_empty += 1
                skipped_empty_rows.append((row_idx, fecha, af_str, sf_str))
                continue

            af_id = resolve_afore(af_str, canonical, aliases)
            if af_id is None:
                unmapped_afore[af_str] += 1
                continue
            sf_id = siefore_slug.get(sf_str)
            if sf_id is None:
                unmapped_siefore[sf_str] += 1
                continue

            pk = (fecha, af_id, sf_id)
            if pk in pk_seen:
                pk_collisions.append((pk, af_str, sf_str, precio))
            else:
                pk_seen.add(pk)
                resolved.append((fecha, af_id, sf_id, precio))
                afore_counts[af_id] += 1

    pass1_secs = time.time() - t0
    print(f"    rows resolved:    {len(resolved)}")
    print(f"    skipped (empty precio): {skipped_empty}")
    for r in skipped_empty_rows:
        print(f"      row {r[0]}: fecha={r[1]} afore={r[2]} siefore={r[3]}")
    print(f"    pass 1 elapsed:   {pass1_secs:.2f}s")

    if unmapped_afore:
        print(f"\n  ✗ UNMAPPED afore strings: {dict(unmapped_afore)}")
        sys.exit(1)
    if unmapped_siefore:
        print(f"\n  ✗ UNMAPPED siefore strings: {dict(unmapped_siefore)}")
        sys.exit(1)
    if pk_collisions:
        print(f"\n  ✗ PK COLLISIONS: {len(pk_collisions)}")
        for c in pk_collisions[:5]:
            print(f"    {c}")
        sys.exit(1)
    print(f"  ✓ Resolución completa: 0 unmapped, 0 PK collisions")

    # Validar count + distribución por afore_id
    assert skipped_empty == EXPECTED_SKIPPED_EMPTY, f"skipped_empty mismatch: {skipped_empty} vs {EXPECTED_SKIPPED_EMPTY}"
    assert len(resolved) == EXPECTED_ROWS, f"row count mismatch: {len(resolved)} vs {EXPECTED_ROWS}"
    print(f"  ✓ Total rows: {len(resolved)} (expected {EXPECTED_ROWS})")
    print(f"  ✓ Skipped empty: {skipped_empty} (expected {EXPECTED_SKIPPED_EMPTY})")

    print(f"\n  Distribución por afore_id (in-memory):")
    for af_id in sorted(EXPECTED_AFORE_COUNTS):
        actual = afore_counts.get(af_id, 0)
        expected = EXPECTED_AFORE_COUNTS[af_id]
        ok = "✓" if actual == expected else "✗"
        print(f"    afore_id={af_id:>2}  actual={actual:>6}  expected={expected:>6}  {ok}")
        if actual != expected:
            print(f"      MISMATCH afore_id={af_id}")
            sys.exit(1)
    # Verify pensionissste (afore_id=6) NOT present
    if afore_counts.get(6, 0) != 0:
        print(f"  ✗ UNEXPECTED rows for afore_id=6 (pensionissste): {afore_counts.get(6)}")
        sys.exit(1)
    print(f"    afore_id= 6  actual=     0  expected=     0  ✓ (PensionISSSTE NO en #11)")

    # Validar 114 distinct (afore_id, siefore_id)
    distinct_pairs = len({(af, sf) for (_, af, sf, _) in resolved})
    distinct_fechas = len({f for (f, _, _, _) in resolved})
    print(f"\n  Distinct pairs (afore × siefore): {distinct_pairs}  (expected {EXPECTED_DISTINCT_PAIRS})")
    print(f"  Distinct fechas:                  {distinct_fechas}  (expected {EXPECTED_DISTINCT_FECHAS})")
    assert distinct_pairs == EXPECTED_DISTINCT_PAIRS
    assert distinct_fechas == EXPECTED_DISTINCT_FECHAS

    # Validar disjointness merge xxi+xxi-banorte (afore_id=2)
    xxi_pairs = {(_f, sf) for (_f, af, sf, _p) in resolved if af == 2}
    sb5_id = siefore_slug["sb5"]
    xxi_sb5 = sum(1 for (_, sf) in xxi_pairs if sf == sb5_id)
    xxi_non_sb5 = sum(1 for (_, sf) in xxi_pairs if sf != sb5_id)
    print(f"\n  Validación disjoint XXI/XXI-Banorte (afore_id=2):")
    print(f"    rows con sb5 (legacy):     {xxi_sb5}  (expected 3,664 → xxi standalone)")
    print(f"    rows con siefore ≠ sb5:    {xxi_non_sb5}  (expected 101,394 → xxi-banorte)")
    assert xxi_sb5 == 3664, f"xxi sb5 count: {xxi_sb5}"
    assert xxi_non_sb5 == 101394, f"xxi-banorte non-sb5 count: {xxi_non_sb5}"

    # Validar disjointness merge banamex+citibanamex (afore_id=3)
    bnmx_pairs_siefores = {sf for (_f, af, sf, _p) in resolved if af == 3}
    sb_55_59_id = siefore_slug["sb 55-59"]
    siav_id = siefore_slug["siav"]
    bnmx_with_55_59 = sum(1 for (_, af, sf, _) in resolved if af == 3 and sf == sb_55_59_id)
    bnmx_with_siav = sum(1 for (_, af, sf, _) in resolved if af == 3 and sf == siav_id)
    print(f"\n  Validación disjoint Banamex/Citibanamex (afore_id=3):")
    print(f"    distinct siefores afore_id=3:  {len(bnmx_pairs_siefores)}  (expected 12 → 10 banamex + 2 citibanamex)")
    print(f"    rows con sb 55-59 (citibanamex): {bnmx_with_55_59}  (expected 6,838)")
    print(f"    rows con siav (citibanamex):     {bnmx_with_siav}  (expected 3,804 post-skip empty)")
    assert len(bnmx_pairs_siefores) == 12, f"banamex+citibanamex distinct siefores: {len(bnmx_pairs_siefores)}"
    assert bnmx_with_55_59 == 6838, f"banamex+citibanamex sb 55-59: {bnmx_with_55_59}"
    assert bnmx_with_siav == 3804, f"banamex+citibanamex siav: {bnmx_with_siav}"
    print(f"  ✓ Cross-validación disjoint XXI×XXI-Banorte y Banamex×Citibanamex OK")

    if not args.apply:
        print(f"\n  [DRY-RUN] No DB write. Pass --apply to commit.")
        return

    # ============================================================
    # Pass 2 + 3: BATCH INSERT VALUES via psql -f tempfile (Sub-fase 7+8 pattern)
    # ============================================================
    if args.truncate_first:
        print(f"\n  Pass 2a: TRUNCATE consar.precio_gestion...")
        psql_query(args.db, "TRUNCATE consar.precio_gestion;")

    if args.db == "local":
        # Local docker: 1 transacción gigante via tempfile funciona (sin pgbouncer)
        print(f"\n  Pass 2: write SQL tempfile + psql -f (local docker, 1 tx)...")
        t0 = time.time()
        sql_fd, sql_path = tempfile.mkstemp(suffix=".sql", prefix="precio_gestion_full_")
        os.close(sql_fd)
        try:
            with open(sql_path, "w", encoding="utf-8") as f:
                f.write("BEGIN;\n")
                # Chunk de 1000 INSERTs por VALUES list para no romper psql line buffer
                CHUNK = 1000
                for i in range(0, len(resolved), CHUNK):
                    chunk = resolved[i:i+CHUNK]
                    f.write("INSERT INTO consar.precio_gestion (fecha, afore_id, siefore_id, precio) VALUES\n")
                    f.write(",\n".join(f"('{fc}', {af}, {sf}, {p})" for (fc, af, sf, p) in chunk))
                    f.write(";\n")
                f.write("COMMIT;\n")
            sql_size = Path(sql_path).stat().st_size
            print(f"    SQL: {sql_path}  size={sql_size/1024/1024:.1f} MB")
            # docker exec -i + cat into psql for stdin
            with open(sql_path) as f:
                content = f.read()
            cmd = list(DOCKER_PSQL) + ["-v", "ON_ERROR_STOP=1"]
            r = subprocess.run(cmd, input=content, capture_output=True, text=True)
            if r.returncode != 0:
                sys.stderr.write(f"INSERT failed:\nSTDOUT: {r.stdout[-2000:]}\nSTDERR: {r.stderr[-2000:]}\n")
                raise RuntimeError("local INSERT failed")
            copy_secs = time.time() - t0
            print(f"    INSERT elapsed: {copy_secs:.2f}s")
        finally:
            try: Path(sql_path).unlink()
            except OSError: pass
    else:
        # Neon: BATCH=200 INSERT VALUES vía psql -f tempfile.sql, retry 5x.
        # 588K / 200 = ~2,942 batches × ~0.8s = ~30 min observado.
        print(f"\n  Pass 2-3: BATCH INSERT VALUES via psql -f tempfile (Sub-fase 7+8 pattern)...")
        BATCH = 200
        n_batches = (len(resolved) + BATCH - 1) // BATCH
        t_start = time.time()
        skip = args.skip_rows
        if skip > 0:
            print(f"    RESUME: skipping first {skip} rows ({skip//BATCH} batches)", flush=True)
        start_idx = skip // BATCH

        for idx in range(start_idx, n_batches):
            chunk = resolved[idx*BATCH:(idx+1)*BATCH]
            t0 = time.time()
            values = ",\n".join(f"('{fc}', {af}, {sf}, {p})" for (fc, af, sf, p) in chunk)
            # ON CONFLICT DO NOTHING para idempotencia frente a silent-commit + retry:
            # si batch attempt 1 commitea pero cliente pierde ACK SSL, attempts 2-5
            # encontrarían PK collision. Validación pre-ingest (in-memory) ya verificó
            # 0 PK collisions reales en CSV.
            sql = f"BEGIN;\nINSERT INTO consar.precio_gestion (fecha, afore_id, siefore_id, precio) VALUES\n{values}\nON CONFLICT (fecha, afore_id, siefore_id) DO NOTHING;\nCOMMIT;\n"
            tf_fd, tf_path = tempfile.mkstemp(suffix=".sql", prefix="precio_gestion_batch_")
            os.close(tf_fd)
            try:
                with open(tf_path, "w") as f:
                    f.write(sql)
                last_err = None
                ok = False
                for attempt in range(5):
                    cmd = ["psql", DB_URLS["neon"], "-v", "ON_ERROR_STOP=1", "-f", tf_path]
                    try:
                        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                        if r.returncode == 0:
                            ok = True
                            break
                        last_err = r.stderr
                    except subprocess.TimeoutExpired:
                        last_err = "subprocess.TimeoutExpired (60s)"
                    print(f"    batch {idx+1} attempt {attempt+1} retry: {last_err[:80] if last_err else 'unknown'}", flush=True)
                    time.sleep(2)
                if not ok:
                    raise RuntimeError(f"batch {idx+1}/{n_batches} failed after 5 attempts: {last_err}")
            finally:
                try: Path(tf_path).unlink()
                except OSError: pass
            elapsed_total = time.time() - t_start
            done = (idx+1) - start_idx
            if (idx+1) % 100 == 0 or idx+1 == n_batches or idx <= start_idx + 2:
                rate = done * BATCH / elapsed_total if elapsed_total > 0 else 0
                eta = (n_batches - idx - 1) * (elapsed_total / max(done, 1))
                print(f"    batch {idx+1}/{n_batches} ({(idx+1)*BATCH:>6} rows) batch_time={time.time()-t0:.2f}s elapsed={elapsed_total:.0f}s rate={rate:.0f}/s eta={eta:.0f}s", flush=True)
        copy_secs = time.time() - t_start
        print(f"    Total elapsed: {copy_secs:.0f}s")

    # ============================================================
    # Pass 4: post-INSERT validations
    # ============================================================
    print(f"\n  Pass 4: post-INSERT validations on {args.db}...")

    cnt = int(psql_query(args.db, "SELECT COUNT(*) FROM consar.precio_gestion;")[0])
    print(f"    COUNT(*):                    {cnt}  (expected {EXPECTED_ROWS}) {'✓' if cnt == EXPECTED_ROWS else '✗'}")
    assert cnt == EXPECTED_ROWS

    cnt_pairs = int(psql_query(args.db,
        "SELECT COUNT(*) FROM (SELECT DISTINCT afore_id, siefore_id FROM consar.precio_gestion) x;"
    )[0])
    print(f"    distinct (afore × siefore):  {cnt_pairs}  (expected {EXPECTED_DISTINCT_PAIRS}) {'✓' if cnt_pairs == EXPECTED_DISTINCT_PAIRS else '✗'}")
    assert cnt_pairs == EXPECTED_DISTINCT_PAIRS

    cnt_fechas = int(psql_query(args.db,
        "SELECT COUNT(DISTINCT fecha) FROM consar.precio_gestion;"
    )[0])
    print(f"    distinct fechas:             {cnt_fechas}  (expected {EXPECTED_DISTINCT_FECHAS}) {'✓' if cnt_fechas == EXPECTED_DISTINCT_FECHAS else '✗'}")
    assert cnt_fechas == EXPECTED_DISTINCT_FECHAS

    # Spot-check 1: 2003-03-17/azteca/sb_1000 = 1.0 (primer row de azteca según CSV head)
    spot1 = psql_query(args.db, """
        SELECT precio FROM consar.precio_gestion p
        JOIN consar.afores a       ON a.id = p.afore_id
        JOIN consar.cat_siefore s  ON s.id = p.siefore_id
        WHERE p.fecha = '2003-03-17' AND a.codigo = 'azteca' AND s.slug = 'sb 1000';
    """)
    print(f"    spot 2003-03-17/azteca/sb_1000:    {spot1[0] if spot1 else 'MISSING'}  (CSV expected 1.0)")
    assert spot1 and float(spot1[0]) == 1.0

    # Spot-check 2: max precio = 24.853032
    spot2 = psql_query(args.db, "SELECT MAX(precio) FROM consar.precio_gestion;")[0]
    print(f"    MAX(precio):                       {spot2}  (CSV expected 24.853032)")
    assert float(spot2) == 24.853032

    # Spot-check 3: min precio = 0.506404
    spot3 = psql_query(args.db, "SELECT MIN(precio) FROM consar.precio_gestion;")[0]
    print(f"    MIN(precio):                       {spot3}  (CSV expected 0.506404)")
    assert float(spot3) == 0.506404

    # Spot-check 4: xxi legacy → afore_id=2 + sb5 → cubre 3,664 fechas distintas, range 1997-01-07 → 2012-12-01
    xxi_legacy = psql_query(args.db, """
        SELECT MIN(fecha)::text, MAX(fecha)::text, COUNT(*)::text
        FROM consar.precio_gestion p
        JOIN consar.cat_siefore s ON s.id = p.siefore_id
        WHERE p.afore_id = 2 AND s.slug = 'sb5';
    """)[0].split("\t")
    print(f"    xxi legacy (afore_id=2, sb5):     min={xxi_legacy[0]}  max={xxi_legacy[1]}  count={xxi_legacy[2]}")
    print(f"      (expected min=1997-01-07, max=2012-12-01, count=3664)")
    assert xxi_legacy[0] == "1997-01-07"
    assert xxi_legacy[1] == "2012-12-01"
    assert int(xxi_legacy[2]) == 3664

    # Spot-check 5: distribución por afore_id post-INSERT
    print(f"\n    Distribución por afore_id (DB post-INSERT):")
    rows = psql_query(args.db,
        "SELECT afore_id, COUNT(*) FROM consar.precio_gestion GROUP BY afore_id ORDER BY afore_id;"
    )
    db_counts = {int(r.split('\t')[0]): int(r.split('\t')[1]) for r in rows}
    for af_id in sorted(EXPECTED_AFORE_COUNTS):
        actual = db_counts.get(af_id, 0)
        expected = EXPECTED_AFORE_COUNTS[af_id]
        ok = "✓" if actual == expected else "✗"
        print(f"      afore_id={af_id:>2}  db={actual:>6}  expected={expected:>6}  {ok}")
        assert actual == expected
    # afore_id=6 (pensionissste) MUST NOT appear
    assert 6 not in db_counts, f"unexpected pensionissste rows: {db_counts.get(6)}"

    print(f"\n  ✓ ALL VALIDATIONS PASSED on {args.db}")


if __name__ == "__main__":
    main()
