#!/usr/bin/env python3
"""
Ingesta de las 4 tablas dominio GASTOS de ENIGH 2024 NS al schema ``enigh``.

Sesión S5 del pipeline observatorio multi-dataset (la más pesada en volumen).

Tablas (orden estricto: la bestia primero, si rompe paramos sin tocar las
otras 3):

    1. gastoshogar    (31 data cols, 5 311 497 filas)  PK BIGSERIAL id
                       INDEX nk (folioviv, foliohog, clave)
    2. gastospersona  (23 data cols,   377 073 filas)  PK BIGSERIAL id
                       INDEX nk (folioviv, foliohog, numren, clave)
    3. gastotarjetas  ( 6 data cols,    19 464 filas)  PK natural
                       (folioviv, foliohog, clave)
    4. erogaciones    (16 data cols,    69 162 filas)  PK natural
                       (folioviv, foliohog, clave)

Total: 5 777 196 filas.

Streaming
---------
Generator directo a ``copy_records_to_table`` SIN materializar lista en
memoria. Para gastoshogar (5.3 M × 31 cols) la materialización ocuparía
~1-2 GB RAM, innecesario. Patrón heredado del template S4 pero el
``list(stream_records())`` se reemplaza por generator puro.

Progreso: log cada 1 000 000 filas durante la carga (5 logs esperados
en gastoshogar). Si el ritmo desacelera progresivamente, indica
contra-presión I/O o problema en el COPY.

Ejecución
---------

    --dry-run       (DEFAULT en falta de --db) parsea DDL + headers, no DB
    --db local      solo DB local Docker
    --db neon       solo Neon-pooler
    --db both       local → validación → neon → validación → MD5 compare
    --only <tabla>  carga solo una tabla
                    (gastoshogar|gastospersona|gastotarjetas|erogaciones)

Idempotente: TRUNCATE ... RESTART IDENTITY pre-load + transacción atómica.
RESTART IDENTITY garantiza que ``gastoshogar.id`` y ``gastospersona.id``
arrancan en 1 cada corrida → max(id) == count(*) (sin gaps de seq).

Null handling
-------------
Tokens raw del CSV → None tras ``.strip()``:

    "", " ", "NA", "-"  → NULL

``"&"`` literal se preserva (código INEGI legítimo). Confirmado en S4
que aparece en columnas categóricas; tratado como VARCHAR.

Tipado por columna se extrae de migration 007 DDL:

    VARCHAR(n)            → str
    SMALLINT, INTEGER     → int
    NUMERIC(p, s)         → Decimal
    BIGSERIAL             → IGNORADO en COPY (Postgres lo genera)

PKs y surrogate
---------------
* gastoshogar / gastospersona: surrogate ``id BIGSERIAL`` decidido en
  S2 por colisiones empíricas en la tupla natural (836K dupes en
  gastoshogar). El COPY excluye ``id``; Postgres lo genera 1..N.
  Verificación post-load: min(id)=1, max(id)=count(*), sin gaps.

* gastotarjetas / erogaciones: PK natural ``(folioviv, foliohog,
  clave)``. Pre-validado 0 dupes en CSV (19 464 / 69 162 tuplas únicas).
  Si el COPY hace conflict, el script aborta vía la transacción.

Caveat de FK — formato mixto en gastoshogar.clave
--------------------------------------------------
``gastoshogar.clave`` tiene MIXTO 4-char (T901-T916, "Regalos de...")
y 6-char (códigos rubro NNNNNN). cat_gastos cubre AMBOS:

    enigh.cat_gastos: 1039 entries 6-char + 16 entries T9XX
    distribución empírica: 17 432 filas T9XX + 5 294 065 filas 6-char

FK directo gastoshogar.clave → cat_gastos.clave funciona 1:1, sin
padding ni transformación. Pero los bounds de distribución por rubro
DEBEN filtrar ``LENGTH(clave) = 6`` para no contaminar % alimentos
o % transporte con códigos T9XX.

cat_gastoscontarjeta tiene formato ``TBxx`` (no T9XX). En Gate 4,
diagnóstico FK gastotarjetas contra AMBOS catálogos antes de cargar.

Distinción semántica — gastoshogar vs concentradohogar.gasto_mon
----------------------------------------------------------------
HALLAZGO ARQUITECTÓNICO Gate 2 S5 (2026-04-21): los dos NO son equivalentes.

* ``gastoshogar``: tabla de **eventos individuales de gasto**
  (transacciones). Cada fila es una ocurrencia registrada por el hogar
  durante el periodo de referencia. Fuente para análisis granular de
  consumo (qué compran los hogares por decil, lugar de compra, forma
  de pago, etc.). Empíricamente representa **~93.8% del gasto monetario
  oficial INEGI**.

* ``concentradohogar.gasto_mon`` y rubros agregados (alimentos,
  transporte, educa_espa, vivienda, personales, limpieza, vesti_calz,
  salud, transf_gas): **agregados oficiales INEGI por hogar** con
  metodología propia que integra contribuciones de gastoshogar +
  gastospersona + correcciones. Reproducen las cifras oficiales del
  Comunicado 112/25 cuadro 2 **al peso** (verificado empíricamente
  S5 Gate 2). Fuente para comparación contra publicaciones oficiales.

Implicación operativa: validación de cifras oficiales se hace contra
``concentradohogar``; el análisis de eventos granulares (qué se compró,
dónde, cómo se pagó) se hace contra ``gastoshogar``. Documentado
también en api/docs/enigh-schema-plan-v2.md.

Validación contra INEGI (cifras oficiales con trazabilidad)
-----------------------------------------------------------

Fuente — Comunicado de Prensa 112/25, INEGI, 30 julio 2025, 6 páginas.
  https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/enigh/ENIGH2024.pdf
  Consultado 2026-04-21.

  Página 5/6, sección "II. GASTOS" + cuadro 2:
    - Gasto corriente total mensual / hogar:        20 436 pesos
        (= monetario 15 891 + no monetario 4 545)
    - Gasto corriente monetario mensual / hogar:    15 891 pesos
        (cuadro 2: suma exacta de los 9 rubros = 15 891)
    - Gasto corriente NO monetario mensual / hogar:  4 545 pesos
    - Composición por rubro (% del monetario, $/mes):
        Alimentos, bebidas y tabaco:    37.7 %  (5 994)  → col alimentos
        Transporte y comunicaciones:    19.5 %  (3 106)  → col transporte
        Educación y esparcimiento:       9.6 %  (1 531)  → col educa_espa
        Vivienda y servicios:            9.1 %  (1 449)  → col vivienda
        Cuidados personales:             7.8 %  (1 236)  → col personales
        Enseres / limpieza casa:         6.3 %  (1 005)  → col limpieza
        Vestido y calzado:               3.8 %    (610)  → col vesti_calz
        Salud:                           3.4 %    (535)  → col salud
        Transferencias y otros:          2.7 %    (425)  → col transf_gas

Conversión trimestral → mensual: dividir por 3 (cada hogar reporta
un trimestre de referencia; ``gasto_tri`` y rubros en concentradohogar
son TRIMESTRALES).

Bounds de validación estadística — fuera => HALT
-------------------------------------------------

ALTA CONFIANZA — concentradohogar (al-peso, ±0.5%/0.2pp):

  1.  Gasto monetario mensual / hogar = 15 891 ± 0.5%   ∈ [15 812, 15 970]
      Operacionalización:
        SUM(c.gasto_mon × h.factor) / SUM(h.factor) / 3
      Reproduce al peso (15 891.46 verificado Gate 2).

  2.  Alimentos, bebidas y tabaco mensual = 5 994 ± 0.2%
  3.  Transporte y comunicaciones mensual = 3 106 ± 0.2%
  4.  Educación y esparcimiento mensual   = 1 531 ± 0.2%
  5.  Vivienda y servicios mensual        = 1 449 ± 0.2%
  6.  Cuidados personales mensual         = 1 236 ± 0.2%
  7.  Enseres / limpieza casa mensual     = 1 005 ± 0.2%
  8.  Vestido y calzado mensual           =   610 ± 0.5%
  9.  Salud mensual                       =   535 ± 0.5%
  10. Transferencias y otros mensual      =   425 ± 0.5%

      Operacionalización (cada rubro):
        SUM(c.<col_rubro> × h.factor) / SUM(h.factor) / 3
      Bounds más amplios (±0.5%) en rubros chicos por mayor sensibilidad
      al redondeo del peso. Alim/transp/educ/vivi/pers/limp con ±0.2%
      por orden de magnitud que rinde reproducibilidad firme.

CONFIANZA MEDIA — gastoshogar.gas_nm_tri (no hay cifra al-peso oficial):

  11. Gasto NO monetario mensual / hogar ≈ 4 545 ± 5%   ∈ [4 318, 4 772]
      Operacionalización:
        SUM(g.gas_nm_tri × g.factor) / SUM(h.factor) / 3
      Banda más amplia: el 4 545 oficial viene de narrativa p.5/6
      (no cuadro desagregado); la operacionalización vía gas_nm_tri
      en gastoshogar es aproximación legítima pero no reproducción
      al peso esperada. Reportado empírico Gate 2 LOCAL: 4 680
      (delta +3.0%, dentro bound).

INFORMACIONAL (reportar valor, NO gate de fallo):

  12. gastoshogar contribución a gasto monetario INEGI:
        Σ(g.gasto_tri × g.factor) / Σ(c.gasto_mon × h.factor)
      Esperado ~93.8% empírico (los ~6.2% restantes vienen de
      gastospersona + correcciones que INEGI aplica en concentradohogar).
      Documenta la distinción gastoshogar (eventos) ↔ concentradohogar
      (agregado oficial).
  13. Breakdown gastoshogar 6-char (compras directas) vs T9XX (regalos):
        fracción del Σ(gasto_tri × factor) total.
  14. Gasto corriente TOTAL mensual ≈ 20 436 (= 15 891 + 4 545).

Lecciones acumuladas aplicadas
------------------------------
S3: bounds asimétricos solo con evidencia empírica documentada;
descubrir divergencia mid-load, no en auditoría final.
S4: documentar caveats preventivamente (LENGTH=6 filtro = caveat
preventivo aquí); cifras directas oficiales son los bounds más
diagnósticos.
S5 (esta): cuando una tabla es "ledger" (eventos) y existe una tabla
"summary" (agregados oficiales), validar contra la summary para gates
oficiales y reportar la contribución del ledger como INFO. La summary
ya integra correcciones metodológicas que el ledger no captura.

Si bound HIGH falla, HALT con evidencia. NO relajar silenciosamente.

HALT triggers (Gate 2 específicamente)
--------------------------------------
* Count final ≠ EXPECTED_COUNTS[table]
* Tiempo de carga > 300s (5 min) en cualquier DB
* RAM peak del proceso > 1 GB (síntoma de materialización no deseada)
* Surrogate id con gaps (max(id) ≠ count(*) post-RESTART IDENTITY)
* MD5 local ≠ Neon
* FK-check orphans ≠ 0 en hogares o cat_gastos

Uso
---
    /Users/davicho/datos-itam/api/.venv/bin/python \\
        /Users/davicho/datos-itam/api/scripts/ingest_enigh_gastos.py \\
        --dry-run

Requiere asyncpg (dep del proyecto).
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


# Orden estricto de carga (la bestia primero — si rompe, paramos sin
# tocar las 3 menores).
TABLES: List[str] = ["gastoshogar", "gastospersona", "gastotarjetas",
                     "erogaciones"]

EXPECTED_COUNTS: Dict[str, int] = {
    "gastoshogar":   5_311_497,
    "gastospersona":   377_073,
    "gastotarjetas":    19_464,
    "erogaciones":      69_162,
}

# Tablas con surrogate id BIGSERIAL (skip ``id`` en COPY, validar
# integridad post-load).
SURROGATE_PK_TABLES = frozenset({"gastoshogar", "gastospersona"})

# Hogares expandidos nacional (verificado S3, MD5 local≡Neon).
HOGARES_EXPANDIDOS_S3 = 38_830_230


# ---------------------------------------------------------------------
# Bounds INEGI (Comunicado 112/25, p.5/6 cuadro 2)
# Operacionalización vs concentradohogar (al-peso, S3) salvo nota.
# ---------------------------------------------------------------------

# Esperados oficiales (mensual / hogar, en pesos), col concentradohogar.
# Tolerancia por rubro: ±0.5% en rubros chicos (≤700 pesos), ±0.2% en
# rubros grandes (la sensibilidad al redondeo de peso es proporcional).
# 1.  HIGH — gasto monetario total       (col gasto_mon)
# 2.  HIGH — alimentos, bebidas, tabaco  (col alimentos)
# 3.  HIGH — transporte y comunicaciones (col transporte)
# 4.  HIGH — educación y esparcimiento   (col educa_espa)
# 5.  HIGH — vivienda y servicios        (col vivienda)
# 6.  HIGH — cuidados personales         (col personales)
# 7.  HIGH — enseres / limpieza casa     (col limpieza)
# 8.  HIGH — vestido y calzado           (col vesti_calz)
# 9.  HIGH — salud                       (col salud)
# 10. HIGH — transferencias y otros      (col transf_gas)
INEGI_RUBROS: List[Tuple[str, str, int, Decimal]] = [
    # (col_concentradohogar, nombre, valor_oficial_mensual, tol_rel)
    ("gasto_mon",  "gasto monetario total",         15_891, Decimal("0.005")),
    ("alimentos",  "alimentos, bebidas y tabaco",    5_994, Decimal("0.002")),
    ("transporte", "transporte y comunicaciones",    3_106, Decimal("0.002")),
    ("educa_espa", "educación y esparcimiento",      1_531, Decimal("0.002")),
    ("vivienda",   "vivienda y servicios",           1_449, Decimal("0.002")),
    ("personales", "cuidados personales",            1_236, Decimal("0.002")),
    ("limpieza",   "enseres / limpieza casa",        1_005, Decimal("0.002")),
    ("vesti_calz", "vestido y calzado",                610, Decimal("0.005")),
    ("salud",      "salud",                            535, Decimal("0.005")),
    ("transf_gas", "transferencias y otros",           425, Decimal("0.005")),
]

# 11. MED — gasto NO monetario mensual / hogar (= 4 545 ± 5%)
#     Operacionalización vía gastoshogar.gas_nm_tri (no hay col oficial
#     directa en concentradohogar). Banda amplia.
BOUNDS_GASTO_NOMONET_MENSUAL_MIN = Decimal("4318")
BOUNDS_GASTO_NOMONET_MENSUAL_MAX = Decimal("4772")

# 12. INFO — gastoshogar contribución a gasto monetario (esperado ~93.8%).
#     No HALT — solo reporta para documentar distinción semántica.


# Null markers (post-strip).
NULL_TOKENS = frozenset(("", " ", "NA", "-"))


# ---------------------------------------------------------------------
# HALT thresholds (Gate 2 / Gate 3 / Gate 4)
# ---------------------------------------------------------------------

# Tiempo HALT por tabla por DB. Estimación dry-run: gastoshogar
# ~60-180s/DB; las menores <30s.
TIMING_HALT_SECONDS = 300

# RAM peak HALT (proceso Python). 1 GB = bandera de materialización
# no deseada. El streaming generator debería mantener <300 MB.
RAM_HALT_MB = 1024

# Cada cuánto loggear progreso durante stream (rows). gastoshogar
# debería mostrar 5 logs (1M, 2M, 3M, 4M, 5M).
LOG_EVERY_N_ROWS = 1_000_000


# ---------------------------------------------------------------------
# DDL parsing — extrae columnas + tipos de migration 007
# ---------------------------------------------------------------------

COLUMN_RE = re.compile(
    r"^\s+(?P<name>[a-z_0-9]+)\s+"
    r"(?P<ddl>VARCHAR\(\d+\)|SMALLINT|INTEGER|NUMERIC\(\d+,\s*\d+\)|BIGSERIAL)"
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
    if ddl in ("SMALLINT", "INTEGER"):
        return _cast_int
    if ddl.startswith("NUMERIC"):
        return _cast_numeric
    raise ValueError(f"unhandled DDL type: {ddl}")


def parse_ddl_columns(table: str) -> List[Column]:
    """Extrae columnas de ``CREATE TABLE enigh.<table> (...)`` desde
    migration 007. Omite BIGSERIAL surrogate keys (Postgres los
    genera, no van en el COPY)."""
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
        if ddl == "BIGSERIAL":
            continue
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
    """Cuenta filas de datos (sin header) iterativamente — útil en dry-run."""
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

    Si ``label`` y ``progress_start`` son provistos, loggea progreso
    cada ``LOG_EVERY_N_ROWS`` filas con tasa observada (filas/s).
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
                print(f"  [{label}] {table}: {n:>9,} filas streamed  "
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
    """TRUNCATE RESTART IDENTITY + COPY streaming. Retorna (count, elapsed).

    Streaming generator: NO materializa la lista en memoria.
    """
    col_names = tuple(c.name for c in cols)
    start = time.monotonic()
    async with conn.transaction():
        await conn.execute(
            f"TRUNCATE TABLE enigh.{table} RESTART IDENTITY"
        )
        await conn.copy_records_to_table(
            table, schema_name="enigh",
            columns=col_names,
            records=stream_records(table, cols, label=label,
                                   progress_start=start),
        )
    elapsed = time.monotonic() - start
    actual = await conn.fetchval(f"SELECT COUNT(*) FROM enigh.{table}")
    return actual, elapsed


async def surrogate_id_check(
    conn: asyncpg.Connection, table: str, expected_count: int
) -> Tuple[int, int, int]:
    """Verifica que id BIGSERIAL es contiguo 1..N tras RESTART IDENTITY."""
    row = await conn.fetchrow(
        f"SELECT MIN(id) AS mn, MAX(id) AS mx, COUNT(*) AS cnt "
        f"FROM enigh.{table}"
    )
    mn, mx, cnt = row["mn"], row["mx"], row["cnt"]
    if cnt != expected_count:
        raise GateError(
            f"{table}: surrogate id COUNT={cnt:,} ≠ "
            f"expected={expected_count:,} — HALT"
        )
    if mn != 1:
        raise GateError(
            f"{table}: surrogate id MIN={mn} ≠ 1 (RESTART IDENTITY falló) — HALT"
        )
    if mx != expected_count:
        raise GateError(
            f"{table}: surrogate id MAX={mx} ≠ COUNT={cnt} "
            f"(gaps detectados) — HALT"
        )
    return mn, mx, cnt


# Catálogos por tabla (FK-checks documentales).
# (child_col, cat_table, descripción)
FK_CATALOG_CHECKS: Dict[str, List[Tuple[str, str, str]]] = {
    "gastoshogar": [
        ("clave",      "cat_gastos",     "código rubro (mixto 4-T9XX y 6-char)"),
        ("forma_pag1", "cat_forma_pag",  "forma de pago primaria"),
        ("forma_pag2", "cat_forma_pag",  "forma de pago secundaria"),
        ("forma_pag3", "cat_forma_pag",  "forma de pago terciaria"),
        ("lugar_comp", "cat_lugar_comp", "lugar de compra"),
    ],
    "gastospersona": [
        ("clave",      "cat_gastos",     "código rubro (todos 6-char)"),
        ("forma_pag1", "cat_forma_pag",  "forma de pago primaria"),
        ("forma_pag2", "cat_forma_pag",  "forma de pago secundaria"),
        ("forma_pag3", "cat_forma_pag",  "forma de pago terciaria"),
    ],
    "gastotarjetas": [
        # FK gastotarjetas.clave → ¿cat_gastos o cat_gastoscontarjeta?
        # Diagnóstico EXPLÍCITO en gate_load_and_verify antes de cargar.
    ],
    "erogaciones": [
        ("clave", "cat_gastos", "código rubro (todos 6-char)"),
    ],
}


async def orphan_check_catalog(
    conn: asyncpg.Connection, child_table: str, child_col: str,
    cat_table: str, cat_col: str = "clave",
) -> int:
    """Cuenta filas en child donde child_col no es NULL y no existe
    en cat_table.cat_col."""
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


# Columnas semánticamente ricas para inspección visual.
SAMPLE_COLUMNS: Dict[str, Tuple[str, ...]] = {
    "gastoshogar":   ("folioviv", "foliohog", "clave", "tipo_gasto",
                      "forma_pag1", "lugar_comp", "gasto_tri", "factor"),
    "gastospersona": ("folioviv", "foliohog", "numren", "clave",
                      "forma_pag1", "gasto_tri", "factor"),
    "gastotarjetas": ("folioviv", "foliohog", "clave", "gasto",
                      "pago_mp", "gasto_tri"),
    "erogaciones":   ("folioviv", "foliohog", "clave", "ero_1",
                      "ero_tri"),
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
# Diagnóstico FK gastotarjetas (Gate 4 pre-load)
# ---------------------------------------------------------------------


async def diagnose_gastotarjetas_fk(conn: asyncpg.Connection) -> Dict[str, Any]:
    """Lee distinct claves del CSV gastotarjetas, compara contra ambos
    catálogos posibles. Reporta match rate. HALT si ninguno cubre 100%.
    """
    path = csv_path("gastotarjetas")
    distinct_claves: set = set()
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            distinct_claves.add(row[2].strip())  # col 2 = clave
    distinct_claves.discard("")
    n_distinct = len(distinct_claves)
    keys_arr = sorted(distinct_claves)

    cat_gastos_match = await conn.fetchval(
        "SELECT COUNT(*) FROM enigh.cat_gastos "
        "WHERE clave = ANY($1::text[])",
        keys_arr,
    )
    cat_gctarjeta_match = await conn.fetchval(
        "SELECT COUNT(*) FROM enigh.cat_gastoscontarjeta "
        "WHERE clave = ANY($1::text[])",
        keys_arr,
    )
    return {
        "n_distinct_csv": n_distinct,
        "cat_gastos_match": cat_gastos_match,
        "cat_gastoscontarjeta_match": cat_gctarjeta_match,
        "sample_codes": keys_arr[:10],
    }


# ---------------------------------------------------------------------
# Validación INEGI bounds (Gate 2/3 — usa gastoshogar)
# ---------------------------------------------------------------------


async def concentradohogar_rubros_mensual(
    conn: asyncpg.Connection,
) -> Dict[str, Decimal]:
    """Mensual/hogar para los 10 conceptos: gasto_mon + 9 rubros del
    cuadro 2 INEGI. Operacionalización al-peso desde concentradohogar."""
    cols_sql = ", ".join(
        f"SUM(c.{col}::numeric * h.factor) AS sum_{col}"
        for col, _, _, _ in INEGI_RUBROS
    )
    row = await conn.fetchrow(
        f"SELECT SUM(h.factor)::bigint AS sum_factor, {cols_sql} "
        f"FROM enigh.concentradohogar c "
        f"JOIN enigh.hogares h USING (folioviv, foliohog)"
    )
    sum_factor = Decimal(row["sum_factor"])
    out: Dict[str, Decimal] = {}
    for col, _, _, _ in INEGI_RUBROS:
        s = row[f"sum_{col}"]
        if s is None:
            out[col] = Decimal(0)
        else:
            out[col] = (Decimal(s) / sum_factor / Decimal(3))
    out["__sum_factor"] = sum_factor
    return out


async def gastoshogar_metrics(conn: asyncpg.Connection) -> Dict[str, Any]:
    """Métricas en enigh.gastoshogar para INFO + bound MED no-monetario."""
    row = await conn.fetchrow(
        "SELECT "
        "  COUNT(*)::bigint AS n_filas, "
        "  SUM(gasto_tri * factor)::numeric    AS sum_monet_tri, "
        "  SUM(gas_nm_tri * factor)::numeric   AS sum_nomonet_tri, "
        "  (SUM(gasto_tri * factor) FILTER (WHERE LENGTH(clave)=6))::numeric "
        "    AS sum_6char, "
        "  (SUM(gasto_tri * factor) FILTER (WHERE LENGTH(clave)=4))::numeric "
        "    AS sum_4char_t9, "
        "  COUNT(*) FILTER (WHERE LENGTH(clave)=4)::bigint AS n_filas_t9 "
        "FROM enigh.gastoshogar"
    )
    return dict(row)


async def _validate_inegi_bounds(
    conn: asyncpg.Connection, label: str, tables_loaded: Sequence[str]
) -> None:
    """Bounds INEGI vs cifras reales.

    HIGH 1-10: concentradohogar (al-peso) — siempre validable porque
    concentradohogar se carga en S3.
    MED 11: gastoshogar.gas_nm_tri (solo si gastoshogar está cargada).
    INFO 12-14: contribuciones gastoshogar (solo si gastoshogar cargada).
    """
    print(f"\n[{label}] Validación INEGI:")

    # ===== HIGH 1-10 — concentradohogar al-peso =====
    rub = await concentradohogar_rubros_mensual(conn)
    print(f"  Σ factor (hogares expandidos): {rub['__sum_factor']:>13,}")
    print(f"  Validación HIGH (concentradohogar, al-peso):")
    for col, nombre, oficial, tol in INEGI_RUBROS:
        empirico = rub[col]
        oficial_d = Decimal(oficial)
        delta = (empirico - oficial_d) / oficial_d
        delta_pct = (delta * Decimal(100)).quantize(Decimal("0.001"))
        empirico_q = empirico.quantize(Decimal("0.01"))
        in_band = abs(delta) <= tol
        if not in_band:
            tol_pct = (tol * Decimal(100)).quantize(Decimal("0.01"))
            raise GateError(
                f"{label}: {nombre} mensual = {empirico_q} fuera de "
                f"{oficial} ±{tol_pct}% (Δ={delta_pct}%) "
                f"[col concentradohogar.{col}, comunicado 112/25 p.5/6 "
                f"cuadro 2] — HALT"
            )
        tol_pct = (tol * Decimal(100)).quantize(Decimal("0.01"))
        print(f"    ✓ {nombre:<32s} = {empirico_q:>10}  "
              f"(oficial {oficial:>5}, Δ={delta_pct:>6}%, "
              f"tol ±{tol_pct}%)")

    # ===== MED 11 — gastoshogar.gas_nm_tri (no monetario) =====
    if "gastoshogar" not in tables_loaded:
        # Si gastoshogar no está cargada ahora, se valida en otro gate.
        return

    m = await gastoshogar_metrics(conn)
    sum_monet = m["sum_monet_tri"] or Decimal(0)
    sum_nomonet = m["sum_nomonet_tri"] or Decimal(0)
    sum_6 = m["sum_6char"] or Decimal(0)
    sum_t9 = m["sum_4char_t9"] or Decimal(0)
    n_t9 = m["n_filas_t9"]

    hog = Decimal(HOGARES_EXPANDIDOS_S3)
    nomonet_mensual = (sum_nomonet / hog / Decimal(3)).quantize(Decimal("1"))
    monet_gh_mensual = (sum_monet / hog / Decimal(3)).quantize(Decimal("1"))

    print(f"\n  Validación MED (gastoshogar.gas_nm_tri):")
    if not (BOUNDS_GASTO_NOMONET_MENSUAL_MIN <= nomonet_mensual
            <= BOUNDS_GASTO_NOMONET_MENSUAL_MAX):
        raise GateError(
            f"{label}: gasto NO MONET mensual/hogar = {nomonet_mensual} "
            f"fuera de [{BOUNDS_GASTO_NOMONET_MENSUAL_MIN}, "
            f"{BOUNDS_GASTO_NOMONET_MENSUAL_MAX}] "
            f"(oficial 4 545 ±5%, comunicado 112/25 p.5/6) — HALT"
        )
    print(f"    ✓ gasto NO MONET mensual/hogar = {nomonet_mensual} "
          f"(oficial 4 545, ±5%)")

    # ===== INFO 12-14 =====
    print(f"\n  INFO (no gate):")
    contrib_pct = (Decimal(monet_gh_mensual) / Decimal("15891")
                   * Decimal(100)).quantize(Decimal("0.01"))
    print(f"    [INFO 12] gastoshogar.Σ(gasto_tri×factor) mensual/hogar = "
          f"{monet_gh_mensual} "
          f"({contrib_pct}% del monetario oficial 15 891)")
    total_4y6 = (sum_6 + sum_t9) or Decimal(1)
    pct_6 = (sum_6 / total_4y6 * Decimal(100)).quantize(Decimal("0.01"))
    pct_t9 = (sum_t9 / total_4y6 * Decimal(100)).quantize(Decimal("0.01"))
    print(f"    [INFO 13] gastoshogar 6-char (compras directas): "
          f"{pct_6}% ({sum_6:>13,.0f})")
    print(f"    [INFO 13] gastoshogar T9XX  (regalos):           "
          f"{pct_t9}% ({sum_t9:>13,.0f}, n_filas T9={n_t9:,})")
    total_corriente = Decimal(rub["gasto_mon"]) + Decimal(nomonet_mensual)
    total_corriente_q = total_corriente.quantize(Decimal("1"))
    print(f"    [INFO 14] gasto corriente TOTAL mensual ≈ "
          f"{total_corriente_q} (oficial 20 436)")


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
    skip_load: bool = False,
) -> None:
    """Carga + valida (Gate 2/3/4 según --only).

    skip_load=True salta el TRUNCATE+COPY (data ya en DB de corrida
    previa) pero corre todas las verificaciones: counts, FKs, surrogate,
    sample, bounds INEGI.
    """
    print(f"\n{'=' * 60}")
    mode = "VALIDACIÓN (skip-load)" if skip_load else "Ingesta gastos"
    print(f"[{label}] {mode} ENIGH 2024 NS")
    print(f"{'=' * 60}")

    tables_to_load = [only] if only else TABLES

    # Pre-validar headers ANTES de abrir DB
    for t in tables_to_load:
        cols = parse_ddl_columns(t)
        validate_header_matches_ddl(t, cols)
        marker = "id BIGSERIAL excluido" if t in SURROGATE_PK_TABLES else "PK natural"
        print(f"[{label}] {t}: header CSV matchea DDL "
              f"({len(cols)} cols data, {marker})")

    conn = await connect(dsn)
    try:
        for t in tables_to_load:
            cols = parse_ddl_columns(t)

            # Pre-load: diagnóstico FK gastotarjetas (clave → ?)
            if t == "gastotarjetas":
                diag = await diagnose_gastotarjetas_fk(conn)
                print(f"\n[{label}] gastotarjetas FK diagnóstico:")
                print(f"  distinct claves en CSV:           "
                      f"{diag['n_distinct_csv']}")
                print(f"  match en cat_gastos:              "
                      f"{diag['cat_gastos_match']}/{diag['n_distinct_csv']}")
                print(f"  match en cat_gastoscontarjeta:    "
                      f"{diag['cat_gastoscontarjeta_match']}/{diag['n_distinct_csv']}")
                print(f"  sample codes: {diag['sample_codes']}")
                cg = diag["cat_gastos_match"]
                ct = diag["cat_gastoscontarjeta_match"]
                nd = diag["n_distinct_csv"]
                if cg < nd and ct < nd:
                    raise GateError(
                        f"{label}: gastotarjetas.clave NO matchea 100% en "
                        f"ningún catálogo (cat_gastos={cg}/{nd}, "
                        f"cat_gastoscontarjeta={ct}/{nd}) — HALT"
                    )
                winner = ("cat_gastos" if cg == nd else
                          "cat_gastoscontarjeta")
                print(f"  → FK efectivo: gastotarjetas.clave → "
                      f"enigh.{winner}.clave (100% match)")

            expected = EXPECTED_COUNTS[t]

            # Carga (saltable con --skip-load)
            if skip_load:
                n = await conn.fetchval(f"SELECT COUNT(*) FROM enigh.{t}")
                if n != expected:
                    raise GateError(
                        f"{label}: --skip-load pero enigh.{t} tiene {n:,} "
                        f"filas (esperaba {expected:,}). Re-cargar primero."
                    )
                print(f"[{label}] ✓ enigh.{t}: {n:,} filas (skip-load, "
                      f"data preexistente)")
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
                        f"{RAM_HALT_MB} MB (síntoma de materialización) — HALT"
                    )
                print(f"[{label}] ✓ enigh.{t}: {n:,} filas en {elapsed:.1f}s "
                      f"(RAM peak: {ram_mb:.0f} MB)")

            # Surrogate id check (gastoshogar / gastospersona)
            if t in SURROGATE_PK_TABLES:
                mn, mx, cnt = await surrogate_id_check(conn, t, expected)
                print(f"[{label}] ✓ surrogate id contiguo: "
                      f"min={mn} max={mx:,} count={cnt:,}")

            # FK-checks documentales contra catálogos
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

            # FK natural: (folioviv, foliohog) → hogares (las 4)
            n_orph_hog = await orphan_check_natural(
                conn, t, "hogares", ["folioviv", "foliohog"]
            )
            if n_orph_hog:
                raise GateError(
                    f"{label}: enigh.{t} (folioviv,foliohog) huérfanos vs "
                    f"hogares = {n_orph_hog:,} — HALT"
                )
            print(f"[{label}] ✓ FK {t} (folioviv,foliohog) → hogares: "
                  f"0 huérfanos")

            # FK natural adicional: gastospersona (folioviv,foliohog,numren) → poblacion
            if t == "gastospersona":
                n_orph_pob = await orphan_check_natural(
                    conn, t, "poblacion",
                    ["folioviv", "foliohog", "numren"],
                )
                if n_orph_pob:
                    raise GateError(
                        f"{label}: enigh.gastospersona "
                        f"(folioviv,foliohog,numren) huérfanos vs poblacion = "
                        f"{n_orph_pob:,} — HALT"
                    )
                print(f"[{label}] ✓ FK gastospersona (folioviv,foliohog,numren) "
                      f"→ poblacion: 0 huérfanos")

            # Sample
            samples = await sample_rows(conn, t, 5)
            sample_cols = SAMPLE_COLUMNS[t]
            print(f"[{label}] sample 5 filas (cols: {sample_cols}):")
            for s in samples:
                print(f"    {tuple(s[c] for c in sample_cols)}")

        # Validación estadística INEGI
        await _validate_inegi_bounds(conn, label, tables_to_load)
    finally:
        await conn.close()


# ---------------------------------------------------------------------
# MD5 digest (determinístico cross-DB)
# ---------------------------------------------------------------------


# Por tabla → (cols a digest, cols ORDER BY con tiebreaker).
# Para tablas con duplicados naturales (gastoshogar/gastospersona), el
# ORDER BY incluye múltiples columnas ricas para tiebreaker. El surrogate
# ``id`` NO se usa en el digest porque sería distinto entre cargas.
DIGEST_COLUMNS: Dict[str, Tuple[Tuple[str, ...], Tuple[str, ...]]] = {
    "gastoshogar":   (
        ("folioviv", "foliohog", "clave", "mes_dia", "gasto",
         "gasto_tri", "factor"),
        ("folioviv", "foliohog", "clave", "mes_dia", "gasto",
         "gasto_tri", "factor"),
    ),
    "gastospersona": (
        ("folioviv", "foliohog", "numren", "clave", "mes_dia",
         "gasto", "gasto_tri", "factor"),
        ("folioviv", "foliohog", "numren", "clave", "mes_dia",
         "gasto", "gasto_tri", "factor"),
    ),
    "gastotarjetas": (
        ("folioviv", "foliohog", "clave", "gasto", "pago_mp", "gasto_tri"),
        ("folioviv", "foliohog", "clave"),
    ),
    "erogaciones":   (
        ("folioviv", "foliohog", "clave", "ero_tri"),
        ("folioviv", "foliohog", "clave"),
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
    """MD5 cross-DB (cierre de cada Gate cuando --db both)."""
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
    print(f"\n{'=' * 60}\n[DRY-RUN] Gate 1 — verificación pre-DB\n{'=' * 60}")
    tables = [only] if only else TABLES

    print(f"\n[DRY-RUN] Migration 007: {MIGRATION_007}")
    print(f"[DRY-RUN] Data root:      {DATA_ROOT}")
    print(f"[DRY-RUN] Null markers:   {sorted(NULL_TOKENS)!r}")
    print(f"[DRY-RUN] HALT thresholds: timing={TIMING_HALT_SECONDS}s/DB, "
          f"RAM={RAM_HALT_MB} MB peak")

    print(f"\n[DRY-RUN] DDL parse + header match + row count:")
    total = 0
    for t in tables:
        cols = parse_ddl_columns(t)
        validate_header_matches_ddl(t, cols)
        n = count_csv_data_rows(t)
        expected = EXPECTED_COUNTS[t]
        marker = "✓" if n == expected else "✗"
        pk = "id BIGSERIAL" if t in SURROGATE_PK_TABLES else "(folioviv,foliohog,clave)"
        print(f"  {marker} enigh.{t:14s} DDL cols={len(cols):3d}  "
              f"CSV rows={n:>9,}  expected={expected:>9,}  PK={pk}")
        if n != expected:
            raise GateError(
                f"{t}: CSV row count={n:,} ≠ EXPECTED_COUNTS={expected:,}"
            )
        total += n
    print(f"  Σ filas CSV: {total:,} (plan v2 estimado: 5 777 196)")

    print(f"\n[DRY-RUN] Bounds documentados (Comunicado 112/25 INEGI):")
    print(f"  HIGH 1-10 — concentradohogar al-peso (gasto_mon + 9 rubros):")
    for col, nombre, oficial, tol in INEGI_RUBROS:
        tol_pct = (tol * Decimal(100)).quantize(Decimal("0.01"))
        print(f"    {nombre:<32s} = {oficial:>5} ± {tol_pct}% "
              f"(col concentradohogar.{col})")
    print(f"  MED  11   — Gasto NO MONET mensual/hogar ∈ "
          f"[{BOUNDS_GASTO_NOMONET_MENSUAL_MIN}, "
          f"{BOUNDS_GASTO_NOMONET_MENSUAL_MAX}] "
          f"(oficial 4 545, ±5%; vía gastoshogar.gas_nm_tri)")
    print(f"  INFO 12   — gastoshogar contribución a monetario "
          f"(esperado ~93.8%)")
    print(f"  INFO 13   — Breakdown 6-char vs T9XX (regalos) en "
          f"gastoshogar")
    print(f"  INFO 14   — Gasto corriente TOTAL mensual ≈ 20 436 "
          f"(monet+no_monet)")

    print(f"\n[DRY-RUN] FK-checks planeados:")
    for t, checks in FK_CATALOG_CHECKS.items():
        for child_col, cat_table, desc in checks:
            print(f"  {t}.{child_col} → enigh.{cat_table}.clave  ({desc})")
    print(f"  gastotarjetas.clave → ?  (diagnóstico runtime: cat_gastos vs "
          f"cat_gastoscontarjeta)")
    print(f"  (folioviv,foliohog) → hogares  (las 4 tablas)")
    print(f"  gastospersona (folioviv,foliohog,numren) → poblacion")

    print(f"\n[DRY-RUN] Estimación timing gastoshogar (5.3M filas):")
    print(f"  Basado en S4 poblacion 308 598 filas, 184 cols, ~12s local.")
    print(f"  gastoshogar = 5.3M × 31 cols ≈ 6× volumen de bytes.")
    print(f"  Estimado: 60-180s local, 90-240s Neon (depende de latencia red).")
    print(f"  HALT a {TIMING_HALT_SECONDS}s deja margen confortable.")
    print(f"\n[DRY-RUN] ✓ Gate 1 OK — listo para Gate 2 (--db local --only "
          f"gastoshogar)")


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
                                       skip_load=args.skip_load)
        if args.db in ("neon", "both"):
            await gate_load_and_verify(NEON_DSN, "NEON", only=args.only,
                                       skip_load=args.skip_load)
        if args.db == "both":
            await gate_compare_md5(only=args.only)
    except GateError as e:
        print(f"\n[HALT] {e}")
        return 1
    return 0


def main() -> int:
    p = argparse.ArgumentParser(
        description="Ingesta ENIGH 2024 NS — dominio gastos (S5)"
    )
    p.add_argument("--db", choices=["local", "neon", "both"], default=None,
                   help="Si se omite, ejecuta dry-run sin tocar DB")
    p.add_argument("--dry-run", action="store_true",
                   help="Forzar dry-run (no DB) aún si --db está set")
    p.add_argument("--only", choices=TABLES, default=None,
                   help="Carga solo una tabla (gates por tabla)")
    p.add_argument("--skip-load", action="store_true",
                   help="Salta TRUNCATE+COPY (data ya en DB), corre solo "
                        "validación. Útil tras refactor de bounds.")
    args = p.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
