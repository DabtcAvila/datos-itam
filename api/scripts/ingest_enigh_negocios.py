#!/usr/bin/env python3
"""
Ingesta de las 6 tablas del dominio NEGOCIOS de ENIGH 2024 NS al schema
``enigh``. Sesión S6 del pipeline observatorio multi-dataset — ÚLTIMA
sesión de ingesta. Post-S6: pipeline 100% cargado (17 tablas + 111
catálogos, ~7.28M filas).

Tablas (orden estricto jerárquico — si rompe, paramos sin tocar las
restantes):

    1. agro            (66 cols, 17 442 filas)    PK natural 5-tuple
                        (folioviv, foliohog, numren, id_trabajo, tipoact)
    2. agroproductos   (25 cols, 69 052 filas)    PK 6-tuple (+numprod)
    3. agroconsumo     (11 cols, 43 992 filas)    PK 7-tuple (+numprod, destino)
    4. agrogasto       ( 7 cols, 61 132 filas)    PK 6-tuple (+clave)
    5. noagro          (115 cols, 23 109 filas)   PK natural 5-tuple
                        (folioviv, foliohog, numren, id_trabajo, tipoact)
    6. noagroimportes  (17 cols, 151 276 filas)   PK 5-tuple
                        (folioviv, foliohog, numren, id_trabajo, clave)

Total S6: 366 003 filas. Plan v2 §2.7 titula exactamente
"Nivel negocio (persona-trabajo-tipoact)".

HALLAZGO CONCEPTUAL PRE-INGESTA (2026-04-22)
--------------------------------------------
`agro` y `noagro` NO son tablas "hogar-raíz" como sugería el prompt
inicial de la sesión. Son ACTIVIDADES ECONÓMICAS ESPECÍFICAS a nivel
persona-trabajo-tipoact. Un hogar con múltiples miembros haciendo
múltiples actividades agrícolas/ganaderas puede tener N filas en agro.
La raíz jerárquica común es `enigh.trabajos` (cargada S4, 164 325 filas).

Consecuencia operativa:
- "Cobertura de hogares con actividad agro" requiere DISTINCT
  (folioviv, foliohog), no COUNT(*).
- El orden jerárquico de carga sigue siendo el óptimo: agro antes que
  sus tres sub-tablas (agroproductos, agroconsumo, agrogasto); noagro
  antes que noagroimportes.

FK documental (inferido de migración 007 + diccionarios INEGI)
---------------------------------------------------------------
    trabajos (S4, ya cargado)
        ├── agro                 por (folioviv, foliohog, numren, id_trabajo)
        │     ├── agroproductos  por 5-tuple + numprod
        │     │     └── agroconsumo  por 6-tuple + destino
        │     └── agrogasto      por 5-tuple + clave
        ├── noagro               por (folioviv, foliohog, numren, id_trabajo)
        └── noagroimportes       por (folioviv, foliohog, numren, id_trabajo)
              ⚠ NO FK directo a noagro — comparten 4-tuple, pero la col 5
                difiere (clave vs tipoact). Dependencia semántica: hogares
                con noagroimportes deberían tener filas en noagro (misma
                actividad no-agro registrada). Verificación empírica
                Gate 2: si >1% de noagroimportes NO matchea (folioviv,
                foliohog, numren, id_trabajo) en noagro → HALT.
                Si <1% → INFO metodológico y continuar.

Streaming
---------
Generator directo a ``copy_records_to_table`` SIN materializar lista
(patrón heredado de S5). Volumen modesto (366K filas total) vs S5
(5.77M), pero mantenemos disciplina. RAM peak esperada < 100 MB.

Null handling
-------------
Tokens raw del CSV → None tras ``.strip()``:

    "", " ", "NA", "-"  → NULL

``"&"`` literal se preserva (convención S5).

Tipado por columna se extrae de migration 007 DDL (extendido con BIGINT
que aparece en agro.ventas, agro.autocons, agro.otrosnom, agro.gasneg):

    VARCHAR(n)            → str
    SMALLINT, INTEGER,
    BIGINT                → int
    NUMERIC(p, s)         → Decimal

PKs naturales TODAS — NO hay BIGSERIAL surrogate en las 6 tablas.
TRUNCATE simple (sin RESTART IDENTITY).

Diagnóstico FK runtime pre-load (patrón heredado de S5 gastotarjetas)
---------------------------------------------------------------------
`agrogasto.clave` (VARCHAR(3)) y `noagroimportes.clave` (VARCHAR(6))
tienen múltiples catálogos candidatos en enigh.*. Diagnóstico runtime
lee distinct claves del CSV y reporta match rate contra cada candidato
antes del COPY. Si ningún catálogo cubre 100%, HALT con evidencia.

Candidatos esperados (por nomenclatura):
    agrogasto.clave       → cat_gastonegocioagro (104 entries, B00-F18)
                             vs cat_gastos (1055 entries)
    noagroimportes.clave  → cat_noagro_y_gastos (1078 entries, 011111-900)
                             vs cat_gastos

agroproductos.codigo / agroconsumo.codigo (VARCHAR(3)):
    → cat_productoagricola (588 entries, 001-638)

Validación INEGI — nota explícita
---------------------------------
S6 NO tiene bounds HIGH contra cifras oficiales INEGI.

Búsqueda realizada 2026-04-22 (5 URLs INEGI, 4 PDFs: Comunicado 112/25,
Presentación resultados ENIGH 2024, ENIGH2024_RR.pdf, descripción
cálculo de indicadores microdatos). Los PDFs tienen contenido con
FlateDecode compression que WebFetch no pudo extraer a texto legible
en esta sesión. El Comunicado 112/25 (ya analizado en S3/S4/S5) no
publica cifras desagregadas sobre hogares-con-agro ni hogares-con-noagro
en cuadros principales.

Decisión (OK del usuario Gate 1 pre-verificaciones): S6 usa bounds
ESTRUCTURALES + INFO descriptivos. La narrativa rigurosa vs INEGI ya
quedó establecida en S3/S4/S5 con 11 bounds passing al peso simultáneos
(Δ máx 0.078% vs Comunicado 112/25 cuadro 2).

Cross-validations Gate 4 (pipeline completo, INFO no HALT):
    - Cobertura hogares-con-agro: DISTINCT (folioviv,foliohog) agro / 91 414
    - Cobertura hogares-con-noagro
    - Overlap agro ∩ noagro (hogares con ambas actividades)
    - Distribución por decil (cross con concentradohogar.decil S3) —
      hipótesis: hogares-con-agro concentrados en deciles bajos rurales
    - Top 5 entidades federativas por hogares-agro y hogares-noagro
      (CDMX probable ≈0 en agro)
    - Σ ventas agro y noagro (valor agregado nacional, sin bound oficial)

Lecciones acumuladas aplicadas (S3-S5)
--------------------------------------
- MD5 byte-exact local ≡ Neon obligatorio Gate 3.
- Streaming generator puro (no list materialization).
- Tiebreaker explícito ORDER BY en digest cross-DB (PK completa es único).
- Ledger/summary: N/A aquí — agro/noagro no son ledgers sobre un
  agregado oficial publicado; sus `ing_tri/ero_tri/ventas_tri` son
  cifras trimestrales por actividad sin reproducción cruzada contra
  concentradohogar en Comunicado 112/25 cuadro 2.

Uso
---

    /Users/davicho/datos-itam/api/.venv/bin/python \\
        /Users/davicho/datos-itam/api/scripts/ingest_enigh_negocios.py \\
        --dry-run

Requiere asyncpg.
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import re
import resource
import sys
import time
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional, Sequence, Tuple

import asyncpg


# ---------------------------------------------------------------------
# Paths & connection config
# ---------------------------------------------------------------------

ROOT = Path("/Users/davicho/datos-itam")
DATA_ROOT = ROOT / "data-sources" / "conjunto_de_datos_enigh2024_ns_csv"
MIGRATION_007 = ROOT / "api" / "migrations" / "007_enigh_schema.sql"

LOCAL_DSN = (
    "postgresql://datos_public:datos_public_2026@localhost:54322/"
    "remuneraciones_cdmx"
)
NEON_DSN = (
    "postgresql://neondb_owner:npg_GdjNhW7S5ACu@"
    "ep-broad-shadow-anxgp6d8-pooler.c-6.us-east-1.aws.neon.tech/"
    "remuneraciones_cdmx?sslmode=require"
)


# Orden estricto jerárquico (raíz primero, sub-tablas después).
TABLES: List[str] = [
    "agro",
    "agroproductos",
    "agroconsumo",
    "agrogasto",
    "noagro",
    "noagroimportes",
]

EXPECTED_COUNTS: Dict[str, int] = {
    "agro":            17_442,
    "agroproductos":   69_052,
    "agroconsumo":     43_992,
    "agrogasto":       61_132,
    "noagro":          23_109,
    "noagroimportes": 151_276,
}

EXPECTED_TOTAL = sum(EXPECTED_COUNTS.values())  # 366 003

# PKs naturales (para dry-run reporte y sanity).
PK_COLUMNS: Dict[str, Tuple[str, ...]] = {
    "agro":            ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact"),
    "agroproductos":   ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact",
                        "numprod"),
    "agroconsumo":     ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact",
                        "numprod", "destino"),
    "agrogasto":       ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact",
                        "clave"),
    "noagro":          ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact"),
    "noagroimportes":  ("folioviv", "foliohog", "numren", "id_trabajo", "clave"),
}

# Hogares totales (S3): para cobertura INFO en Gate 4.
HOGARES_TOTAL_S3 = 91_414
HOGARES_EXPANDIDOS_S3 = 38_830_230  # Σ factor

# Umbral empírico para FK débil noagroimportes ↔ noagro.
# >1% de filas huérfanas (no matchean 4-tuple) → HALT.
# <=1% → INFO metodológico y continuar.
NOAGROIMPORTES_ORPHAN_THRESHOLD_PCT = Decimal("1.0")


# Null markers (post-strip).
NULL_TOKENS = frozenset(("", " ", "NA", "-"))


# ---------------------------------------------------------------------
# HALT thresholds
# ---------------------------------------------------------------------

# Tiempo HALT por tabla por DB. Volumen modesto: 10-30s local, 20-60s
# Neon. 120s deja margen.
TIMING_HALT_SECONDS = 120

# RAM peak HALT (proceso Python). Volumen modesto → 300 MB es cota
# cómoda; >500 MB es bandera.
RAM_HALT_MB = 500

# Log de progreso durante stream (solo noagroimportes y agroproductos
# tienen >50K filas). Log cada 50 000 filas.
LOG_EVERY_N_ROWS = 50_000


# ---------------------------------------------------------------------
# DDL parsing — extrae columnas + tipos de migration 007
# ---------------------------------------------------------------------

# Regex extendido vs S5: añade BIGINT (usado en agro.ventas/autocons/
# otrosnom/gasneg).
COLUMN_RE = re.compile(
    r"^\s+(?P<name>[a-z_0-9]+)\s+"
    r"(?P<ddl>VARCHAR\(\d+\)|SMALLINT|INTEGER|BIGINT|NUMERIC\(\d+,\s*\d+\))"
)


@dataclass
class Column:
    name: str
    ddl: str
    caster: Callable[[str], Any]


def _cast_varchar(raw: str) -> Optional[str]:
    s = raw.strip()
    return None if s in NULL_TOKENS else s


def _cast_int(raw: str) -> Optional[int]:
    s = raw.strip()
    if s in NULL_TOKENS:
        return None
    return int(s)


def _cast_numeric(raw: str) -> Optional[Decimal]:
    s = raw.strip()
    if s in NULL_TOKENS:
        return None
    return Decimal(s)


def _caster_for(ddl: str) -> Callable[[str], Any]:
    if ddl.startswith("VARCHAR"):
        return _cast_varchar
    if ddl in ("SMALLINT", "INTEGER", "BIGINT"):
        return _cast_int
    if ddl.startswith("NUMERIC"):
        return _cast_numeric
    raise ValueError(f"unhandled DDL type: {ddl}")


def parse_ddl_columns(table: str) -> List[Column]:
    """Extrae columnas de ``CREATE TABLE enigh.<table> (...)`` desde
    migration 007. Todas las 6 tablas S6 tienen PK natural (no
    BIGSERIAL)."""
    txt = MIGRATION_007.read_text(encoding="utf-8")
    m = re.search(rf"^CREATE TABLE enigh\.{re.escape(table)} \(\s*$",
                  txt, re.MULTILINE)
    if not m:
        raise RuntimeError(
            f"CREATE TABLE enigh.{table} no encontrado en migration 007"
        )
    start = m.end()
    end_m = re.search(r"^\);\s*$", txt[start:], re.MULTILINE)
    if not end_m:
        raise RuntimeError(f"No se encontró fin del CREATE TABLE {table}")
    body = txt[start:start + end_m.start()]

    cols: List[Column] = []
    for line in body.splitlines():
        cm = COLUMN_RE.match(line)
        if not cm:
            continue
        name = cm.group("name")
        ddl = cm.group("ddl")
        cols.append(Column(name=name, ddl=ddl, caster=_caster_for(ddl)))
    return cols


# ---------------------------------------------------------------------
# CSV streaming
# ---------------------------------------------------------------------


def csv_path(table: str) -> Path:
    return (
        DATA_ROOT
        / f"conjunto_de_datos_{table}_enigh2024_ns"
        / "conjunto_de_datos"
        / f"conjunto_de_datos_{table}_enigh2024_ns.csv"
    )


def validate_header_matches_ddl(table: str, cols: List[Column]) -> None:
    """FAIL si header CSV no matchea nombres DDL en orden."""
    path = csv_path(table)
    with path.open("r", encoding="utf-8", newline="") as f:
        header = next(csv.reader(f))
    ddl_names = [c.name for c in cols]
    if header != ddl_names:
        diff = []
        for i, (h, d) in enumerate(zip(header, ddl_names)):
            if h != d:
                diff.append(f"  col {i}: CSV={h!r} DDL={d!r}")
        if len(header) != len(ddl_names):
            diff.append(
                f"  len mismatch: CSV={len(header)} DDL={len(ddl_names)}"
            )
        raise RuntimeError(
            f"{table}: header CSV no matchea DDL:\n" + "\n".join(diff)
        )


def count_csv_data_rows(table: str) -> int:
    """Cuenta filas de datos (sin header) — útil en dry-run."""
    path = csv_path(table)
    n = 0
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        next(reader)
        for _ in reader:
            n += 1
    return n


def stream_records(
    table: str,
    cols: List[Column],
    label: Optional[str] = None,
    progress_start: Optional[float] = None,
) -> Iterable[Tuple[Any, ...]]:
    """Generator: yields tuples listos para copy_records_to_table.

    Log de progreso cada ``LOG_EVERY_N_ROWS`` filas si label y
    progress_start son provistos.
    """
    path = csv_path(table)
    casters = [c.caster for c in cols]
    n = 0
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) != len(casters):
                raise RuntimeError(
                    f"{table}: fila con {len(row)} campos, "
                    f"esperaba {len(casters)}"
                )
            n += 1
            if (label is not None and progress_start is not None
                    and n % LOG_EVERY_N_ROWS == 0):
                elapsed = time.monotonic() - progress_start
                rate = n / elapsed if elapsed > 0 else 0
                print(f"  [{label}] {table}: {n:>8,} filas streamed  "
                      f"({elapsed:>6.1f}s, {rate:>9,.0f} filas/s)")
            yield tuple(cast(v) for cast, v in zip(casters, row))


# ---------------------------------------------------------------------
# DB operations
# ---------------------------------------------------------------------


async def connect(dsn: str) -> asyncpg.Connection:
    return await asyncpg.connect(
        dsn,
        statement_cache_size=0 if "neon" in dsn else 100,
    )


async def truncate_and_load(
    conn: asyncpg.Connection,
    table: str,
    cols: List[Column],
    label: str,
) -> Tuple[int, float]:
    """TRUNCATE + COPY streaming. Retorna (count, elapsed).

    Streaming generator: NO materializa la lista en memoria.
    Todas las 6 tablas S6 tienen PK natural → TRUNCATE simple
    (sin RESTART IDENTITY).
    """
    col_names = tuple(c.name for c in cols)
    start = time.monotonic()
    async with conn.transaction():
        await conn.execute(f"TRUNCATE TABLE enigh.{table}")
        await conn.copy_records_to_table(
            table, schema_name="enigh",
            columns=col_names,
            records=stream_records(table, cols, label=label,
                                   progress_start=start),
        )
    elapsed = time.monotonic() - start
    actual = await conn.fetchval(f"SELECT COUNT(*) FROM enigh.{table}")
    return actual, elapsed


# ---------------------------------------------------------------------
# FK-checks documentales
# ---------------------------------------------------------------------

# Catálogos por tabla — FK-checks deterministas (100% match o HALT).
# Los `clave` ambiguos (agrogasto.clave, noagroimportes.clave) se
# resuelven con diagnóstico runtime pre-load (ver
# diagnose_ambiguous_fk).
FK_CATALOG_CHECKS: Dict[str, List[Tuple[str, str, str]]] = {
    "agro": [
        ("tipoact", "cat_tipoact", "tipo de actividad agropecuaria"),
    ],
    "agroproductos": [
        ("tipoact",  "cat_tipoact",  "tipo de actividad agropecuaria"),
        ("cicloagr", "cat_cicloagr", "ciclo agrícola"),
    ],
    "agroconsumo": [
        ("tipoact", "cat_tipoact", "tipo de actividad agropecuaria"),
        ("destino", "cat_destino", "destino del producto"),
    ],
    "agrogasto": [
        ("tipoact", "cat_tipoact", "tipo de actividad agropecuaria"),
    ],
    "noagro": [
        ("tipoact", "cat_tipoact", "tipo de actividad no-agropecuaria"),
        ("lugact",  "cat_lugact",  "lugar donde se realiza la actividad"),
        ("peract",  "cat_peract",  "periodicidad de la actividad"),
    ],
    "noagroimportes": [
        # clave se resuelve por diagnóstico runtime.
    ],
}

# FK naturales por tabla (PK-parte → padre).
# Formato: (parent_table, parent_keys)
FK_NATURAL_CHECKS: Dict[str, List[Tuple[str, Tuple[str, ...]]]] = {
    "agro": [
        ("hogares",   ("folioviv", "foliohog")),
        ("poblacion", ("folioviv", "foliohog", "numren")),
        ("trabajos",  ("folioviv", "foliohog", "numren", "id_trabajo")),
    ],
    "agroproductos": [
        ("hogares",   ("folioviv", "foliohog")),
        ("trabajos",  ("folioviv", "foliohog", "numren", "id_trabajo")),
        ("agro",      ("folioviv", "foliohog", "numren", "id_trabajo",
                       "tipoact")),
    ],
    "agroconsumo": [
        ("hogares",       ("folioviv", "foliohog")),
        ("trabajos",      ("folioviv", "foliohog", "numren", "id_trabajo")),
        ("agro",          ("folioviv", "foliohog", "numren", "id_trabajo",
                           "tipoact")),
        ("agroproductos", ("folioviv", "foliohog", "numren", "id_trabajo",
                           "tipoact", "numprod")),
    ],
    "agrogasto": [
        ("hogares",  ("folioviv", "foliohog")),
        ("trabajos", ("folioviv", "foliohog", "numren", "id_trabajo")),
        ("agro",     ("folioviv", "foliohog", "numren", "id_trabajo",
                      "tipoact")),
    ],
    "noagro": [
        ("hogares",   ("folioviv", "foliohog")),
        ("poblacion", ("folioviv", "foliohog", "numren")),
        ("trabajos",  ("folioviv", "foliohog", "numren", "id_trabajo")),
    ],
    "noagroimportes": [
        ("hogares",  ("folioviv", "foliohog")),
        ("trabajos", ("folioviv", "foliohog", "numren", "id_trabajo")),
        # FK 4-tuple a noagro verificada por separado con threshold
        # (ver _check_noagroimportes_noagro_fk).
    ],
}


async def orphan_check_catalog(
    conn: asyncpg.Connection, child_table: str, child_col: str,
    cat_table: str, cat_col: str = "clave",
) -> int:
    """Cuenta filas en child donde child_col NOT NULL sin match en
    cat_table.cat_col."""
    q = (
        f"SELECT COUNT(*) FROM enigh.{child_table} c "
        f"WHERE c.{child_col} IS NOT NULL "
        f"  AND NOT EXISTS ("
        f"    SELECT 1 FROM enigh.{cat_table} k WHERE k.{cat_col} = c.{child_col}"
        f"  )"
    )
    return await conn.fetchval(q)


async def orphan_check_natural(
    conn: asyncpg.Connection, child: str, parent: str,
    keys: Sequence[str],
) -> int:
    """Cuenta filas en child sin match en parent por keys (LEFT JOIN)."""
    using = ", ".join(keys)
    null_cond = " AND ".join(f"p.{k} IS NULL" for k in keys)
    q = (
        f"SELECT COUNT(*) FROM enigh.{child} c "
        f"LEFT JOIN enigh.{parent} p USING ({using}) "
        f"WHERE {null_cond}"
    )
    return await conn.fetchval(q)


# ---------------------------------------------------------------------
# Diagnóstico FK runtime pre-load (patrón heredado de S5 gastotarjetas)
# ---------------------------------------------------------------------

# Columna ambigua → lista de (cat_table, descripción corta).
AMBIGUOUS_FKS: Dict[str, Tuple[str, List[Tuple[str, str]]]] = {
    # table → (column, [(cat_candidate, desc), ...])
    "agroproductos":  ("codigo", [
        ("cat_productoagricola", "producto agrícola (3-char, 001-638)"),
        ("cat_producto", "producto genérico"),
    ]),
    "agroconsumo":    ("codigo", [
        ("cat_productoagricola", "producto agrícola (3-char, 001-638)"),
        ("cat_producto", "producto genérico"),
    ]),
    "agrogasto":      ("clave", [
        ("cat_gastonegocioagro", "gasto negocio agro (3-char, B00-F18)"),
        ("cat_gastos", "catálogo gastos general (mixto 4/6-char)"),
    ]),
    "noagroimportes": ("clave", [
        ("cat_noagro_y_gastos", "noagro y gastos (1078 entries, mixto)"),
        ("cat_gastos", "catálogo gastos general"),
    ]),
}


def _col_index_in_csv(table: str, col: str) -> int:
    """Índice 0-based de `col` en el header del CSV."""
    path = csv_path(table)
    with path.open("r", encoding="utf-8", newline="") as f:
        header = next(csv.reader(f))
    if col not in header:
        raise RuntimeError(f"{table}: col '{col}' no está en header CSV")
    return header.index(col)


async def diagnose_ambiguous_fk(
    conn: asyncpg.Connection, table: str,
) -> Tuple[str, Dict[str, Any]]:
    """Lee distinct de la col ambigua en el CSV, compara contra
    catálogos candidatos. Retorna (winning_cat, diag_dict).

    Raises GateError si ningún candidato cubre 100%.
    """
    col, candidates = AMBIGUOUS_FKS[table]
    col_ix = _col_index_in_csv(table, col)

    path = csv_path(table)
    distinct: set = set()
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            val = row[col_ix].strip()
            if val and val not in NULL_TOKENS:
                distinct.add(val)
    n_distinct = len(distinct)
    keys_arr = sorted(distinct)

    matches: Dict[str, int] = {}
    for cat_table, _desc in candidates:
        m = await conn.fetchval(
            f"SELECT COUNT(*) FROM enigh.{cat_table} "
            f"WHERE clave = ANY($1::text[])",
            keys_arr,
        )
        matches[cat_table] = m

    # Winner: cat que matchea 100%.
    winners = [c for c, m in matches.items() if m == n_distinct]

    diag = {
        "col": col,
        "n_distinct_csv": n_distinct,
        "sample_codes": keys_arr[:10],
        "candidates": candidates,
        "matches": matches,
        "winner": winners[0] if winners else None,
    }
    if not winners:
        msgs = ", ".join(f"{c}={m}/{n_distinct}" for c, m in matches.items())
        raise GateError(
            f"{table}.{col}: ningún catálogo cubre 100% de claves "
            f"({msgs}) — HALT. Sample: {keys_arr[:10]}"
        )
    return winners[0], diag


# ---------------------------------------------------------------------
# FK débil noagroimportes ↔ noagro (4-tuple con threshold)
# ---------------------------------------------------------------------


async def _check_noagroimportes_noagro_fk(
    conn: asyncpg.Connection, label: str,
) -> None:
    """noagroimportes y noagro comparten 4-tuple (folioviv, foliohog,
    numren, id_trabajo) pero la 5ta col difiere (clave vs tipoact).
    Verificación empírica — si >1% de noagroimportes NO matchea 4-tuple
    en noagro → HALT (probablemente hay otra tabla intermedia o
    metodología que desconocemos). Si <=1% → INFO y continuar.
    """
    # COUNT DISTINCT 4-tuples en noagroimportes que NO tienen match en noagro.
    q_orphans = (
        "SELECT COUNT(DISTINCT (ni.folioviv, ni.foliohog, ni.numren, "
        "ni.id_trabajo)) AS orphans_4tup, "
        "       COUNT(*)::bigint AS total_rows "
        "FROM enigh.noagroimportes ni "
        "LEFT JOIN enigh.noagro n "
        "  ON n.folioviv = ni.folioviv "
        " AND n.foliohog = ni.foliohog "
        " AND n.numren   = ni.numren "
        " AND n.id_trabajo = ni.id_trabajo "
        "WHERE n.folioviv IS NULL"
    )
    row_orph = await conn.fetchrow(q_orphans)
    orphan_distinct = row_orph["orphans_4tup"] or 0
    rows_orph = await conn.fetchval(
        "SELECT COUNT(*) FROM enigh.noagroimportes ni "
        "LEFT JOIN enigh.noagro n "
        "  ON n.folioviv = ni.folioviv "
        " AND n.foliohog = ni.foliohog "
        " AND n.numren   = ni.numren "
        " AND n.id_trabajo = ni.id_trabajo "
        "WHERE n.folioviv IS NULL"
    )
    total = await conn.fetchval("SELECT COUNT(*) FROM enigh.noagroimportes")

    pct = (Decimal(rows_orph) / Decimal(total) * Decimal(100)
           ).quantize(Decimal("0.001"))

    print(f"\n[{label}] FK débil noagroimportes ↔ noagro (4-tuple):")
    print(f"  total filas noagroimportes:                  {total:>8,}")
    print(f"  filas sin match 4-tup en noagro:             {rows_orph:>8,} "
          f"({pct}%)")
    print(f"  4-tuples DISTINCT huérfanos:                 "
          f"{orphan_distinct:>8,}")

    if pct > NOAGROIMPORTES_ORPHAN_THRESHOLD_PCT:
        # Muestra de 5 huérfanos para diagnóstico
        sample = await conn.fetch(
            "SELECT ni.folioviv, ni.foliohog, ni.numren, ni.id_trabajo, ni.clave "
            "FROM enigh.noagroimportes ni "
            "LEFT JOIN enigh.noagro n "
            "  ON n.folioviv=ni.folioviv AND n.foliohog=ni.foliohog "
            " AND n.numren=ni.numren AND n.id_trabajo=ni.id_trabajo "
            "WHERE n.folioviv IS NULL LIMIT 5"
        )
        sample_str = "\n    ".join(
            f"({r['folioviv']}, {r['foliohog']}, {r['numren']}, "
            f"{r['id_trabajo']}, clave={r['clave']})"
            for r in sample
        )
        raise GateError(
            f"{label}: noagroimportes {pct}% filas sin 4-tup match en "
            f"noagro > threshold {NOAGROIMPORTES_ORPHAN_THRESHOLD_PCT}% "
            f"— HALT.\n  Sample huérfanos:\n    {sample_str}"
        )
    print(f"  ✓ Por debajo del threshold "
          f"{NOAGROIMPORTES_ORPHAN_THRESHOLD_PCT}% — INFO metodológico, "
          f"continúa.")


# ---------------------------------------------------------------------
# Sample rows
# ---------------------------------------------------------------------

# Columnas semánticamente ricas para inspección visual por tabla.
SAMPLE_COLUMNS: Dict[str, Tuple[str, ...]] = {
    "agro":           ("folioviv", "foliohog", "numren", "id_trabajo",
                       "tipoact", "ventas", "gasneg", "ing_tri"),
    "agroproductos":  ("folioviv", "foliohog", "numren", "id_trabajo",
                       "tipoact", "numprod", "codigo", "cantidad",
                       "valor"),
    "agroconsumo":    ("folioviv", "foliohog", "numren", "id_trabajo",
                       "tipoact", "numprod", "destino", "cantidad",
                       "valestim"),
    "agrogasto":      ("folioviv", "foliohog", "numren", "id_trabajo",
                       "tipoact", "clave", "gasto"),
    "noagro":         ("folioviv", "foliohog", "numren", "id_trabajo",
                       "tipoact", "lugact", "peract", "ing_tri",
                       "ventas_tri"),
    "noagroimportes": ("folioviv", "foliohog", "numren", "id_trabajo",
                       "clave", "importe_1", "importe_2", "importe_3"),
}


async def sample_rows(
    conn: asyncpg.Connection, table: str, n: int = 5
) -> List[Dict]:
    cols = ", ".join(SAMPLE_COLUMNS[table])
    rows = await conn.fetch(
        f"SELECT {cols} FROM enigh.{table} ORDER BY random() LIMIT $1", n
    )
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------
# Gate 4 — cross-validations pipeline completo (INFO, no HALT)
# ---------------------------------------------------------------------


async def gate4_pipeline_cross_validations(
    conn: asyncpg.Connection, label: str,
) -> None:
    """Narrativa agregada que solo existe con pipeline multi-dataset.
    Todas son INFO — no gate de fallo. Produce insights para S7+."""
    print(f"\n[{label}] === Gate 4 cross-validations pipeline ENIGH ===")

    # ----- 1-3. Cobertura hogares-con-agro, hogares-con-noagro, overlap -----
    # Métricas muestrales Y expandidas con SUM(factor) — patrón S5.
    row = await conn.fetchrow(
        "WITH hog_agro AS (SELECT DISTINCT folioviv, foliohog FROM enigh.agro), "
        "     hog_noagro AS (SELECT DISTINCT folioviv, foliohog FROM enigh.noagro), "
        "     hog_ambos AS ( "
        "       SELECT folioviv, foliohog FROM hog_agro "
        "       INTERSECT SELECT folioviv, foliohog FROM hog_noagro) "
        "SELECT "
        "  (SELECT COUNT(*) FROM hog_agro) AS n_hog_agro, "
        "  (SELECT COUNT(*) FROM hog_noagro) AS n_hog_noagro, "
        "  (SELECT COUNT(*) FROM hog_ambos) AS n_hog_ambos, "
        "  (SELECT SUM(h.factor)::bigint FROM hog_agro ha "
        "     JOIN enigh.hogares h USING (folioviv, foliohog)) AS exp_agro, "
        "  (SELECT SUM(h.factor)::bigint FROM hog_noagro hn "
        "     JOIN enigh.hogares h USING (folioviv, foliohog)) AS exp_noagro, "
        "  (SELECT SUM(h.factor)::bigint FROM hog_ambos hb "
        "     JOIN enigh.hogares h USING (folioviv, foliohog)) AS exp_ambos"
    )
    n_agro, n_noagro, n_ambos = (
        row["n_hog_agro"], row["n_hog_noagro"], row["n_hog_ambos"],
    )
    exp_agro = row["exp_agro"] or 0
    exp_noagro = row["exp_noagro"] or 0
    exp_ambos = row["exp_ambos"] or 0
    pct_agro = (Decimal(n_agro) / Decimal(HOGARES_TOTAL_S3) * Decimal(100)
                ).quantize(Decimal("0.01"))
    pct_noagro = (Decimal(n_noagro) / Decimal(HOGARES_TOTAL_S3) * Decimal(100)
                  ).quantize(Decimal("0.01"))
    pct_ambos = (Decimal(n_ambos) / Decimal(HOGARES_TOTAL_S3) * Decimal(100)
                 ).quantize(Decimal("0.001"))
    pct_exp_agro = (Decimal(exp_agro) / Decimal(HOGARES_EXPANDIDOS_S3)
                    * Decimal(100)).quantize(Decimal("0.01"))
    pct_exp_noagro = (Decimal(exp_noagro) / Decimal(HOGARES_EXPANDIDOS_S3)
                      * Decimal(100)).quantize(Decimal("0.01"))
    pct_exp_ambos = (Decimal(exp_ambos) / Decimal(HOGARES_EXPANDIDOS_S3)
                     * Decimal(100)).quantize(Decimal("0.001"))
    print(f"  [1] Cobertura hogares-con-agro:")
    print(f"      muestra:   {n_agro:>8,} / {HOGARES_TOTAL_S3:,} = "
          f"{pct_agro}%")
    print(f"      expandido: {exp_agro:>8,} / {HOGARES_EXPANDIDOS_S3:,} = "
          f"{pct_exp_agro}% (SUM factor)")
    print(f"  [2] Cobertura hogares-con-noagro:")
    print(f"      muestra:   {n_noagro:>8,} / {HOGARES_TOTAL_S3:,} = "
          f"{pct_noagro}%")
    print(f"      expandido: {exp_noagro:>8,} / {HOGARES_EXPANDIDOS_S3:,} = "
          f"{pct_exp_noagro}% (SUM factor)")
    print(f"  [3] Hogares con AMBAS actividades (agro ∩ noagro):")
    print(f"      muestra:   {n_ambos:>8,} / {HOGARES_TOTAL_S3:,} = "
          f"{pct_ambos}%")
    print(f"      expandido: {exp_ambos:>8,} / {HOGARES_EXPANDIDOS_S3:,} = "
          f"{pct_exp_ambos}% (SUM factor)")

    # ----- 4. Distribución por decil usando concentradohogar.decil (S3) -----
    # Solo hogares-con-agro distinct, por decil.
    print(f"\n  [4] Distribución hogares-con-AGRO por decil "
          f"(concentradohogar.decil S3):")
    rows = await conn.fetch(
        "WITH hog_agro AS ( "
        "  SELECT DISTINCT folioviv, foliohog FROM enigh.agro "
        ") "
        "SELECT c.decil, "
        "       COUNT(*)::bigint AS n_hog_muestra, "
        "       SUM(h.factor)::bigint AS n_hog_expandido "
        "FROM hog_agro ha "
        "JOIN enigh.concentradohogar c USING (folioviv, foliohog) "
        "JOIN enigh.hogares h USING (folioviv, foliohog) "
        "GROUP BY c.decil ORDER BY c.decil"
    )
    total_ag_exp = sum(r["n_hog_expandido"] for r in rows)
    print(f"       decil   muestra   expandido      %   (total expandido "
          f"{total_ag_exp:,})")
    for r in rows:
        pct = (Decimal(r["n_hog_expandido"]) / Decimal(total_ag_exp) *
               Decimal(100)).quantize(Decimal("0.01"))
        print(f"          {r['decil']}   {r['n_hog_muestra']:>6,}  "
              f"{r['n_hog_expandido']:>9,}   {pct:>5}%")

    print(f"\n  [4b] Distribución hogares-con-NOAGRO por decil:")
    rows = await conn.fetch(
        "WITH hog_noagro AS ( "
        "  SELECT DISTINCT folioviv, foliohog FROM enigh.noagro "
        ") "
        "SELECT c.decil, "
        "       COUNT(*)::bigint AS n_hog_muestra, "
        "       SUM(h.factor)::bigint AS n_hog_expandido "
        "FROM hog_noagro hn "
        "JOIN enigh.concentradohogar c USING (folioviv, foliohog) "
        "JOIN enigh.hogares h USING (folioviv, foliohog) "
        "GROUP BY c.decil ORDER BY c.decil"
    )
    total_na_exp = sum(r["n_hog_expandido"] for r in rows)
    print(f"       decil   muestra   expandido      %   (total expandido "
          f"{total_na_exp:,})")
    for r in rows:
        pct = (Decimal(r["n_hog_expandido"]) / Decimal(total_na_exp) *
               Decimal(100)).quantize(Decimal("0.01"))
        print(f"          {r['decil']}   {r['n_hog_muestra']:>6,}  "
              f"{r['n_hog_expandido']:>9,}   {pct:>5}%")

    # ----- 5. Top 5 entidades por hogares-agro y hogares-noagro -----
    # ubica_geo está en concentradohogar; entidad = LEFT(ubica_geo, 2).
    print(f"\n  [5] Top 5 entidades federativas por hogares-con-AGRO:")
    rows = await conn.fetch(
        "WITH hog_agro AS ( "
        "  SELECT DISTINCT folioviv, foliohog FROM enigh.agro "
        ") "
        "SELECT LEFT(c.ubica_geo, 2) AS ent_cve, "
        "       COUNT(*)::bigint AS n_hog_muestra, "
        "       SUM(h.factor)::bigint AS n_hog_expandido "
        "FROM hog_agro ha "
        "JOIN enigh.concentradohogar c USING (folioviv, foliohog) "
        "JOIN enigh.hogares h USING (folioviv, foliohog) "
        "WHERE c.ubica_geo IS NOT NULL "
        "GROUP BY ent_cve ORDER BY n_hog_expandido DESC LIMIT 5"
    )
    print(f"       entidad   muestra   expandido")
    for r in rows:
        ent = await conn.fetchval(
            "SELECT descripcion FROM enigh.cat_entidad WHERE clave=$1",
            r["ent_cve"],
        )
        ent_short = (ent or r["ent_cve"])[:32]
        print(f"         {r['ent_cve']}    {r['n_hog_muestra']:>6,}  "
              f"{r['n_hog_expandido']:>9,}   {ent_short}")

    print(f"\n  [5b] Top 5 entidades federativas por hogares-con-NOAGRO:")
    rows = await conn.fetch(
        "WITH hog_noagro AS ( "
        "  SELECT DISTINCT folioviv, foliohog FROM enigh.noagro "
        ") "
        "SELECT LEFT(c.ubica_geo, 2) AS ent_cve, "
        "       COUNT(*)::bigint AS n_hog_muestra, "
        "       SUM(h.factor)::bigint AS n_hog_expandido "
        "FROM hog_noagro hn "
        "JOIN enigh.concentradohogar c USING (folioviv, foliohog) "
        "JOIN enigh.hogares h USING (folioviv, foliohog) "
        "WHERE c.ubica_geo IS NOT NULL "
        "GROUP BY ent_cve ORDER BY n_hog_expandido DESC LIMIT 5"
    )
    print(f"       entidad   muestra   expandido")
    for r in rows:
        ent = await conn.fetchval(
            "SELECT descripcion FROM enigh.cat_entidad WHERE clave=$1",
            r["ent_cve"],
        )
        ent_short = (ent or r["ent_cve"])[:32]
        print(f"         {r['ent_cve']}    {r['n_hog_muestra']:>6,}  "
              f"{r['n_hog_expandido']:>9,}   {ent_short}")

    # ----- 6. CDMX check explícito (muestra + expandido) -----
    row = await conn.fetchrow(
        "WITH ha AS (SELECT DISTINCT a.folioviv, a.foliohog "
        "            FROM enigh.agro a "
        "            JOIN enigh.concentradohogar c USING (folioviv, foliohog) "
        "            WHERE LEFT(c.ubica_geo, 2) = '09'), "
        "     hn AS (SELECT DISTINCT n.folioviv, n.foliohog "
        "            FROM enigh.noagro n "
        "            JOIN enigh.concentradohogar c USING (folioviv, foliohog) "
        "            WHERE LEFT(c.ubica_geo, 2) = '09') "
        "SELECT (SELECT COUNT(*) FROM ha) AS n_agro, "
        "       (SELECT COUNT(*) FROM hn) AS n_noagro, "
        "       (SELECT COALESCE(SUM(h.factor),0)::bigint FROM ha "
        "          JOIN enigh.hogares h USING (folioviv, foliohog)) AS exp_agro, "
        "       (SELECT COALESCE(SUM(h.factor),0)::bigint FROM hn "
        "          JOIN enigh.hogares h USING (folioviv, foliohog)) AS exp_noagro"
    )
    print(f"\n  [6] CDMX (entidad '09') hogares:")
    print(f"      con agro:   muestra={row['n_agro']:>5,}   "
          f"expandido={row['exp_agro']:>9,}   "
          f"(hipótesis: ≈0 porque CDMX es urbana)")
    print(f"      con noagro: muestra={row['n_noagro']:>5,}   "
          f"expandido={row['exp_noagro']:>9,}")

    # ----- 7. Σ ventas agregado expandido (INFO narrativo) -----
    # agro.ventas es BIGINT en pesos TRIMESTRALES (registro de trimestre
    # de referencia). gasneg es gasto del negocio, también trimestral.
    row = await conn.fetchrow(
        "SELECT SUM(a.ventas::numeric * h.factor)  AS sum_ventas_agro, "
        "       SUM(a.gasneg::numeric * h.factor)  AS sum_gasto_agro, "
        "       SUM(a.ing_tri * h.factor)          AS sum_ing_agro, "
        "       SUM(a.ero_tri * h.factor)          AS sum_ero_agro "
        "FROM enigh.agro a "
        "JOIN enigh.hogares h USING (folioviv, foliohog)"
    )
    sum_ventas_agro = row["sum_ventas_agro"] or Decimal(0)
    sum_gasto_agro = row["sum_gasto_agro"] or Decimal(0)
    sum_ing_agro = row["sum_ing_agro"] or Decimal(0)
    sum_ero_agro = row["sum_ero_agro"] or Decimal(0)
    print(f"\n  [7] Σ AGRO expandido (trimestral, pesos nacionales):")
    print(f"      ventas:        {sum_ventas_agro:>20,.0f}")
    print(f"      gasto negocio: {sum_gasto_agro:>20,.0f}")
    print(f"      ing_tri:       {sum_ing_agro:>20,.0f}")
    print(f"      ero_tri:       {sum_ero_agro:>20,.0f}")

    # noagro.ventas1..ventas6 son NUMERIC mensuales (últimos 6 meses).
    # ing_tri/ero_tri son NUMERIC trimestrales (ya agregados).
    # Paréntesis correctos: la suma mensual × factor para expandir.
    row = await conn.fetchrow(
        "SELECT SUM((COALESCE(n.ventas1,0)+COALESCE(n.ventas2,0)+"
        "            COALESCE(n.ventas3,0)+COALESCE(n.ventas4,0)+"
        "            COALESCE(n.ventas5,0)+COALESCE(n.ventas6,0)) "
        "           * h.factor) AS sum_ventas_noagro_6m, "
        "       SUM(n.ing_tri * h.factor)    AS sum_ing_noagro, "
        "       SUM(n.ero_tri * h.factor)    AS sum_ero_noagro, "
        "       SUM(n.ventas_tri * h.factor) AS sum_ventas_tri_noagro "
        "FROM enigh.noagro n "
        "JOIN enigh.hogares h USING (folioviv, foliohog)"
    )
    sum_v6m = row["sum_ventas_noagro_6m"] or Decimal(0)
    sum_vtri_n = row["sum_ventas_tri_noagro"] or Decimal(0)
    sum_ing_n = row["sum_ing_noagro"] or Decimal(0)
    sum_ero_n = row["sum_ero_noagro"] or Decimal(0)
    print(f"\n  [7b] Σ NOAGRO expandido (pesos nacionales):")
    print(f"      ventas 6-meses acum: {sum_v6m:>20,.0f}")
    print(f"      ventas_tri:          {sum_vtri_n:>20,.0f}")
    print(f"      ing_tri:             {sum_ing_n:>20,.0f}")
    print(f"      ero_tri:             {sum_ero_n:>20,.0f}")

    print(f"\n  === Gate 4 pipeline cross-validations OK — todas INFO ===")


# ---------------------------------------------------------------------
# RAM peak monitoring
# ---------------------------------------------------------------------


def ram_peak_mb() -> float:
    """Peak RSS del proceso en MB. macOS reporta bytes, Linux KB."""
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    if sys.platform == "darwin":
        return rss / (1024 * 1024)
    return rss / 1024


# ---------------------------------------------------------------------
# Gate orchestration
# ---------------------------------------------------------------------


class GateError(Exception):
    """Raised when a gate fails — HALT."""


async def gate_load_and_verify(
    dsn: str, label: str, only: Optional[str] = None,
    skip_load: bool = False, run_gate4: bool = False,
) -> None:
    """Carga + valida (Gate 2/3).

    run_gate4=True ejecuta además las cross-validations Gate 4 al final.
    Solo tiene sentido tras cargar TODAS las tablas (requiere agro +
    noagro poblados).
    """
    print(f"\n{'=' * 60}")
    mode = "VALIDACIÓN (skip-load)" if skip_load else "Ingesta negocios"
    print(f"[{label}] {mode} ENIGH 2024 NS — S6")
    print(f"{'=' * 60}")

    tables_to_load = [only] if only else TABLES

    # Pre-validar headers ANTES de abrir DB
    for t in tables_to_load:
        cols = parse_ddl_columns(t)
        validate_header_matches_ddl(t, cols)
        pk = PK_COLUMNS[t]
        print(f"[{label}] {t}: header CSV matchea DDL "
              f"({len(cols)} cols, PK={'+'.join(pk)})")

    conn = await connect(dsn)
    try:
        for t in tables_to_load:
            cols = parse_ddl_columns(t)

            # Pre-load: diagnóstico FK runtime para cols ambiguas.
            runtime_winner: Optional[Tuple[str, str]] = None
            if t in AMBIGUOUS_FKS:
                col_name, _ = AMBIGUOUS_FKS[t]
                winner, diag = await diagnose_ambiguous_fk(conn, t)
                print(f"\n[{label}] {t}.{col_name} FK diagnóstico:")
                print(f"  distinct claves en CSV:  {diag['n_distinct_csv']}")
                for cat_table, _desc in diag["candidates"]:
                    m = diag["matches"][cat_table]
                    mark = "✓" if m == diag["n_distinct_csv"] else " "
                    print(f"  {mark} match en {cat_table:<24s}: "
                          f"{m}/{diag['n_distinct_csv']}")
                print(f"  sample: {diag['sample_codes']}")
                print(f"  → FK efectivo: {t}.{col_name} → enigh.{winner}.clave")
                runtime_winner = (col_name, winner)

            expected = EXPECTED_COUNTS[t]

            # Carga (saltable con --skip-load)
            if skip_load:
                n = await conn.fetchval(f"SELECT COUNT(*) FROM enigh.{t}")
                if n != expected:
                    raise GateError(
                        f"{label}: --skip-load pero enigh.{t} tiene {n:,} "
                        f"filas (esperaba {expected:,}). Re-cargar primero."
                    )
                print(f"[{label}] ✓ enigh.{t}: {n:,} filas (skip-load)")
            else:
                n, elapsed = await truncate_and_load(conn, t, cols, label)
                if n != expected:
                    raise GateError(
                        f"{label}: enigh.{t} cargó {n:,} filas, "
                        f"esperaba {expected:,} — HALT"
                    )
                if elapsed > TIMING_HALT_SECONDS:
                    raise GateError(
                        f"{label}: enigh.{t} carga = {elapsed:.1f}s "
                        f"> {TIMING_HALT_SECONDS}s — HALT"
                    )
                ram_mb = ram_peak_mb()
                if ram_mb > RAM_HALT_MB:
                    raise GateError(
                        f"{label}: RAM peak = {ram_mb:.0f} MB > "
                        f"{RAM_HALT_MB} MB (materialización) — HALT"
                    )
                print(f"[{label}] ✓ enigh.{t}: {n:,} filas en {elapsed:.2f}s "
                      f"(RAM peak: {ram_mb:.0f} MB)")

            # FK-checks documentales contra catálogos (estáticos).
            for child_col, cat_table, desc in FK_CATALOG_CHECKS.get(t, []):
                n_orphans = await orphan_check_catalog(
                    conn, t, child_col, cat_table
                )
                if n_orphans:
                    raise GateError(
                        f"{label}: enigh.{t}.{child_col} → enigh.{cat_table} "
                        f"tiene {n_orphans:,} huérfanos — HALT ({desc})"
                    )
                print(f"[{label}] ✓ FK {t}.{child_col} → "
                      f"{cat_table}.clave: 0 huérfanos")

            # FK-check contra catálogo resuelto en runtime
            if runtime_winner:
                col_name, cat_winner = runtime_winner
                n_orphans = await orphan_check_catalog(
                    conn, t, col_name, cat_winner
                )
                if n_orphans:
                    raise GateError(
                        f"{label}: {t}.{col_name} → {cat_winner} tiene "
                        f"{n_orphans:,} huérfanos post-load — HALT"
                    )
                print(f"[{label}] ✓ FK {t}.{col_name} → "
                      f"{cat_winner}.clave: 0 huérfanos (runtime-resolved)")

            # FK naturales contra tablas padre.
            for parent, keys in FK_NATURAL_CHECKS.get(t, []):
                n_orph = await orphan_check_natural(conn, t, parent, list(keys))
                if n_orph:
                    raise GateError(
                        f"{label}: enigh.{t} ({','.join(keys)}) huérfanos vs "
                        f"{parent} = {n_orph:,} — HALT"
                    )
                print(f"[{label}] ✓ FK {t} ({','.join(keys)}) → "
                      f"{parent}: 0 huérfanos")

            # Post-load adicional: FK débil noagroimportes ↔ noagro
            # (solo cuando cargamos noagroimportes y noagro existe).
            if t == "noagroimportes":
                # Solo si noagro ya está poblada.
                noagro_n = await conn.fetchval(
                    "SELECT COUNT(*) FROM enigh.noagro"
                )
                if noagro_n == EXPECTED_COUNTS["noagro"]:
                    await _check_noagroimportes_noagro_fk(conn, label)
                else:
                    print(f"[{label}] ⚠ FK débil noagroimportes ↔ noagro "
                          f"skipped (noagro tiene {noagro_n:,} ≠ "
                          f"{EXPECTED_COUNTS['noagro']:,})")

            # Sample
            samples = await sample_rows(conn, t, 5)
            sample_cols = SAMPLE_COLUMNS[t]
            print(f"[{label}] sample 5 filas (cols: {sample_cols}):")
            for s in samples:
                print(f"    {tuple(s[c] for c in sample_cols)}")

        # Cross-validations pipeline completo (solo si --run-gate4
        # Y todas las tablas S6 están pobladas).
        if run_gate4:
            all_populated = True
            for t in TABLES:
                cnt = await conn.fetchval(f"SELECT COUNT(*) FROM enigh.{t}")
                if cnt != EXPECTED_COUNTS[t]:
                    all_populated = False
                    break
            if all_populated:
                await gate4_pipeline_cross_validations(conn, label)
            else:
                print(f"\n[{label}] ⚠ Gate 4 skipped — no todas las tablas "
                      f"están pobladas.")
    finally:
        await conn.close()


# ---------------------------------------------------------------------
# MD5 digest (determinístico cross-DB)
# ---------------------------------------------------------------------

# Por tabla → (cols a digest, cols ORDER BY con tiebreaker).
# ORDER BY = PK completa (única por definición) → tiebreaker gratis.
# DIGEST cols = PK + columnas numéricas ricas (para detectar cualquier
# skew en tipos).
DIGEST_COLUMNS: Dict[str, Tuple[Tuple[str, ...], Tuple[str, ...]]] = {
    "agro": (
        ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact",
         "ventas", "autocons", "otrosnom", "gasneg",
         "ventas_tri", "auto_tri", "otros_tri", "gasto_tri",
         "ing_tri", "ero_tri"),
        PK_COLUMNS["agro"],
    ),
    "agroproductos": (
        ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact", "numprod",
         "codigo", "cantidad", "valor", "preciokg", "val_venta"),
        PK_COLUMNS["agroproductos"],
    ),
    "agroconsumo": (
        ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact", "numprod",
         "destino", "codigo", "cantidad", "valestim"),
        PK_COLUMNS["agroconsumo"],
    ),
    "agrogasto": (
        ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact", "clave",
         "gasto"),
        PK_COLUMNS["agrogasto"],
    ),
    "noagro": (
        ("folioviv", "foliohog", "numren", "id_trabajo", "tipoact",
         "lugact", "peract",
         "ing_tri", "ero_tri", "ventas_tri", "auto_tri", "otros_tri",
         "gasto_tri"),
        PK_COLUMNS["noagro"],
    ),
    "noagroimportes": (
        ("folioviv", "foliohog", "numren", "id_trabajo", "clave",
         "importe_1", "importe_2", "importe_3",
         "importe_4", "importe_5", "importe_6"),
        PK_COLUMNS["noagroimportes"],
    ),
}


async def digest_table(conn: asyncpg.Connection, table: str) -> str:
    """MD5 sobre tuplas de DIGEST_COLUMNS, ordenadas con tiebreaker."""
    digest_cols, order_cols = DIGEST_COLUMNS[table]
    cols_sql = ", ".join(digest_cols)
    order_sql = ", ".join(order_cols)
    rows = await conn.fetch(
        f"SELECT {cols_sql} FROM enigh.{table} ORDER BY {order_sql}"
    )
    h = hashlib.md5()
    for r in rows:
        line = "|".join("" if r[c] is None else str(r[c]) for c in digest_cols)
        h.update((line + "\n").encode("utf-8"))
    return h.hexdigest()


async def gate_compare_md5(only: Optional[str] = None) -> None:
    """MD5 cross-DB (cierre de Gate 3)."""
    print(f"\n{'=' * 60}\n[MD5-compare] local vs Neon\n{'=' * 60}")
    tables = [only] if only else TABLES
    local_conn = await connect(LOCAL_DSN)
    neon_conn = await connect(NEON_DSN)
    try:
        any_mismatch = False
        for t in tables:
            local_md5 = await digest_table(local_conn, t)
            neon_md5 = await digest_table(neon_conn, t)
            ok = local_md5 == neon_md5
            mark = "✓" if ok else "✗"
            print(f"  {mark} enigh.{t}")
            print(f"     local: {local_md5}")
            print(f"     neon:  {neon_md5}")
            if not ok:
                any_mismatch = True
        if any_mismatch:
            raise GateError(
                "MD5 local ≠ Neon en al menos una tabla — HALT. "
                "Probable divergencia en tipos, nulls u orden."
            )
        print(f"  ✓ MD5 idéntico local ≡ Neon en {len(tables)} tabla(s)")
    finally:
        await local_conn.close()
        await neon_conn.close()


# ---------------------------------------------------------------------
# Dry-run gate (no DB)
# ---------------------------------------------------------------------


def gate_dry_run(only: Optional[str] = None) -> None:
    """Gate 1: parsea DDL, valida headers, cuenta filas CSV. NO toca DB."""
    print(f"\n{'=' * 60}\n[DRY-RUN] Gate 1 — verificación pre-DB (S6)\n"
          f"{'=' * 60}")
    tables = [only] if only else TABLES

    print(f"\n[DRY-RUN] Migration 007: {MIGRATION_007}")
    print(f"[DRY-RUN] Data root:      {DATA_ROOT}")
    print(f"[DRY-RUN] Null markers:   {sorted(NULL_TOKENS)!r}")
    print(f"[DRY-RUN] HALT thresholds: timing={TIMING_HALT_SECONDS}s/tabla, "
          f"RAM={RAM_HALT_MB} MB peak")
    print(f"[DRY-RUN] noagroimportes ↔ noagro threshold: "
          f"{NOAGROIMPORTES_ORPHAN_THRESHOLD_PCT}% filas")

    print(f"\n[DRY-RUN] DDL parse + header match + row count:")
    total = 0
    for t in tables:
        cols = parse_ddl_columns(t)
        validate_header_matches_ddl(t, cols)
        n = count_csv_data_rows(t)
        expected = EXPECTED_COUNTS[t]
        marker = "✓" if n == expected else "✗"
        pk = PK_COLUMNS[t]
        pk_str = "+".join(pk)
        print(f"  {marker} enigh.{t:<16s} DDL cols={len(cols):3d}  "
              f"CSV rows={n:>9,}  expected={expected:>9,}")
        print(f"      PK={pk_str}")
        if n != expected:
            raise GateError(
                f"{t}: CSV row count={n:,} ≠ EXPECTED_COUNTS={expected:,}"
            )
        total += n
    print(f"  Σ filas CSV: {total:,} (esperado: {EXPECTED_TOTAL:,})")
    if total != EXPECTED_TOTAL:
        raise GateError(
            f"Suma CSV={total:,} ≠ EXPECTED_TOTAL={EXPECTED_TOTAL:,}"
        )

    print(f"\n[DRY-RUN] Validación INEGI — estrategia S6:")
    print(f"  NO hay bounds HIGH oficiales (PDFs INEGI inaccesibles).")
    print(f"  Bounds estructurales: counts exactos, 0 dupes PK, FK 0 huérfanos.")
    print(f"  INFO en Gate 4 pipeline: cobertura, overlap, decil, entidad, CDMX.")

    print(f"\n[DRY-RUN] FK-checks documentales planeados:")
    for t, checks in FK_CATALOG_CHECKS.items():
        for child_col, cat_table, desc in checks:
            print(f"  {t}.{child_col} → enigh.{cat_table}.clave  ({desc})")
    print(f"\n[DRY-RUN] FK diagnóstico RUNTIME (cols ambiguas):")
    for t, (col, cands) in AMBIGUOUS_FKS.items():
        cands_str = " vs ".join(f"{c}({d})" for c, d in cands)
        print(f"  {t}.{col} → {cands_str}")

    print(f"\n[DRY-RUN] FK naturales planeados:")
    for t, fks in FK_NATURAL_CHECKS.items():
        for parent, keys in fks:
            print(f"  {t} ({','.join(keys)}) → {parent}")
    print(f"  noagroimportes ↔ noagro (4-tuple débil, threshold "
          f"{NOAGROIMPORTES_ORPHAN_THRESHOLD_PCT}%)")

    print(f"\n[DRY-RUN] Cross-validations Gate 4 (pipeline, INFO):")
    print(f"  [1-3] Cobertura hogares-con-agro, hogares-con-noagro, overlap.")
    print(f"  [4]   Distribución por decil (concentradohogar.decil S3).")
    print(f"  [5]   Top 5 entidades federativas por agro/noagro.")
    print(f"  [6]   CDMX check explícito (esperado ≈0 en agro).")
    print(f"  [7]   Σ ventas agregado agro + noagro (trimestral expandido).")

    print(f"\n[DRY-RUN] Estimación timing (volumen modesto S6 vs S5):")
    print(f"  Total 366K filas vs S5 5.77M — ~6% del volumen.")
    print(f"  Local estimado:  5-15s por DB.")
    print(f"  Neon estimado:   15-40s por DB (latencia round-trip).")
    print(f"  HALT a {TIMING_HALT_SECONDS}s/tabla deja margen amplio.")

    print(f"\n[DRY-RUN] ✓ Gate 1 OK — listo para Gate 2 (--db local)")


# ---------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------


async def main_async(args: argparse.Namespace) -> int:
    try:
        if args.dry_run or args.db is None:
            gate_dry_run(only=args.only)
            return 0

        if args.db in ("local", "both"):
            await gate_load_and_verify(LOCAL_DSN, "LOCAL", only=args.only,
                                       skip_load=args.skip_load,
                                       run_gate4=args.run_gate4)
        if args.db in ("neon", "both"):
            await gate_load_and_verify(NEON_DSN, "NEON", only=args.only,
                                       skip_load=args.skip_load,
                                       run_gate4=args.run_gate4)
        if args.db == "both":
            await gate_compare_md5(only=args.only)
    except GateError as e:
        print(f"\n[HALT] {e}")
        return 1
    return 0


def main() -> int:
    p = argparse.ArgumentParser(
        description="Ingesta ENIGH 2024 NS — dominio negocios (S6, "
                    "última sesión de ingesta)"
    )
    p.add_argument("--db", choices=["local", "neon", "both"], default=None,
                   help="Si se omite, ejecuta dry-run sin tocar DB")
    p.add_argument("--dry-run", action="store_true",
                   help="Forzar dry-run (no DB) aún si --db está set")
    p.add_argument("--only", choices=TABLES, default=None,
                   help="Carga solo una tabla")
    p.add_argument("--skip-load", action="store_true",
                   help="Salta TRUNCATE+COPY, solo validación")
    p.add_argument("--run-gate4", action="store_true",
                   help="Ejecuta cross-validations Gate 4 al final (solo "
                        "útil con todas las tablas cargadas)")
    args = p.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
