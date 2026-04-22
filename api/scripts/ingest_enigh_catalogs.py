#!/usr/bin/env python3
"""
Ingesta de los 111 catálogos oficiales de INEGI para ENIGH 2024 NS.

Carga los CSVs de `catalogos/` al schema `enigh.cat_*` creado por la
migración 007. Política de duplicados:

  - mismo (clave, descripcion) duplicada dentro o entre copias del
    catálogo: se dedupe silenciosamente (ruido de INEGI, no informa)
  - misma `clave` con dos o más `descripcion` distintas: se FALLA
    ruidosamente para que el usuario decida qué versión canonicalizar

Estructura de CSVs:

  - Estándar: 2 columnas (<nombre_clave>, descripcion) — 110 catálogos
  - No estándar conocido: ubica_geo.csv tiene 5 columnas
    (ubica_geo, entidad, desc_ent, municipio, desc_mun) → descripcion
    se forma como "desc_ent / desc_mun"
  - Cualquier otra estructura no-estándar detectada FALLA ruidosamente.

Orden de carga:

  1. Local Docker (localhost:54322). Validación completa.
  2. Si local verde, cargar a Neon.
  3. Comparativa local vs Neon (counts + MD5 de contenido serializado).

Uso
---
    /Users/davicho/datos-itam/api/.venv/bin/python \\
        /Users/davicho/datos-itam/api/scripts/ingest_enigh_catalogs.py

Requiere asyncpg (ya dependencia del proyecto).
"""
from __future__ import annotations

import asyncio
import csv
import hashlib
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import asyncpg


ROOT = Path("/Users/davicho/datos-itam")
DATA_ROOT = ROOT / "data-sources" / "conjunto_de_datos_enigh2024_ns_csv"

DATASETS: List[str] = [
    "agro", "agroconsumo", "agrogasto", "agroproductos",
    "concentradohogar", "erogaciones",
    "gastoshogar", "gastospersona", "gastotarjetas",
    "hogares", "ingresos", "ingresos_jcf",
    "noagro", "noagroimportes",
    "poblacion", "trabajos", "viviendas",
]

LOCAL_DSN = (
    "postgresql://datos_public:datos_public_2026@localhost:54322/"
    "remuneraciones_cdmx"
)
NEON_DSN = (
    "postgresql://neondb_owner:npg_GdjNhW7S5ACu@"
    "ep-broad-shadow-anxgp6d8-pooler.c-6.us-east-1.aws.neon.tech/"
    "remuneraciones_cdmx?sslmode=require"
)


# ---------------------------------------------------------------------
# CSV parsing & dedup
# ---------------------------------------------------------------------


class CatalogIssue(Exception):
    """Raised when a catalog can't be safely loaded."""


def catalog_csv_paths(cat_name: str) -> List[Path]:
    """Return all paths where `<cat_name>.csv` appears across the 17
    dataset directories. Alphabetical."""
    paths: List[Path] = []
    for ds in DATASETS:
        p = DATA_ROOT / f"conjunto_de_datos_{ds}_enigh2024_ns" / "catalogos" / f"{cat_name}.csv"
        if p.is_file():
            paths.append(p)
    return paths


def discover_all_catalogs() -> List[str]:
    """Return sorted list of all unique catalog names."""
    names: Set[str] = set()
    for ds in DATASETS:
        d = DATA_ROOT / f"conjunto_de_datos_{ds}_enigh2024_ns" / "catalogos"
        if not d.is_dir():
            continue
        for p in d.glob("*.csv"):
            names.add(p.stem)
    return sorted(names)


def parse_catalog_file(
    path: Path,
) -> Tuple[List[Tuple[str, str]], Optional[str]]:
    """Parse a catalog CSV.

    Returns (rows, structure_warning). rows is a list of
    (clave, descripcion). structure_warning is None for the standard
    2-col format, a short string for ubica_geo (known non-standard),
    and RAISES CatalogIssue for any other non-standard shape.
    """
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return [], "empty file"

        is_ubica = len(header) == 5 and header[0] == "ubica_geo"
        is_standard = len(header) == 2

        if not is_standard and not is_ubica:
            raise CatalogIssue(
                f"{path.name}: estructura no-estándar ({len(header)} "
                f"columnas, header={header!r}). Manejo explícito requerido."
            )

        rows: List[Tuple[str, str]] = []
        for raw in reader:
            if not raw:
                continue
            clave = raw[0].strip()
            if not clave:
                continue
            if is_ubica:
                desc_ent = raw[2].strip() if len(raw) > 2 else ""
                desc_mun = raw[4].strip() if len(raw) > 4 else ""
                desc = f"{desc_ent} / {desc_mun}"
            else:
                desc = raw[1].strip() if len(raw) > 1 else ""
            rows.append((clave, desc))

    warning = "ubica_geo (5 cols -> concat desc_ent/desc_mun)" if is_ubica else None
    return rows, warning


def dedupe_and_validate(
    cat_name: str, rows_by_path: Dict[Path, List[Tuple[str, str]]]
) -> Tuple[List[Tuple[str, str]], List[str]]:
    """Merge rows across all paths of this catalog.

    - (clave, descripcion) idéntico duplicado: dedupe silencioso
    - clave con >=2 descripcion distintas: FALLA

    Returns (unique_rows_sorted_by_clave, info_messages).
    info_messages enumerates source paths consulted and total raw rows.
    """
    # Collect all descripciones per clave across all files
    by_clave: Dict[str, Set[str]] = defaultdict(set)
    total_raw = 0
    for path, rows in rows_by_path.items():
        for k, d in rows:
            by_clave[k].add(d)
            total_raw += 1

    conflicts = {k: sorted(v) for k, v in by_clave.items() if len(v) > 1}
    if conflicts:
        lines = [
            f"  clave={k!r}: {descs!r}" for k, descs in sorted(conflicts.items())
        ]
        raise CatalogIssue(
            f"{cat_name}: {len(conflicts)} clave(s) con descripciones "
            f"conflictivas:\n" + "\n".join(lines)
        )

    unique = sorted(
        ((k, next(iter(descs))) for k, descs in by_clave.items()),
        key=lambda kd: kd[0],
    )
    info = [
        f"{len(rows_by_path)} archivo(s) leído(s), "
        f"{total_raw} filas raw -> {len(unique)} únicas"
    ]
    return unique, info


# ---------------------------------------------------------------------
# Load phase
# ---------------------------------------------------------------------


async def truncate_and_copy(
    conn: asyncpg.Connection, cat_name: str, rows: List[Tuple[str, str]]
) -> None:
    """TRUNCATE + copy_records_to_table into enigh.cat_<cat_name>."""
    table = f"cat_{cat_name}"
    await conn.execute(f"TRUNCATE TABLE enigh.{table}")
    if not rows:
        return
    await conn.copy_records_to_table(
        table, records=rows, schema_name="enigh", columns=("clave", "descripcion")
    )


async def ingest_to_db(
    dsn: str,
    label: str,
    catalog_plan: List[Tuple[str, List[Tuple[str, str]]]],
) -> Dict[str, int]:
    """Load all catalogs into `dsn`. Returns {cat_name: row_count}."""
    print(f"\n=== Cargando catálogos a {label} ===")
    counts: Dict[str, int] = {}
    conn = await asyncpg.connect(
        dsn, statement_cache_size=0 if "neon" in dsn else 100
    )
    try:
        for cat_name, rows in catalog_plan:
            await truncate_and_copy(conn, cat_name, rows)
            actual = await conn.fetchval(
                f"SELECT COUNT(*) FROM enigh.cat_{cat_name}"
            )
            counts[cat_name] = actual
            if actual != len(rows):
                raise CatalogIssue(
                    f"{label}: cat_{cat_name} cargó {actual} filas, "
                    f"se esperaban {len(rows)}"
                )
        print(f"[{label}] {sum(counts.values()):,} filas distribuidas en "
              f"{len(counts)} catálogos")
    finally:
        await conn.close()
    return counts


# ---------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------


async def spot_checks(dsn: str, label: str) -> List[str]:
    """Run spot-checks against a loaded DB. Returns list of issue
    strings (empty = all green)."""
    issues: List[str] = []
    conn = await asyncpg.connect(
        dsn, statement_cache_size=0 if "neon" in dsn else 100
    )
    try:
        # cat_entidad == 32 rows
        n_ent = await conn.fetchval("SELECT COUNT(*) FROM enigh.cat_entidad")
        if n_ent != 32:
            issues.append(f"cat_entidad tiene {n_ent} filas, esperaba 32")

        # cat_entidad tiene "09" con Ciudad de México, "15" con México
        row09 = await conn.fetchrow(
            "SELECT clave, descripcion FROM enigh.cat_entidad WHERE clave='09'"
        )
        if row09 is None:
            issues.append("cat_entidad: falta clave '09' (CDMX)")
        elif "ciudad de méxico" not in (row09["descripcion"] or "").lower() \
                and "ciudad de mexico" not in (row09["descripcion"] or "").lower():
            issues.append(
                f"cat_entidad['09'] descripcion='{row09['descripcion']}' "
                f"no menciona Ciudad de México"
            )

        row15 = await conn.fetchrow(
            "SELECT clave, descripcion FROM enigh.cat_entidad WHERE clave='15'"
        )
        if row15 is None:
            issues.append("cat_entidad: falta clave '15' (Estado de México)")
        elif "méxico" not in (row15["descripcion"] or "").lower() \
                and "mexico" not in (row15["descripcion"] or "").lower():
            issues.append(
                f"cat_entidad['15'] descripcion='{row15['descripcion']}' "
                f"no menciona México"
            )

        # cat_sexo: esperamos al menos 2 filas (H/M)
        n_sexo = await conn.fetchval("SELECT COUNT(*) FROM enigh.cat_sexo")
        if n_sexo < 2:
            issues.append(f"cat_sexo tiene {n_sexo} filas, esperaba >= 2")

        # cat_mes: esperamos 12 filas (o 13 con "no especificado")
        n_mes = await conn.fetchval("SELECT COUNT(*) FROM enigh.cat_mes")
        if n_mes < 12:
            issues.append(f"cat_mes tiene {n_mes} filas, esperaba >= 12")

        # cat_si_no: 2 (o 3 con no-sabe)
        n_sino = await conn.fetchval("SELECT COUNT(*) FROM enigh.cat_si_no")
        if n_sino < 2:
            issues.append(f"cat_si_no tiene {n_sino} filas, esperaba >= 2")

        # 0-row detection across all catalogs
        zero = await conn.fetch(
            "SELECT schemaname||'.'||tablename AS t FROM pg_tables "
            "WHERE schemaname='enigh' AND tablename LIKE 'cat_%' "
            "AND NOT EXISTS (SELECT 1 FROM pg_class c "
            "  JOIN pg_namespace n ON c.relnamespace=n.oid "
            "  WHERE n.nspname='enigh' AND c.relname=pg_tables.tablename "
            "  AND c.relkind='r' AND c.reltuples>0)"
        )
        # Simpler: list zero-row catalogs explicitly
        zero_tables: List[str] = []
        tables = await conn.fetch(
            "SELECT tablename FROM pg_tables "
            "WHERE schemaname='enigh' AND tablename LIKE 'cat_%' "
            "ORDER BY tablename"
        )
        for r in tables:
            n = await conn.fetchval(
                f"SELECT COUNT(*) FROM enigh.{r['tablename']}"
            )
            if n == 0:
                zero_tables.append(r["tablename"])
        if zero_tables:
            issues.append(
                f"{len(zero_tables)} catálogo(s) con 0 filas: "
                f"{', '.join(zero_tables)}"
            )
    finally:
        await conn.close()
    if not issues:
        print(f"[{label}] spot-checks: todos OK")
    else:
        print(f"[{label}] spot-checks: {len(issues)} issue(s)")
        for i in issues:
            print(f"  - {i}")
    return issues


async def catalog_digest(dsn: str) -> Dict[str, Tuple[int, str]]:
    """Return {cat_name: (row_count, md5_of_serialized_content)}.

    Serialization is the sorted-by-clave concatenation of
    f"{clave}|{descripcion}\\n" encoded utf-8. Allows exact-match
    comparison between local and Neon.
    """
    out: Dict[str, Tuple[int, str]] = {}
    conn = await asyncpg.connect(
        dsn, statement_cache_size=0 if "neon" in dsn else 100
    )
    try:
        tables = await conn.fetch(
            "SELECT tablename FROM pg_tables "
            "WHERE schemaname='enigh' AND tablename LIKE 'cat_%' "
            "ORDER BY tablename"
        )
        for r in tables:
            cat_name = r["tablename"][4:]  # strip 'cat_'
            rows = await conn.fetch(
                f"SELECT clave, descripcion FROM enigh.cat_{cat_name} "
                f"ORDER BY clave"
            )
            h = hashlib.md5()
            for row in rows:
                h.update(
                    f"{row['clave']}|{row['descripcion']}\n".encode("utf-8")
                )
            out[cat_name] = (len(rows), h.hexdigest())
    finally:
        await conn.close()
    return out


# ---------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------


def build_catalog_plan(
    catalogs: List[str],
) -> Tuple[List[Tuple[str, List[Tuple[str, str]]]], List[str], List[str]]:
    """Parse + dedupe all catalogs into a load plan.

    Returns (plan, structure_warnings, halt_errors). If halt_errors is
    non-empty, caller should fail without touching any DB.
    """
    plan: List[Tuple[str, List[Tuple[str, str]]]] = []
    warnings: List[str] = []
    errors: List[str] = []

    for cat_name in catalogs:
        paths = catalog_csv_paths(cat_name)
        if not paths:
            errors.append(f"{cat_name}: sin archivos fuente encontrados")
            continue
        rows_by_path: Dict[Path, List[Tuple[str, str]]] = {}
        try:
            for p in paths:
                rows, structure_note = parse_catalog_file(p)
                rows_by_path[p] = rows
                if structure_note:
                    warnings.append(
                        f"{cat_name}: archivo no-estándar pero conocido — "
                        f"{structure_note}"
                    )
            unique, _ = dedupe_and_validate(cat_name, rows_by_path)
            plan.append((cat_name, unique))
        except CatalogIssue as e:
            errors.append(str(e))

    return plan, warnings, errors


def print_summary_table(
    plan: List[Tuple[str, List[Tuple[str, str]]]]
) -> None:
    print(f"\n{'Catálogo':<32} {'Rows':>6}  {'MaxClave':>8}  {'MaxDesc':>7}")
    print("-" * 60)
    for cat_name, rows in plan:
        max_c = max((len(r[0]) for r in rows), default=0)
        max_d = max((len(r[1]) for r in rows), default=0)
        print(f"{cat_name:<32} {len(rows):>6}  {max_c:>8}  {max_d:>7}")


async def main_async() -> int:
    # ------------------------------------------------------------------
    # Phase 0: discover + parse all catalogs (no DB access yet)
    # ------------------------------------------------------------------
    all_cats = discover_all_catalogs()
    print(f"[discover] {len(all_cats)} catálogos únicos en los 17 dataset dirs")

    plan, warnings, errors = build_catalog_plan(all_cats)
    if warnings:
        print("\n[warnings] estructuras no-estándar conocidas:")
        for w in sorted(set(warnings)):
            print(f"  - {w}")
    if errors:
        print("\n[errors] HALT antes de tocar DB:")
        for e in errors:
            print(f"  - {e}")
        return 2

    # ------------------------------------------------------------------
    # Phase 1: load LOCAL first
    # ------------------------------------------------------------------
    local_counts = await ingest_to_db(LOCAL_DSN, "LOCAL", plan)
    local_issues = await spot_checks(LOCAL_DSN, "LOCAL")
    if local_issues:
        print("\n[HALT] local tiene issues — no se carga a Neon.")
        return 3

    # ------------------------------------------------------------------
    # Phase 2: load NEON only if local is green
    # ------------------------------------------------------------------
    neon_counts = await ingest_to_db(NEON_DSN, "NEON", plan)
    neon_issues = await spot_checks(NEON_DSN, "NEON")
    if neon_issues:
        print("\n[HALT] Neon tiene issues después de carga.")
        return 4

    # ------------------------------------------------------------------
    # Phase 3: comparativa local vs Neon (counts + content MD5)
    # ------------------------------------------------------------------
    print("\n=== Comparativa local vs Neon ===")
    local_digest = await catalog_digest(LOCAL_DSN)
    neon_digest = await catalog_digest(NEON_DSN)
    mismatches: List[str] = []
    for cat_name in sorted(set(local_digest) | set(neon_digest)):
        lc, lh = local_digest.get(cat_name, (-1, ""))
        nc, nh = neon_digest.get(cat_name, (-1, ""))
        if lc != nc or lh != nh:
            mismatches.append(
                f"{cat_name}: local=(n={lc}, md5={lh[:8]}) "
                f"neon=(n={nc}, md5={nh[:8]})"
            )
    if mismatches:
        print(f"[HALT] {len(mismatches)} catálogos difieren local vs Neon:")
        for m in mismatches:
            print(f"  - {m}")
        return 5
    print(f"[match] {len(local_digest)} catálogos idénticos en local y Neon")

    # ------------------------------------------------------------------
    # Phase 4: reporte final
    # ------------------------------------------------------------------
    print("\n=== Reporte final ===")
    print_summary_table(plan)
    total_rows = sum(len(rows) for _, rows in plan)
    print("-" * 60)
    print(f"TOTAL: {len(plan)} catálogos, {total_rows:,} filas")
    return 0


def main() -> int:
    return asyncio.run(main_async())


if __name__ == "__main__":
    sys.exit(main())
