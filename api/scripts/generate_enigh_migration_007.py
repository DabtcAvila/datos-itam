#!/usr/bin/env python3
"""
Deterministic DDL generator for ENIGH 2024 Nueva Serie (INEGI) — migration 007.

Reads every official INEGI diccionario (17 data tables) and every catálogo
CSV (111 unique names across the 17 dataset directories) and emits:

    api/migrations/007_enigh_schema.sql          (forward DDL)
    api/migrations/007_rollback_enigh_schema.sql (rollback DDL)

The generator is idempotent: running it twice produces byte-identical
output (as long as the input data sources don't change).

Usage
-----
    /Users/davicho/datos-itam/api/.venv/bin/python \
        /Users/davicho/datos-itam/api/scripts/generate_enigh_migration_007.py

The script uses ONLY the Python standard library. It does NOT connect to
any database — it just writes the two SQL files and prints a summary.

Design decisions (see api/docs/enigh-schema-plan-v2.md for context)
------------------------------------------------------------------

Type mapping from diccionario rows (cols: nombre_campo, longitud, tipo,
nemónico, catálogo, rango_claves, no_especificado):

    tipo=C          -> VARCHAR(longitud)
    tipo=N, "X,Y"   -> NUMERIC(X,Y)
    tipo=N, len<=4  -> SMALLINT
    tipo=N, len 5-9 -> INTEGER
    tipo=N, len>=10 -> BIGINT

Nullability:
    * PK columns: NOT NULL
    * all other columns: nullable

Foreign keys: emitted as `COMMENT ON COLUMN ... IS 'FK -> enigh.cat_<x>.clave'`
(per user decision — no hard constraints; catalog tables themselves have
no FKs).

Catalog table width: scanned from the actual catalogo CSVs (max of
max(len(clave)) and max(len(descripcion)) across all dataset directories
where the catalog appears).

Primary keys: per api/docs/enigh-schema-plan-v2.md §2, with verification
against actual CSV data:
  - gastoshogar and gastospersona use a SURROGATE `id BIGSERIAL PRIMARY
    KEY` because the natural tuple does NOT uniquely identify rows in
    the 2024 NS CSV (836K and 235K dupes respectively). Rationale:
    INEGI does not publish a PK — our earlier natural-tuple guess was
    ours, not INEGI's, so we are correcting our own decision. A plain
    B-tree index on the natural tuple is emitted for join/agg
    performance. No UNIQUE constraint (would document a falsehood).
    A COMMENT ON TABLE documents the semantics: each row is an
    individual expense event, not a per-hogar aggregate — aggregate
    via GROUP BY.
  - agroproductos uses (folioviv, foliohog, numren, id_trabajo, tipoact,
    numprod) — numprod observed in the data as the per-tipoact repeater.
  - agroconsumo uses (folioviv, foliohog, numren, id_trabajo, tipoact,
    numprod, destino) — (numprod, destino) needed because the same
    product is split into "destined to sell" vs "destined to home".

Catalog `ubica_geo.csv` is 5-column (ubica_geo, entidad, desc_ent,
municipio, desc_mun) not 2-column; the generator concatenates
"desc_ent / desc_mun" as the descripcion for width computation and will
do the same at ingest time.
"""
from __future__ import annotations

import csv
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------

ROOT = Path("/Users/davicho/datos-itam")
DATA_ROOT = ROOT / "data-sources" / "conjunto_de_datos_enigh2024_ns_csv"
MIGRATIONS_DIR = ROOT / "api" / "migrations"
OUT_MIGRATION = MIGRATIONS_DIR / "007_enigh_schema.sql"
OUT_ROLLBACK = MIGRATIONS_DIR / "007_rollback_enigh_schema.sql"

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------

# The 17 ENIGH 2024 NS datasets. table_name == dataset name under schema enigh.
DATASETS: List[str] = [
    "agro",
    "agroconsumo",
    "agrogasto",
    "agroproductos",
    "concentradohogar",
    "erogaciones",
    "gastoshogar",
    "gastospersona",
    "gastotarjetas",
    "hogares",
    "ingresos",
    "ingresos_jcf",
    "noagro",
    "noagroimportes",
    "poblacion",
    "trabajos",
    "viviendas",
]

# Primary keys per api/docs/enigh-schema-plan-v2.md §2, with PK adjustments
# flagged in this script's module docstring.
#
# For natural-PK tables, the tuple is the PK. For surrogate-PK tables
# (SURROGATE_PK_TABLES below) the tuple is the NATURAL KEY used to build
# a plain B-tree index for joins/agg; it is NOT unique.
PRIMARY_KEYS: Dict[str, Tuple[str, ...]] = {
    "viviendas": ("folioviv",),
    "hogares": ("folioviv", "foliohog"),
    "concentradohogar": ("folioviv", "foliohog"),
    "gastoshogar": ("folioviv", "foliohog", "clave"),
    "erogaciones": ("folioviv", "foliohog", "clave"),
    "gastotarjetas": ("folioviv", "foliohog", "clave"),
    "poblacion": ("folioviv", "foliohog", "numren"),
    "ingresos": ("folioviv", "foliohog", "numren", "clave"),
    "gastospersona": ("folioviv", "foliohog", "numren", "clave"),
    "ingresos_jcf": ("folioviv", "foliohog", "numren", "clave"),
    "trabajos": ("folioviv", "foliohog", "numren", "id_trabajo"),
    "agro": ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact"),
    "agroproductos": ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact", "numprod"),
    "agroconsumo": (
        "folioviv", "foliohog", "numren", "id_trabajo", "tipoact", "numprod", "destino",
    ),
    "agrogasto": ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact", "clave"),
    "noagro": ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact"),
    "noagroimportes": ("folioviv", "foliohog", "numren", "id_trabajo", "clave"),
}

# Tables where the natural tuple is NOT unique in the real CSV (dupe
# counts observed in data: gastoshogar ~836K dupes, gastospersona ~235K).
# These get a BIGSERIAL `id` PK + a plain B-tree on the natural tuple.
SURROGATE_PK_TABLES: Dict[str, str] = {
    "gastoshogar": (
        "Cada fila representa un evento individual de gasto del hogar. "
        "Múltiples filas pueden compartir (folioviv, foliohog, clave): "
        "INEGI registra cada ocurrencia del gasto por hogar en el periodo. "
        "Para agregar por hogar usar GROUP BY (folioviv, foliohog[, clave]). "
        "PK surrogate id BIGSERIAL; no hay UNIQUE sobre la tupla natural "
        "porque no es única por diseño del cuestionario."
    ),
    "gastospersona": (
        "Cada fila representa un evento individual de gasto atribuido a una "
        "persona. Múltiples filas pueden compartir (folioviv, foliohog, numren, "
        "clave): INEGI registra cada ocurrencia del gasto en el periodo. "
        "Para agregar por persona usar GROUP BY (folioviv, foliohog, numren"
        "[, clave]). PK surrogate id BIGSERIAL; no hay UNIQUE sobre la tupla "
        "natural porque no es única por diseño del cuestionario."
    ),
}


def dict_path(name: str) -> Path:
    return (
        DATA_ROOT
        / f"conjunto_de_datos_{name}_enigh2024_ns"
        / "diccionario_de_datos"
        / f"diccionario_datos_{name}_enigh2024_ns.csv"
    )


def catalogs_dir(name: str) -> Path:
    return (
        DATA_ROOT
        / f"conjunto_de_datos_{name}_enigh2024_ns"
        / "catalogos"
    )


# ---------------------------------------------------------------------
# Diccionario parsing
# ---------------------------------------------------------------------


def parse_longitud(raw: str) -> Tuple[int, Optional[int]]:
    """Return (integer_part, decimal_part_or_None).

    "10"    -> (10, None)
    "12,2"  -> (12, 2)
    """
    raw = raw.strip().strip('"')
    if "," in raw:
        a, b = raw.split(",", 1)
        return int(a), int(b)
    return int(raw), None


def sql_type_for(tipo: str, longitud_raw: str, has_catalog: bool = False) -> str:
    """Map INEGI (tipo, longitud) to a Postgres type.

    If `tipo` is blank (an INEGI data quality issue present in
    viviendas.procaptar, for example), fall back to:
      * VARCHAR(longitud) when the column references a catalog (catalog
        codes are stored as character keys by INEGI convention);
      * NUMERIC / INTEGER otherwise.
    """
    int_part, dec_part = parse_longitud(longitud_raw)
    tipo = tipo.strip().upper()
    if not tipo:
        tipo = "C" if has_catalog else "N"
    if tipo == "C":
        return f"VARCHAR({int_part})"
    if tipo == "N":
        if dec_part is not None:
            return f"NUMERIC({int_part}, {dec_part})"
        if int_part <= 4:
            return "SMALLINT"
        if int_part <= 9:
            return "INTEGER"
        return "BIGINT"
    raise ValueError(f"Unknown tipo={tipo!r}")


def load_diccionario(name: str) -> List[Dict[str, str]]:
    path = dict_path(name)
    if not path.is_file():
        raise FileNotFoundError(f"Missing diccionario: {path}")
    rows: List[Dict[str, str]] = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        for raw in r:
            # strip whitespace from each field; normalize INEGI typo
            # 'logitud' -> 'longitud' (present in the poblacion diccionario).
            row = {k.strip(): (v.strip() if v is not None else "") for k, v in raw.items()}
            if "logitud" in row and "longitud" not in row:
                row["longitud"] = row.pop("logitud")
            # skip obviously empty lines
            if not row.get("nemónico"):
                continue
            rows.append(row)
    return rows


# ---------------------------------------------------------------------
# Catalog discovery & width computation
# ---------------------------------------------------------------------


def scan_catalogs() -> Dict[str, Tuple[int, int]]:
    """Return {catalog_name: (clave_width, descripcion_width)} for each
    unique catalog across all dataset directories. Width = max observed
    length (with a minimum floor of 1 to keep VARCHAR valid)."""
    max_clave: Dict[str, int] = {}
    max_desc: Dict[str, int] = {}
    for dataset in DATASETS:
        cdir = catalogs_dir(dataset)
        if not cdir.is_dir():
            continue
        for csv_file in sorted(cdir.glob("*.csv")):
            cat_name = csv_file.stem  # 'si_no'
            try:
                with csv_file.open("r", encoding="utf-8", newline="") as f:
                    reader = csv.reader(f)
                    try:
                        header = next(reader)
                    except StopIteration:
                        continue
                    # Standard case: 2 columns (clave, descripcion).
                    # Special case: ubica_geo has 5 cols
                    # (ubica_geo,entidad,desc_ent,municipio,desc_mun) — we
                    # concatenate desc_ent + ' / ' + desc_mun for the width
                    # (and will do the same at ingest).
                    is_ubica = len(header) == 5 and header[0] == "ubica_geo"
                    local_c = 0
                    local_d = 0
                    for row in reader:
                        if not row:
                            continue
                        clave = row[0]
                        if is_ubica:
                            desc_ent = row[2] if len(row) > 2 else ""
                            desc_mun = row[4] if len(row) > 4 else ""
                            desc = f"{desc_ent} / {desc_mun}"
                        else:
                            desc = row[1] if len(row) > 1 else ""
                        if len(clave) > local_c:
                            local_c = len(clave)
                        if len(desc) > local_d:
                            local_d = len(desc)
                    if cat_name not in max_clave or local_c > max_clave[cat_name]:
                        max_clave[cat_name] = local_c
                    if cat_name not in max_desc or local_d > max_desc[cat_name]:
                        max_desc[cat_name] = local_d
            except (csv.Error, UnicodeDecodeError) as e:
                # Fallback: try latin-1
                with csv_file.open("r", encoding="latin-1", newline="") as f:
                    reader = csv.reader(f)
                    try:
                        header = next(reader)
                    except StopIteration:
                        continue
                    is_ubica = len(header) == 5 and header[0] == "ubica_geo"
                    local_c = 0
                    local_d = 0
                    for row in reader:
                        if not row:
                            continue
                        clave = row[0]
                        if is_ubica:
                            desc_ent = row[2] if len(row) > 2 else ""
                            desc_mun = row[4] if len(row) > 4 else ""
                            desc = f"{desc_ent} / {desc_mun}"
                        else:
                            desc = row[1] if len(row) > 1 else ""
                        if len(clave) > local_c:
                            local_c = len(clave)
                        if len(desc) > local_d:
                            local_d = len(desc)
                    if cat_name not in max_clave or local_c > max_clave[cat_name]:
                        max_clave[cat_name] = local_c
                    if cat_name not in max_desc or local_d > max_desc[cat_name]:
                        max_desc[cat_name] = local_d

    out: Dict[str, Tuple[int, int]] = {}
    for cat in sorted(set(max_clave) | set(max_desc)):
        cw = max(max_clave.get(cat, 1), 1)
        dw = max(max_desc.get(cat, 1), 1)
        out[cat] = (cw, dw)
    return out


# ---------------------------------------------------------------------
# DDL emission
# ---------------------------------------------------------------------


HEADER_FORWARD = """\
-- =============================================================================
-- Migration 007: ENIGH 2024 (Nueva Serie) schema — FULL INGEST (v2)
-- =============================================================================
--
-- Creates the `enigh` namespace for INEGI's ENIGH 2024 Nueva Serie dataset.
-- This migration supersedes 006_enigh_schema.sql (never applied, see
-- enigh-schema-plan-v2.md §1 for the 4 bugs it contained).
--
-- Scope (per api/docs/enigh-schema-plan-v2.md):
--   * 111 catalog tables (enigh.cat_<name>), populated from INEGI's
--     catalogos/*.csv at ingest time.
--   * 17 data tables (enigh.<dataset>), covering all 957 columns across
--     the official diccionarios — no column dropping.
--   * 1 computed column: enigh.concentradohogar.decil SMALLINT NULL with
--     CHECK (decil IS NULL OR decil BETWEEN 1 AND 10). Populated in S3
--     via UPDATE + NTILE(10) OVER (ORDER BY ing_cor * factor).
--
-- Primary keys:
--   15 data tables use the natural tuple from INEGI's survey design.
--   2 tables (gastoshogar, gastospersona) use a surrogate
--   `id BIGSERIAL PRIMARY KEY`: the natural tuple has duplicates in the
--   real CSV because INEGI records each expense event as a separate row
--   (not an aggregate per hogar). A plain B-tree index is created over
--   the natural tuple for join/agg performance, but no UNIQUE constraint
--   (would document a falsehood). See COMMENT ON TABLE on each.
--
-- Foreign keys:
--   Declared as COMMENT ON COLUMN annotations rather than hard FK
--   constraints. INEGI does not publish referential guarantees and we
--   prefer documentation-only FKs over ingest brittleness.
--
-- Generator: api/scripts/generate_enigh_migration_007.py (stdlib-only,
-- deterministic, idempotent). DO NOT hand-edit this file — re-run the
-- generator if anything needs to change.
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS enigh;
"""

FOOTER_FORWARD = """
COMMIT;
"""

HEADER_ROLLBACK = """\
-- =============================================================================
-- Rollback for migration 007: ENIGH 2024 (Nueva Serie) schema.
-- =============================================================================
--
-- ⚠️  DESTRUCTIVE. Drops the entire `enigh` schema and every object inside
--     (128 tables + all data + all comments). Use only to undo 007.
--
-- =============================================================================

BEGIN;

DROP SCHEMA IF EXISTS enigh CASCADE;

COMMIT;
"""


def emit_catalog_ddl(cat_name: str, clave_width: int, desc_width: int) -> str:
    # Give clave a minimum width of 4 and descripcion a minimum width of 64
    # so that INEGI catalog updates (new codes or longer labels) don't
    # immediately require a schema migration.
    cw = max(clave_width, 4)
    dw = max(desc_width, 64)
    table_name = f"enigh.cat_{cat_name}"
    sql = (
        f"CREATE TABLE {table_name} (\n"
        f"    clave        VARCHAR({cw}) PRIMARY KEY,\n"
        f"    descripcion  VARCHAR({dw}) NOT NULL\n"
        f");\n"
    )
    return sql


def emit_data_table_ddl(
    dataset: str,
    dicc_rows: List[Dict[str, str]],
) -> Tuple[str, List[Tuple[str, str]]]:
    """Return (create_table_sql, fk_comments).

    fk_comments is a list of (column_name, catalog_name) pairs for which
    we should emit COMMENT ON COLUMN statements.
    """
    natural_key = PRIMARY_KEYS[dataset]
    use_surrogate = dataset in SURROGATE_PK_TABLES
    pk_set = set() if use_surrogate else set(natural_key)

    # Build ordered column definitions in diccionario order. But we need
    # to ensure that when the diccionario order has PK members later than
    # non-PK columns, we still list them in the declared order (INEGI's
    # own convention) — the PRIMARY KEY clause goes at the end and
    # references them by name, so order doesn't affect correctness.
    columns: List[str] = []
    fk_comments: List[Tuple[str, str]] = []

    # Track observed column names to cross-check against PK tuple.
    observed: List[str] = []

    # Surrogate-PK tables get `id BIGSERIAL PRIMARY KEY` as first column.
    if use_surrogate:
        columns.append("    id              BIGSERIAL PRIMARY KEY")

    for row in dicc_rows:
        col = row["nemónico"]
        observed.append(col)
        cat = row.get("catálogo", "").strip()
        sql_type = sql_type_for(row["tipo"], row["longitud"], has_catalog=bool(cat))
        # For surrogate-PK tables, NOT NULL on the natural-key columns still
        # makes sense because the CSV never has null values there (they are
        # required by INEGI's survey design). Emit NOT NULL to preserve
        # that invariant.
        is_natural_key_col = col in natural_key
        null_clause = "NOT NULL" if (col in pk_set or (use_surrogate and is_natural_key_col)) else "NULL"
        columns.append(f"    {col:<15} {sql_type}{' ' + null_clause if null_clause == 'NOT NULL' else ''}")
        if cat:
            fk_comments.append((col, cat))

    # Manual addition: concentradohogar.decil — per user decision #4.
    if dataset == "concentradohogar":
        columns.append("    decil           SMALLINT NULL")

    # Verify natural-key members exist in the diccionario (this is a sanity
    # check — for natural-PK tables they become the PK; for surrogate-PK
    # tables they are the index columns).
    missing_nk = [c for c in natural_key if c not in observed]
    if missing_nk:
        raise ValueError(
            f"Table {dataset}: natural-key columns {missing_nk} not found in "
            f"diccionario. Available (first 15): {observed[:15]}"
        )

    body = ",\n".join(columns)
    if use_surrogate:
        # No trailing PRIMARY KEY clause; the id column already declares PK.
        sql = f"CREATE TABLE enigh.{dataset} (\n{body}\n);\n"
    else:
        pk_clause = f"    PRIMARY KEY ({', '.join(natural_key)})"
        sql = f"CREATE TABLE enigh.{dataset} (\n{body},\n{pk_clause}\n);\n"

    # For concentradohogar add the CHECK constraint for decil separately
    # (keep the column definition simple).
    if dataset == "concentradohogar":
        sql += (
            "ALTER TABLE enigh.concentradohogar\n"
            "    ADD CONSTRAINT concentradohogar_decil_check\n"
            "    CHECK (decil IS NULL OR decil BETWEEN 1 AND 10);\n"
        )

    # For surrogate-PK tables: add a B-tree index on the natural key + a
    # COMMENT ON TABLE documenting the design (per user decision B).
    if use_surrogate:
        idx_cols = ", ".join(natural_key)
        idx_name = f"idx_{dataset}_nk"
        sql += f"CREATE INDEX {idx_name} ON enigh.{dataset} ({idx_cols});\n"
        note = SURROGATE_PK_TABLES[dataset].replace("'", "''")
        sql += (
            f"COMMENT ON TABLE enigh.{dataset} IS\n"
            f"    '{note}';\n"
        )

    return sql, fk_comments


def emit_comments(
    dataset: str, fk_comments: List[Tuple[str, str]], known_catalogs: set
) -> str:
    out_lines: List[str] = []
    for col, cat in fk_comments:
        if cat not in known_catalogs:
            # Document as FK anyway — INEGI may reference a catálogo
            # packaged under another dataset directory; scan_catalogs is
            # already a union over all 17 directories, so if it's missing
            # here INEGI has an orphan. Emit with a warning comment.
            out_lines.append(
                f"COMMENT ON COLUMN enigh.{dataset}.{col} IS "
                f"'FK -> enigh.cat_{cat}.clave (catalog file not shipped by INEGI)';"
            )
        else:
            out_lines.append(
                f"COMMENT ON COLUMN enigh.{dataset}.{col} IS "
                f"'FK -> enigh.cat_{cat}.clave';"
            )
    if dataset == "concentradohogar":
        out_lines.append(
            "COMMENT ON COLUMN enigh.concentradohogar.decil IS "
            "'Decil nacional de ingreso corriente per cápita (1-10). "
            "Populated in S3 via UPDATE ... SET decil = NTILE(10) OVER "
            "(ORDER BY ing_cor * factor). Nullable until ingest S3 runs.';"
        )
    return "\n".join(out_lines) + ("\n" if out_lines else "")


# ---------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------


def main() -> int:
    # 1. Scan all catalogs ------------------------------------------------
    catalogs = scan_catalogs()
    known_catalog_names = set(catalogs.keys())
    print(f"[scan] {len(catalogs)} unique catalogs across 17 dataset directories")

    # 2. Load all diccionarios -------------------------------------------
    dicts: Dict[str, List[Dict[str, str]]] = {}
    total_columns = 0
    for name in DATASETS:
        rows = load_diccionario(name)
        dicts[name] = rows
        total_columns += len(rows)
        print(f"[dict] {name}: {len(rows)} columns")
    print(f"[dict] total raw columns across 17 tables: {total_columns}")

    # 3. Build the forward migration file -------------------------------
    parts: List[str] = [HEADER_FORWARD]

    parts.append("\n-- ------------------------------------------------------------------\n")
    parts.append(f"-- Catalogs ({len(catalogs)} tables)\n")
    parts.append("-- ------------------------------------------------------------------\n\n")
    for cat_name in sorted(catalogs):
        cw, dw = catalogs[cat_name]
        parts.append(emit_catalog_ddl(cat_name, cw, dw))
        parts.append("\n")

    parts.append("\n-- ------------------------------------------------------------------\n")
    parts.append(f"-- Data tables ({len(DATASETS)} tables, {total_columns} columns + decil on concentradohogar)\n")
    parts.append("-- ------------------------------------------------------------------\n\n")

    all_fk_comment_blocks: List[str] = []
    for name in DATASETS:
        create_sql, fk_comments = emit_data_table_ddl(name, dicts[name])
        parts.append(f"-- --- {name} ({len(dicts[name])} columns, PK={PRIMARY_KEYS[name]}) ---\n")
        parts.append(create_sql)
        parts.append("\n")
        comments_sql = emit_comments(name, fk_comments, known_catalog_names)
        if comments_sql:
            all_fk_comment_blocks.append(f"-- FK comments for enigh.{name}\n{comments_sql}")

    parts.append("\n-- ------------------------------------------------------------------\n")
    parts.append("-- FK documentation (COMMENT ON COLUMN, no hard constraints)\n")
    parts.append("-- ------------------------------------------------------------------\n\n")
    parts.extend(all_fk_comment_blocks)

    parts.append(FOOTER_FORWARD)

    forward_sql = "".join(parts)

    # 4. Write forward migration ----------------------------------------
    OUT_MIGRATION.write_text(forward_sql, encoding="utf-8")
    print(f"[write] {OUT_MIGRATION} ({len(forward_sql):,} bytes)")

    # 5. Write rollback --------------------------------------------------
    OUT_ROLLBACK.write_text(HEADER_ROLLBACK, encoding="utf-8")
    print(f"[write] {OUT_ROLLBACK} ({len(HEADER_ROLLBACK):,} bytes)")

    # 6. Summary --------------------------------------------------------
    print()
    print("=" * 70)
    print("Generation summary")
    print("=" * 70)
    print(f"  catalog tables:   {len(catalogs)}")
    print(f"  data tables:      {len(DATASETS)}")
    print(f"  total columns:    {total_columns} (raw) + 1 decil = {total_columns + 1}")
    print(f"  FK comments:      {sum(1 for ds in DATASETS for r in dicts[ds] if r.get('catálogo','').strip())}")
    print(f"  CREATE TABLE cnt: {len(catalogs) + len(DATASETS)}")
    print(f"  output size:      {len(forward_sql):,} bytes, {forward_sql.count(chr(10))} lines")

    return 0


if __name__ == "__main__":
    sys.exit(main())
