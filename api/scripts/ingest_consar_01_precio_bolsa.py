"""Ingest dataset #01 (CONSAR precio_bolsa) into consar.precio_bolsa via COPY FROM.

Estrategia COPY FROM (S16 Sub-fase 8 — alto volumen, regla obligatoria David):
  - 635,167 rows / 4 cols → COPY FROM tempfile en 1 transacción.
  - Pre-resolución en memoria: afore + siefore strings → IDs vía dicts cargados de DB.
  - PK collision check in-memory PRE-COPY (fail-fast si >0).
  - psql \\copy client-side (no requiere superuser path access en server, OK Neon).
  - Tempfile cleanup en finally.

Performance esperada:
  - TSV gen Python: ~5-10s
  - COPY local docker: ~5-10s
  - COPY Neon: ~30-60s (1 transacción, no afectada por pgbouncer pooler issue
    documentado en Sub-fase 7).

Source: datosgob_01_precios_bolsa_siefores.csv (635,167 rows, 1997-01-08 → 2025-12-06).

Mapping afore strings (11 → 10 afore_ids post-merge):
  azteca → 7         banamex → 3 (mergea con citibanamex)
  coppel → 5         inbursa → 10
  invercap → 9       pensionissste → 6
  principal → 8      profuturo → 1
  sura → 4           xxi-banorte → 2 (alias guion)
  citibanamex → 3 (alias rebrand, MERGE con banamex)

Validación empírica disjoint banamex+citibanamex (Sub-fase A):
  - banamex: 10 siefores (todas excepto sb 55-59 y siav)
  - citibanamex: SOLO sb 55-59 y siav
  - Shared (afore_id=3, siefore, fecha) tuples: 0 → merge sin colisión.

Usage:
    cd api/
    python scripts/ingest_consar_01_precio_bolsa.py --db local --apply
    python scripts/ingest_consar_01_precio_bolsa.py --db neon  --apply  (gate)
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

CSV_PATH = Path(__file__).resolve().parents[2] / "Proyecto-Final-main/normalizacion/dataset_3/data/raw/datosgob_01_precios_bolsa_siefores.csv"
EXPECTED_MD5 = "e0163a238a00d87cccecc045f1f56dee"
EXPECTED_ROWS = 635167
EXPECTED_DISTINCT_FECHAS = 7059
EXPECTED_DISTINCT_PAIRS = 126

# Distribución esperada por afore_id (post-merge banamex+citibanamex)
EXPECTED_AFORE_COUNTS = {
    1:  68476,   # profuturo
    2: 101394,   # xxi_banorte
    3:  67215,   # banamex (+ citibanamex merge: 56572 + 10643)
    4:  73468,   # sura
    5:  47842,   # coppel
    6:  46645,   # pensionissste
    7:  53386,   # azteca
    8:  63410,   # principal
    9:  49921,   # invercap
    10: 63410,   # inbursa
}

DB_URLS = {
    "local":        "postgresql://datos_public:datos_public_2026@localhost:54322/remuneraciones_cdmx",
    "neon":         "postgresql://neondb_owner:npg_GdjNhW7S5ACu@ep-broad-shadow-anxgp6d8-pooler.c-6.us-east-1.aws.neon.tech/remuneraciones_cdmx?sslmode=require",
    # Direct compute endpoint (no pooler) — para COPY FROM grandes que ahogan al pgbouncer pooler.
    # Verificado en Sub-fase 8: COPY 14.8MB via pooler timeout SSL; via direct funciona.
    "neon_direct":  "postgresql://neondb_owner:npg_GdjNhW7S5ACu@ep-broad-shadow-anxgp6d8.c-6.us-east-1.aws.neon.tech/remuneraciones_cdmx?sslmode=require",
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


def psql_copy_from_tsv(db, table_cols, tsv_path):
    """Local: psql \\copy via docker exec STDIN pipe (probado, funciona)."""
    copy_stdin_cmd = f"\\copy {table_cols} FROM STDIN DELIMITER E'\\t' CSV"
    cmd = list(DOCKER_PSQL) + ["-c", copy_stdin_cmd]
    with open(tsv_path) as f:
        tsv_content = f.read()
    r = subprocess.run(cmd, input=tsv_content, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(f"COPY failed:\nSTDOUT: {r.stdout}\nSTDERR: {r.stderr}\n")
        raise RuntimeError("psql \\copy failed")
    return r.stdout


def asyncpg_copy_records(db_url, schema, table, columns, records, chunk_size=500, timeout=60):
    """Bulk insert via asyncpg executemany INSERT — CHUNKED.
    asyncpg copy_records_to_table cuelga indefinidamente con Neon (>2 rows). Caemos a
    INSERT VALUES via executemany con prepared statement; chunks de 500 rows
    funcionan consistentemente. 635K / 500 = ~1,270 chunks × ~200ms = ~4-5 min total.
    """
    import asyncio
    import asyncpg

    async def _do():
        url = db_url
        if "?" in url:
            url = url.split("?")[0]
        conn = await asyncpg.connect(
            url,
            ssl="require" if "neon" in db_url else None,
            timeout=60,
            command_timeout=timeout,
            statement_cache_size=0,
        )
        try:
            cols_csv = ", ".join(columns)
            placeholders = ", ".join(f"${i+1}" for i in range(len(columns)))
            sql = f"INSERT INTO {schema}.{table} ({cols_csv}) VALUES ({placeholders})"
            total = 0
            n_chunks = (len(records) + chunk_size - 1) // chunk_size
            t_start = time.time()
            for i in range(0, len(records), chunk_size):
                chunk = records[i:i + chunk_size]
                t0 = time.time()
                await conn.executemany(sql, chunk)
                total += len(chunk)
                idx = i // chunk_size + 1
                if idx % 50 == 0 or idx == n_chunks or idx <= 3:
                    elapsed = time.time() - t_start
                    print(f"      chunk {idx}/{n_chunks}: {len(chunk):>4} rows in {time.time()-t0:.2f}s  (total {total} in {elapsed:.1f}s)", flush=True)
            return total
        finally:
            await conn.close()

    return asyncio.run(_do())


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

    print(f"=== Ingest CONSAR #01 → {args.db} {'(APPLY COPY FROM)' if args.apply else '(DRY-RUN)'} ===")

    actual_md5 = md5_of(CSV_PATH)
    assert actual_md5 == EXPECTED_MD5, f"md5 mismatch: {actual_md5} vs {EXPECTED_MD5}"
    print(f"  CSV md5: {actual_md5} ✓")

    canonical, aliases, siefore_slug = load_lookup_maps(args.db)

    # ============================================================
    # Pass 1: pre-resolve all rows in memory + PK collision check
    # ============================================================
    print(f"\n  Pass 1: read CSV + resolve IDs + PK collision check...")
    t0 = time.time()

    resolved = []  # (fecha, afore_id, siefore_id, precio_str)
    pk_seen = set()
    pk_collisions = []
    unmapped_afore = Counter()
    unmapped_siefore = Counter()
    afore_counts = Counter()

    with CSV_PATH.open(newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            af_str = row["afore"]
            sf_str = row["siefore"]
            fecha = row["fecha"]
            precio = row["precio"]

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
    assert len(resolved) == EXPECTED_ROWS, f"row count mismatch: {len(resolved)} vs {EXPECTED_ROWS}"
    print(f"  ✓ Total rows: {len(resolved)} (expected {EXPECTED_ROWS})")

    print(f"\n  Distribución por afore_id (in-memory):")
    for af_id in sorted(EXPECTED_AFORE_COUNTS):
        actual = afore_counts.get(af_id, 0)
        expected = EXPECTED_AFORE_COUNTS[af_id]
        ok = "✓" if actual == expected else "✗"
        print(f"    afore_id={af_id:>2}  actual={actual:>6}  expected={expected:>6}  {ok}")
        if actual != expected:
            print(f"      MISMATCH afore_id={af_id}")
            sys.exit(1)

    # Validar 126 distinct (afore_id, siefore_id)
    distinct_pairs = len({(af, sf) for (_, af, sf, _) in resolved})
    distinct_fechas = len({f for (f, _, _, _) in resolved})
    print(f"\n  Distinct pairs (afore × siefore): {distinct_pairs}  (expected {EXPECTED_DISTINCT_PAIRS})")
    print(f"  Distinct fechas:                  {distinct_fechas}  (expected {EXPECTED_DISTINCT_FECHAS})")
    assert distinct_pairs == EXPECTED_DISTINCT_PAIRS
    assert distinct_fechas == EXPECTED_DISTINCT_FECHAS

    if not args.apply:
        print(f"\n  [DRY-RUN] No DB write. Pass --apply to commit.")
        return

    # ============================================================
    # Pass 2 + 3: COPY FROM (local: TSV tempfile + psql \copy STDIN;
    #                       neon: asyncpg copy_records_to_table nativo)
    # ============================================================
    if args.truncate_first:
        print(f"\n  Pass 2a: TRUNCATE consar.precio_bolsa...")
        psql_query(args.db, "TRUNCATE consar.precio_bolsa;")

    if args.db == "local":
        print(f"\n  Pass 2: write TSV tempfile (local docker)...")
        t0 = time.time()
        tsv_fd, tsv_path = tempfile.mkstemp(suffix=".tsv", prefix="precio_bolsa_resolved_")
        os.close(tsv_fd)
        try:
            with open(tsv_path, "w", encoding="utf-8") as f:
                for (fecha, af_id, sf_id, precio) in resolved:
                    f.write(f"{fecha}\t{af_id}\t{sf_id}\t{precio}\n")
            tsv_size = Path(tsv_path).stat().st_size
            pass2_secs = time.time() - t0
            print(f"    TSV: {tsv_path}  size={tsv_size/1024/1024:.1f} MB  elapsed={pass2_secs:.2f}s")

            print(f"\n  Pass 3: psql \\copy STDIN → consar.precio_bolsa (local)...")
            t0 = time.time()
            psql_copy_from_tsv(args.db, "consar.precio_bolsa(fecha, afore_id, siefore_id, precio)", tsv_path)
            copy_secs = time.time() - t0
            print(f"    COPY elapsed: {copy_secs:.2f}s")
        finally:
            try:
                Path(tsv_path).unlink()
                print(f"    tempfile cleanup ✓")
            except OSError as e:
                print(f"    tempfile cleanup failed: {e}")
    else:
        # Neon: streaming SSL (asyncpg COPY, psql \copy STDIN) ahoga timeouts hoy.
        # Pattern Sub-fase 7 que SÍ funciona: BATCH INSERT VALUES vía psql -f tempfile.sql
        # 635K / 200 = ~3,176 batches × ~0.8s = ~40 min. Lento pero confiable.
        print(f"\n  Pass 2-3: BATCH INSERT VALUES via psql -f tempfile (Sub-fase 7 pattern)...")
        BATCH = 200
        n_batches = (len(resolved) + BATCH - 1) // BATCH
        t_start = time.time()
        # Resume support: skip first --skip-rows rows
        skip = args.skip_rows
        if skip > 0:
            print(f"    RESUME: skipping first {skip} rows ({skip//BATCH} batches)", flush=True)
        start_idx = skip // BATCH

        for idx in range(start_idx, n_batches):
            chunk = resolved[idx*BATCH:(idx+1)*BATCH]
            t0 = time.time()
            values = ",\n".join(f"('{f}', {af}, {sf}, {p})" for (f, af, sf, p) in chunk)
            sql = f"BEGIN;\nINSERT INTO consar.precio_bolsa (fecha, afore_id, siefore_id, precio) VALUES\n{values};\nCOMMIT;\n"
            tf_fd, tf_path = tempfile.mkstemp(suffix=".sql", prefix="precio_bolsa_batch_")
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
    # Pass 4: post-COPY validations
    # ============================================================
    print(f"\n  Pass 4: post-COPY validations on {args.db}...")

    cnt = int(psql_query(args.db, "SELECT COUNT(*) FROM consar.precio_bolsa;")[0])
    print(f"    COUNT(*):                    {cnt}  (expected {EXPECTED_ROWS}) {'✓' if cnt == EXPECTED_ROWS else '✗'}")
    assert cnt == EXPECTED_ROWS

    cnt_pairs = int(psql_query(args.db,
        "SELECT COUNT(*) FROM (SELECT DISTINCT afore_id, siefore_id FROM consar.precio_bolsa) x;"
    )[0])
    print(f"    distinct (afore × siefore):  {cnt_pairs}  (expected {EXPECTED_DISTINCT_PAIRS}) {'✓' if cnt_pairs == EXPECTED_DISTINCT_PAIRS else '✗'}")
    assert cnt_pairs == EXPECTED_DISTINCT_PAIRS

    cnt_fechas = int(psql_query(args.db,
        "SELECT COUNT(DISTINCT fecha) FROM consar.precio_bolsa;"
    )[0])
    print(f"    distinct fechas:             {cnt_fechas}  (expected {EXPECTED_DISTINCT_FECHAS}) {'✓' if cnt_fechas == EXPECTED_DISTINCT_FECHAS else '✗'}")
    assert cnt_fechas == EXPECTED_DISTINCT_FECHAS

    # Spot-check 1: 1997-01-08 azteca/sb_1000 = 1.009736
    spot1 = psql_query(args.db, """
        SELECT precio FROM consar.precio_bolsa p
        JOIN consar.afores a       ON a.id = p.afore_id
        JOIN consar.cat_siefore s  ON s.id = p.siefore_id
        WHERE p.fecha = '2003-03-17' AND a.codigo = 'azteca' AND s.slug = 'sb 1000';
    """)
    print(f"    spot 2003-03-17/azteca/sb_1000:    {spot1[0] if spot1 else 'MISSING'}  (CSV expected 1.009736)")
    assert spot1 and float(spot1[0]) == 1.009736

    # Spot-check 2: max precio = 19.045541
    spot2 = psql_query(args.db, "SELECT MAX(precio) FROM consar.precio_bolsa;")[0]
    print(f"    MAX(precio):                       {spot2}  (CSV expected 19.045541)")
    assert float(spot2) == 19.045541

    # Spot-check 3: distribución por afore_id post-COPY
    print(f"\n    Distribución por afore_id (DB post-COPY):")
    rows = psql_query(args.db,
        "SELECT afore_id, COUNT(*) FROM consar.precio_bolsa GROUP BY afore_id ORDER BY afore_id;"
    )
    db_counts = {int(r.split('\t')[0]): int(r.split('\t')[1]) for r in rows}
    for af_id in sorted(EXPECTED_AFORE_COUNTS):
        actual = db_counts.get(af_id, 0)
        expected = EXPECTED_AFORE_COUNTS[af_id]
        ok = "✓" if actual == expected else "✗"
        print(f"      afore_id={af_id:>2}  db={actual:>6}  expected={expected:>6}  {ok}")
        assert actual == expected

    print(f"\n  ✓ ALL VALIDATIONS PASSED on {args.db}")


if __name__ == "__main__":
    main()
