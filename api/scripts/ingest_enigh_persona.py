#!/usr/bin/env python3
"""
Ingesta de las 4 tablas dominio PERSONA de ENIGH 2024 NS al schema ``enigh``.

Tablas (orden jerárquico por FK documental):

    1. poblacion       (185 cols, 308 598 filas)  PK (folioviv, foliohog, numren)
    2. trabajos        ( 60 cols, 164 325 filas)  PK (folioviv, foliohog, numren, id_trabajo)
    3. ingresos        ( 21 cols, 391 563 filas)  PK (folioviv, foliohog, numren, clave)
    4. ingresos_jcf    ( 18 cols,     327 filas)  PK (folioviv, foliohog, numren, clave)

Total: 864 813 filas.

Ejecución (S4 del pipeline observatorio multi-dataset):

    --dry-run       (DEFAULT en falta de --db) parsea DDL + headers, no DB
    --db local      solo DB local Docker
    --db neon       solo Neon-pooler
    --db both       local → validación → neon → validación → comparativa MD5
    --only <tabla>  carga solo una tabla
                    (poblacion|trabajos|ingresos|ingresos_jcf)

Idempotente: TRUNCATE pre-load, transacción atómica.

Null handling
-------------
Tokens raw del CSV → None tras ``.strip()``:

    "", " ", "NA", "-"  → NULL

``"&"`` literal se preserva (código INEGI legítimo en columnas de
ingreso/finan_*; verificar en samples si aparece). No se observó "&"
en exploración inicial de poblacion/trabajos/ingresos/ingresos_jcf,
pero el código lo maneja correctamente como VARCHAR.

Tipado por columna se extrae de migration 007 DDL:

    VARCHAR(n)            → str
    SMALLINT, INTEGER     → int
    NUMERIC(p, s)         → Decimal

Streaming: ``csv.reader`` iterativo + generator → ``copy_records_to_table``.
No carga CSVs completos en memoria.

Determinismo cross-DB
---------------------
``statement_cache_size=0`` para Neon (pgbouncer); local conn pool normal.
``ssl='require'`` añadido por asyncpg cuando DSN contiene ``neon.tech``.
MD5 byte-exact local ≡ Neon es el único criterio aceptable de paridad.

Criterio FK documental para ingresos_jcf
----------------------------------------
Investigación pre-ingesta (2026-04-22) sobre el CSV
``conjunto_de_datos_ingresos_jcf_enigh2024_ns.csv``:

    - 327 filas, todas con ``clave='P108'`` (Programa Jóvenes
      Construyendo el Futuro, según ``catalogos/ingresos_cat.csv``)
    - ``numren`` VARÍA: 01-10 (no es siempre '01').
      Distribución: 03=121, 02=82, 04=51, 01=38, 05=23, 06=7,
      07-10=1 c/u. Los beneficiarios pueden ser cualquier
      integrante del hogar, no solo el jefe.
    - (folioviv, foliohog, numren) único: 327 tuplas distintas / 327 filas.
    - Conclusión: ``ingresos_jcf`` es person-level. La FK documental es
      ``ingresos_jcf (folioviv, foliohog, numren) → poblacion
      (folioviv, foliohog, numren)``, NO al nivel hogar.

Validación contra INEGI (cifras oficiales con trazabilidad)
-----------------------------------------------------------

Fuente A — Presentación oficial "ENIGH 2024 (JULIO 2025)", INEGI.
  https://www.inegi.org.mx/contenidos/programas/enigh/nc/2024/doc/enigh2024_ns_presentacion_resultados.pdf
  Consultado 2026-04-22.

  Slide 5 ("Promedio de personas por hogar según características de
  los hogares y sus integrantes"):
    - Tamaño del hogar 2024:                3.35 personas/hogar
    - Integrantes 15-64 años / hogar:       2.26
    - Integrantes 65 y más años / hogar:    0.35
    - Integrantes ocupados / hogar:         1.63
    - Integrantes <15 años / hogar:         0.75
    - Integrantes 15+ econ. activos / hogar: 1.68
    - Perceptores de ingreso / hogar:       2.20

  CAVEAT METODOLÓGICO (slide 5, nota 1/):
    "Excluye a las personas trabajadoras del hogar, a sus familiares
    y a las y los huéspedes."
  Implicación operativa: SUM(factor) en ``enigh.poblacion`` los
  INCLUYE; por ello el bound asimétrico hacia arriba absorbe ~1-2%
  de margen positivo esperado.

  Slide 17 ("Total de personas perceptoras de ingreso y su ingreso
  monetario promedio trimestral, según tipo de discapacidad"):
    - Personas perceptoras de ingreso 2024:  86 283 911
      (78 433 069 sin discap. + 7 850 842 con discap.)

Fuente B — Comunicado de Prensa 112/25, INEGI, 30 julio 2025.
  https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/enigh/ENIGH2024.pdf
  Consultado 2026-04-22.

  Páginas 1-4/6 — ingresos por sexo (perceptores):
    - Ingreso monetario mensual hombres:  12 016 pesos
    - Ingreso monetario mensual mujeres:   7 905 pesos
    - Brecha (hombres − mujeres):          4 111 pesos
    - Ratio mujer / hombre:                7905/12016 = 0.6579

Bounds de validación estadística — fuera => HALT
-------------------------------------------------

ALTA CONFIANZA (publicado directamente por INEGI):

  1. SUM(factor) en poblacion ∈ [128 600 000, 132 000 000]
     Derivado: 3.35 × 38 830 230 hogares expandidos = 130.08M.
     Bound asimétrico: ‑1% / +1.5% por caveat exclusión slide 5.
     Fuente A, slide 5.

  2. Personas perceptoras de ingreso ≈ 86 283 911 ± 1%
     ∈ [85 421 072, 87 146 750]
     Operacionalización: SUM(factor) en poblacion para personas que
     aparecen al menos una vez en ``enigh.ingresos``.
     Fuente A, slide 17.

  3. Brecha sexo ingresos: ratio mujer/hombre ≈ 0.6579 ± 2pp
     ∈ [0.638, 0.678]
     Operacionalización: SUM(factor*ing_tri) WHERE sexo='2' /
                          SUM(factor*ing_tri) WHERE sexo='1'
     en JOIN ingresos × poblacion (sexo viene de poblacion).
     Sexo INEGI: 1=hombre, 2=mujer (catalogo cat_sexos).
     Fuente B, pp. 1-4.

CONFIANZA MEDIA (derivación matemática de cifras oficiales):

  4. Personas 15+ años / 38 830 230 ≈ 2.61 ± 2%
     Derivación: 2.26 (15-64) + 0.35 (65+) = 2.61. NO publicado
     directamente como total; el plan original citaba 98.6M (ENOE
     o Censo, no ENIGH). La derivación correcta da 101.3M.
     Fuente A, slide 5.

  5. Ocupadas / 38 830 230 ≈ 1.63 ± 2%
     Operacionalización: SUM(factor) WHERE trabajo_mp='1' en
     poblacion / 38 830 230. Caveat: nuestro SUM() incluye
     trabajadoras del hogar/huéspedes que la cifra oficial excluye;
     posible sesgo positivo pequeño.
     Fuente A, slide 5.

INFORMACIONAL (reportar valor, NO gate de fallo):

  6. Distribución por sexo (% hombres / % mujeres). NO publicado en
     fuentes A o B. Reportar para seguimiento.
  7. Edad promedio ponderada por factor. NO publicado en fuentes
     A o B. Reportar para seguimiento.

Lección S3 aplicada
-------------------
Bounds asimétricos solo cuando hay evidencia empírica documentada
(caveat exclusión slide 5). Si una validación HIGH/MEDIUM no matchea,
HALT con evidencia — NO relajar bounds silenciosamente. La opción
simétrica por defecto se rechaza si los datos sugieren tail bias.

Si se descubre divergencia metodológica vs INEGI mid-load (como
NTILE en S3), abortar y reabrir antes de continuar a Neon.

Uso
---
    /Users/davicho/datos-itam/api/.venv/bin/python \\
        /Users/davicho/datos-itam/api/scripts/ingest_enigh_persona.py \\
        --dry-run

Requiere asyncpg (dep del proyecto).
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import re
import sys
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


# Orden estricto de carga (FK jerárquico)
TABLES: List[str] = ["poblacion", "trabajos", "ingresos", "ingresos_jcf"]

EXPECTED_COUNTS: Dict[str, int] = {
    "poblacion":    308_598,
    "trabajos":     164_325,
    "ingresos":     391_563,
    "ingresos_jcf":     327,
}

# Hogares expandidos nacional (bounded en S3, MD5 verified local≡Neon).
# Si en ejecución difiere, usar el valor empírico — esta constante es solo
# para derivar bounds en docstring y compute esperado per-hogar.
HOGARES_EXPANDIDOS_S3 = 38_830_230  # SUM(factor) en hogares post-S3

# ---------------------------------------------------------------------
# Bounds de validación INEGI — fuera => HALT
# Trazabilidad: ver docstring "Validación contra INEGI"
# ---------------------------------------------------------------------

# 1. ALTA — SUM(factor) en poblacion (derivado 3.35 × 38.83M = 130.08M)
#    Asimétrico: -1% / +1.5% por caveat exclusión slide 5.
BOUNDS_SUM_FACTOR_MIN = 128_600_000
BOUNDS_SUM_FACTOR_MAX = 132_000_000

# 2. ALTA — Personas perceptoras de ingreso (slide 17: 86 283 911) ± 1%
BOUNDS_PERCEPTORES_MIN = 85_421_072
BOUNDS_PERCEPTORES_MAX = 87_146_750

# 3. ALTA — Brecha sexo ratio mujer/hombre (comunicado 112/25): 0.6579 ± 2pp
BOUNDS_RATIO_MUJER_HOMBRE_MIN = Decimal("0.638")
BOUNDS_RATIO_MUJER_HOMBRE_MAX = Decimal("0.678")

# 4. MEDIA — Personas 15+ / 38.83M ≈ 2.61 ± 2% (derivado de slide 5)
BOUNDS_PERSONAS_15MAS_PER_HOG_MIN = Decimal("2.5578")
BOUNDS_PERSONAS_15MAS_PER_HOG_MAX = Decimal("2.6622")

# 5. MEDIA — Ocupadas / 38.83M ≈ 1.63 ± 2% (slide 5; oper: trabajo_mp='1')
BOUNDS_OCUPADAS_PER_HOG_MIN = Decimal("1.5974")
BOUNDS_OCUPADAS_PER_HOG_MAX = Decimal("1.6626")


# Null markers (post-strip). Strip() ya colapsa " " a "" pero se incluye
# explícitamente para documentar contrato.
NULL_TOKENS = frozenset(("", " ", "NA", "-"))


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
    migration 007. Omite BIGSERIAL surrogate keys (defensive)."""
    txt = MIGRATION_007.read_text(encoding="utf-8")
    m = re.search(rf"^CREATE TABLE enigh\.{re.escape(table)} \(\s*$", txt, re.MULTILINE)
    if not m:
        raise RuntimeError(f"CREATE TABLE enigh.{table} no encontrado en migration 007")
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
        next(reader)  # header
        for _ in reader:
            n += 1
    return n


def stream_records(table: str, cols: List[Column]) -> Iterable[Tuple[Any, ...]]:
    """Generator: yields tuples listos para copy_records_to_table."""
    path = csv_path(table)
    casters = [c.caster for c in cols]
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        for row in reader:
            if len(row) != len(casters):
                raise RuntimeError(
                    f"{table}: fila con {len(row)} campos, esperaba {len(casters)}"
                )
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
    conn: asyncpg.Connection, table: str, cols: List[Column]
) -> int:
    """TRUNCATE + COPY. Retorna # filas insertadas (verificado con COUNT)."""
    col_names = tuple(c.name for c in cols)
    async with conn.transaction():
        await conn.execute(f"TRUNCATE TABLE enigh.{table}")
        records = list(stream_records(table, cols))
        await conn.copy_records_to_table(
            table, schema_name="enigh",
            columns=col_names,
            records=records,
        )
    actual = await conn.fetchval(f"SELECT COUNT(*) FROM enigh.{table}")
    return actual


async def orphan_check(conn: asyncpg.Connection, child: str, parent: str,
                        keys: Sequence[str]) -> int:
    """Conteo de filas en ``child`` sin match en ``parent`` por ``keys``."""
    using = ", ".join(keys)
    null_cond = " AND ".join(f"p.{k} IS NULL" for k in keys)
    q = (
        f"SELECT COUNT(*) FROM enigh.{child} c "
        f"LEFT JOIN enigh.{parent} p USING ({using}) "
        f"WHERE {null_cond}"
    )
    return await conn.fetchval(q)


# Columnas semánticamente ricas para inspección visual (Gate 2/3).
SAMPLE_COLUMNS: Dict[str, Tuple[str, ...]] = {
    "poblacion":    ("folioviv", "foliohog", "numren", "parentesco",
                     "sexo", "edad", "factor"),
    "trabajos":     ("folioviv", "foliohog", "numren", "id_trabajo",
                     "subor", "indep", "pago"),
    "ingresos":     ("folioviv", "foliohog", "numren", "clave",
                     "ing_tri", "factor"),
    "ingresos_jcf": ("folioviv", "foliohog", "numren", "clave",
                     "ing_tri", "ct_futuro"),
}


async def sample_rows(conn: asyncpg.Connection, table: str, n: int = 5) -> List[Dict]:
    cols = ", ".join(SAMPLE_COLUMNS[table])
    rows = await conn.fetch(
        f"SELECT {cols} FROM enigh.{table} ORDER BY random() LIMIT $1", n
    )
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------
# Validación INEGI (Gate 2 / Gate 3 — local y Neon)
# ---------------------------------------------------------------------


async def population_stats(conn: asyncpg.Connection) -> Dict[str, Any]:
    """Métricas clave en enigh.poblacion para validaciones HIGH+MEDIUM
    + INFO."""
    row = await conn.fetchrow(
        "SELECT "
        "  COUNT(*)::bigint AS n_filas, "
        "  SUM(factor)::bigint AS sum_factor, "
        "  SUM(CASE WHEN edad >= 15 THEN factor ELSE 0 END)::bigint "
        "    AS sum_factor_15mas, "
        "  SUM(CASE WHEN trabajo_mp = '1' THEN factor ELSE 0 END)::bigint "
        "    AS sum_factor_ocupadas, "
        "  SUM(CASE WHEN sexo = '1' THEN factor ELSE 0 END)::bigint "
        "    AS sum_factor_hombres, "
        "  SUM(CASE WHEN sexo = '2' THEN factor ELSE 0 END)::bigint "
        "    AS sum_factor_mujeres, "
        "  (SUM(edad::numeric * factor) / NULLIF(SUM(factor), 0))"
        "    ::numeric(20,4) AS edad_mean_weighted "
        "FROM enigh.poblacion"
    )
    return dict(row)


async def perceptores_count(conn: asyncpg.Connection) -> int:
    """SUM(factor) en poblacion para personas que aparecen ≥1 vez en
    ingresos. Operacionalización de "personas perceptoras de ingreso"
    según slide 17 INEGI (sumadas con discap+sin discap)."""
    return await conn.fetchval(
        "SELECT COALESCE(SUM(p.factor), 0)::bigint "
        "FROM enigh.poblacion p "
        "WHERE EXISTS ("
        "  SELECT 1 FROM enigh.ingresos i "
        "  WHERE i.folioviv = p.folioviv "
        "    AND i.foliohog = p.foliohog "
        "    AND i.numren  = p.numren"
        ")"
    )


async def sexo_income_ratio(conn: asyncpg.Connection) -> Dict[str, Any]:
    """Ratio mujer/hombre del ingreso promedio trimestral
    (perceptores). Validación bound HIGH §3.

    Fórmula: SUM(p.factor * i.ing_tri) GROUP BY p.sexo, dividir por
    SUM(p.factor) per-sexo de los perceptores únicos. Esto reproduce
    "ingreso monetario promedio trimestral" del slide 14 / comunicado
    112/25.
    """
    rows = await conn.fetch(
        "WITH perceptores AS ("
        "  SELECT DISTINCT i.folioviv, i.foliohog, i.numren "
        "  FROM enigh.ingresos i"
        "), "
        "perc_total AS ("
        "  SELECT p.sexo, p.folioviv, p.foliohog, p.numren, p.factor, "
        "         COALESCE(SUM(i.ing_tri), 0) AS ing_tri_total "
        "  FROM perceptores per "
        "  JOIN enigh.poblacion p USING (folioviv, foliohog, numren) "
        "  LEFT JOIN enigh.ingresos i USING (folioviv, foliohog, numren) "
        "  GROUP BY p.sexo, p.folioviv, p.foliohog, p.numren, p.factor"
        ") "
        "SELECT sexo, "
        "       (SUM(factor * ing_tri_total) / NULLIF(SUM(factor), 0))"
        "         ::numeric(20,2) AS ing_tri_promedio "
        "FROM perc_total "
        "WHERE sexo IN ('1', '2') "
        "GROUP BY sexo ORDER BY sexo"
    )
    return {r["sexo"]: r["ing_tri_promedio"] for r in rows}


async def gate_load_and_verify(dsn: str, label: str,
                               only: Optional[str] = None) -> None:
    """Gate 2 (LOCAL) / Gate 3 (NEON): carga 4 tablas, valida
    counts + FKs + estadísticas INEGI."""
    print(f"\n{'=' * 60}\n[{label}] Ingesta persona ENIGH 2024 NS\n{'=' * 60}")

    tables_to_load = [only] if only else TABLES

    # Validar headers ANTES de abrir DB
    for t in tables_to_load:
        cols = parse_ddl_columns(t)
        validate_header_matches_ddl(t, cols)
        print(f"[{label}] {t}: header CSV matchea DDL ({len(cols)} cols)")

    conn = await connect(dsn)
    try:
        # Carga secuencial (jerárquica por FK documental)
        for t in tables_to_load:
            cols = parse_ddl_columns(t)
            n = await truncate_and_load(conn, t, cols)
            expected = EXPECTED_COUNTS[t]
            if n != expected:
                raise GateError(
                    f"{label}: enigh.{t} cargó {n:,} filas, "
                    f"esperaba {expected:,} (CSV row count) — HALT"
                )
            print(f"[{label}] ✓ enigh.{t}: {n:,} filas (= esperado)")

        # FK-checks documentales (solo si parent existe poblado)
        if "poblacion" in tables_to_load:
            n_orphans = await orphan_check(
                conn, "poblacion", "hogares", ["folioviv", "foliohog"]
            )
            if n_orphans:
                raise GateError(
                    f"{label}: enigh.poblacion tiene {n_orphans:,} "
                    f"(folioviv,foliohog) huérfanos vs hogares — HALT"
                )
            print(f"[{label}] ✓ FK poblacion→hogares: 0 huérfanos")

        for child in ("trabajos", "ingresos", "ingresos_jcf"):
            if child not in tables_to_load:
                continue
            n_orphans = await orphan_check(
                conn, child, "poblacion", ["folioviv", "foliohog", "numren"]
            )
            if n_orphans:
                raise GateError(
                    f"{label}: enigh.{child} tiene {n_orphans:,} "
                    f"(folioviv,foliohog,numren) huérfanos vs poblacion — HALT"
                )
            print(f"[{label}] ✓ FK {child}→poblacion: 0 huérfanos")

        # Sample 5 filas por tabla cargada
        print(f"\n[{label}] Sample aleatorio 5 filas por tabla:")
        for t in tables_to_load:
            samples = await sample_rows(conn, t, 5)
            cols = SAMPLE_COLUMNS[t]
            print(f"  enigh.{t}  columnas: {cols}")
            for s in samples:
                vals = tuple(s[c] for c in cols)
                print(f"    {vals}")

        # Validación estadística INEGI (solo cuando poblacion está cargada;
        # bound 2/3 requieren además ingresos)
        if "poblacion" in tables_to_load:
            await _validate_inegi_bounds(conn, label, tables_to_load)
    finally:
        await conn.close()


async def _validate_inegi_bounds(conn: asyncpg.Connection, label: str,
                                  tables_loaded: Sequence[str]) -> None:
    """Aplica bounds documentados en docstring vs cifras reales."""
    print(f"\n[{label}] Validación INEGI:")
    st = await population_stats(conn)
    sf = st["sum_factor"]
    sf15 = st["sum_factor_15mas"]
    sfocc = st["sum_factor_ocupadas"]
    sfh = st["sum_factor_hombres"]
    sfm = st["sum_factor_mujeres"]
    edad_mean = st["edad_mean_weighted"]

    print(f"  poblacion n filas:                   {st['n_filas']:,}")
    print(f"  SUM(factor) total:                   {sf:,}")
    print(f"  SUM(factor) edad>=15:                {sf15:,}")
    print(f"  SUM(factor) trabajo_mp='1' (ocup):   {sfocc:,}")

    # ===== Bound 1 (HIGH) =====
    if not (BOUNDS_SUM_FACTOR_MIN <= sf <= BOUNDS_SUM_FACTOR_MAX):
        raise GateError(
            f"{label}: SUM(factor) poblacion={sf:,} fuera de "
            f"[{BOUNDS_SUM_FACTOR_MIN:,}, {BOUNDS_SUM_FACTOR_MAX:,}] "
            f"(derivado 3.35×38.83M, slide 5 INEGI) — HALT"
        )
    tam_hog = Decimal(sf) / Decimal(HOGARES_EXPANDIDOS_S3)
    print(f"  ✓ SUM(factor)={sf:,} ⇒ tam_hog≈{tam_hog:.4f} "
          f"(oficial 3.35, banda -1%/+1.5%)")

    # ===== Bound 4 (MEDIUM) — 15+ por hogar =====
    pers15_per_hog = Decimal(sf15) / Decimal(HOGARES_EXPANDIDOS_S3)
    if not (BOUNDS_PERSONAS_15MAS_PER_HOG_MIN <= pers15_per_hog
            <= BOUNDS_PERSONAS_15MAS_PER_HOG_MAX):
        raise GateError(
            f"{label}: 15+ por hogar={pers15_per_hog:.4f} fuera de "
            f"[{BOUNDS_PERSONAS_15MAS_PER_HOG_MIN}, "
            f"{BOUNDS_PERSONAS_15MAS_PER_HOG_MAX}] "
            f"(derivado 2.26+0.35=2.61, slide 5) — HALT"
        )
    print(f"  ✓ 15+/hogar={pers15_per_hog:.4f} (oficial-derivado 2.61, ±2%)")

    # ===== Bound 5 (MEDIUM) — ocupadas/hogar =====
    occ_per_hog = Decimal(sfocc) / Decimal(HOGARES_EXPANDIDOS_S3)
    if not (BOUNDS_OCUPADAS_PER_HOG_MIN <= occ_per_hog
            <= BOUNDS_OCUPADAS_PER_HOG_MAX):
        raise GateError(
            f"{label}: ocupadas/hogar={occ_per_hog:.4f} fuera de "
            f"[{BOUNDS_OCUPADAS_PER_HOG_MIN}, "
            f"{BOUNDS_OCUPADAS_PER_HOG_MAX}] "
            f"(slide 5: 1.63 ±2%; CAVEAT: nuestro SUM incluye huéspedes "
            f"que oficial excluye) — HALT"
        )
    print(f"  ✓ ocupadas/hogar={occ_per_hog:.4f} (oficial 1.63, ±2%)")

    # ===== Bound 2 (HIGH) — Perceptores; requiere ingresos cargado =====
    if "ingresos" in tables_loaded:
        n_perc = await perceptores_count(conn)
        print(f"  perceptoras de ingreso (SUM factor): {n_perc:,}")
        if not (BOUNDS_PERCEPTORES_MIN <= n_perc <= BOUNDS_PERCEPTORES_MAX):
            raise GateError(
                f"{label}: perceptoras={n_perc:,} fuera de "
                f"[{BOUNDS_PERCEPTORES_MIN:,}, {BOUNDS_PERCEPTORES_MAX:,}] "
                f"(slide 17 INEGI: 86 283 911 ±1%) — HALT"
            )
        print(f"  ✓ perceptoras={n_perc:,} (oficial 86 283 911, ±1%)")

        # ===== Bound 3 (HIGH) — ratio sexo perceptores =====
        ratios = await sexo_income_ratio(conn)
        ing_h = ratios.get("1")
        ing_m = ratios.get("2")
        if ing_h is None or ing_h == 0 or ing_m is None:
            raise GateError(
                f"{label}: no se pudo computar ratio sexo "
                f"(hombres={ing_h}, mujeres={ing_m}) — HALT"
            )
        ratio = (Decimal(ing_m) / Decimal(ing_h)).quantize(Decimal("0.0001"))
        print(f"  ing_tri promedio hombres (perc.):   {ing_h:,.2f}")
        print(f"  ing_tri promedio mujeres (perc.):   {ing_m:,.2f}")
        if not (BOUNDS_RATIO_MUJER_HOMBRE_MIN <= ratio
                <= BOUNDS_RATIO_MUJER_HOMBRE_MAX):
            raise GateError(
                f"{label}: ratio mujer/hombre={ratio} fuera de "
                f"[{BOUNDS_RATIO_MUJER_HOMBRE_MIN}, "
                f"{BOUNDS_RATIO_MUJER_HOMBRE_MAX}] "
                f"(comunicado 112/25: 0.6579 ±2pp) — HALT"
            )
        print(f"  ✓ ratio mujer/hombre={ratio} (oficial 0.6579, ±2pp)")

    # ===== INFO 6 — distribución sexo (no gate) =====
    if sf > 0:
        pct_h = Decimal(sfh) / Decimal(sf) * 100
        pct_m = Decimal(sfm) / Decimal(sf) * 100
    else:
        pct_h = pct_m = Decimal("0")
    print(f"  [INFO] sexo distribución: H={pct_h:.2f}% M={pct_m:.2f}% "
          f"(no publicado — solo seguimiento)")

    # ===== INFO 7 — edad promedio ponderada (no gate) =====
    print(f"  [INFO] edad promedio ponderada por factor: {edad_mean} "
          f"años (no publicado — solo seguimiento)")


# ---------------------------------------------------------------------
# MD5 digest (determinístico para cross-DB check)
# ---------------------------------------------------------------------


# Columnas usadas en MD5 cross-DB. PK + 2-3 columnas semánticas.
DIGEST_COLUMNS: Dict[str, Tuple[Tuple[str, ...], Tuple[str, ...]]] = {
    # tabla → (cols a digest, cols ORDER BY)
    "poblacion":    (("folioviv", "foliohog", "numren", "sexo", "edad", "factor"),
                     ("folioviv", "foliohog", "numren")),
    "trabajos":     (("folioviv", "foliohog", "numren", "id_trabajo",
                      "subor", "indep"),
                     ("folioviv", "foliohog", "numren", "id_trabajo")),
    "ingresos":     (("folioviv", "foliohog", "numren", "clave",
                      "ing_tri", "factor"),
                     ("folioviv", "foliohog", "numren", "clave")),
    "ingresos_jcf": (("folioviv", "foliohog", "numren", "clave", "ing_tri"),
                     ("folioviv", "foliohog", "numren", "clave")),
}


async def digest_table(conn: asyncpg.Connection, table: str) -> str:
    """MD5 sobre tuplas de columnas DIGEST_COLUMNS, ordenadas por PK."""
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
    """Gate 3 cierre: MD5 local vs Neon en las 4 tablas (o solo --only)."""
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
                "Probable divergencia en tipos, nulls, o orden."
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

    print(f"\n[DRY-RUN] DDL parse + header match + row count:")
    total = 0
    for t in tables:
        cols = parse_ddl_columns(t)
        validate_header_matches_ddl(t, cols)
        n = count_csv_data_rows(t)
        expected = EXPECTED_COUNTS[t]
        marker = "✓" if n == expected else "✗"
        print(f"  {marker} enigh.{t:14s} DDL cols={len(cols):3d}  "
              f"CSV rows={n:>7,}  expected={expected:>7,}")
        if n != expected:
            raise GateError(
                f"{t}: CSV row count={n:,} ≠ EXPECTED_COUNTS={expected:,}"
            )
        total += n
    print(f"  Σ filas CSV: {total:,} (plan v2 estimado: 864 813)")

    print(f"\n[DRY-RUN] Bounds documentados:")
    print(f"  HIGH 1 — SUM(factor) poblacion ∈ "
          f"[{BOUNDS_SUM_FACTOR_MIN:,}, {BOUNDS_SUM_FACTOR_MAX:,}] "
          f"(slide 5: 3.35×38.83M = 130.08M)")
    print(f"  HIGH 2 — Perceptoras ∈ "
          f"[{BOUNDS_PERCEPTORES_MIN:,}, {BOUNDS_PERCEPTORES_MAX:,}] "
          f"(slide 17: 86 283 911 ±1%)")
    print(f"  HIGH 3 — Ratio mujer/hombre ∈ "
          f"[{BOUNDS_RATIO_MUJER_HOMBRE_MIN}, "
          f"{BOUNDS_RATIO_MUJER_HOMBRE_MAX}] "
          f"(comunicado 112/25: 0.6579 ±2pp)")
    print(f"  MED  4 — 15+/hogar ∈ "
          f"[{BOUNDS_PERSONAS_15MAS_PER_HOG_MIN}, "
          f"{BOUNDS_PERSONAS_15MAS_PER_HOG_MAX}] "
          f"(derivación slide 5: 2.26+0.35=2.61 ±2%)")
    print(f"  MED  5 — Ocupadas/hogar ∈ "
          f"[{BOUNDS_OCUPADAS_PER_HOG_MIN}, "
          f"{BOUNDS_OCUPADAS_PER_HOG_MAX}] "
          f"(slide 5: 1.63 ±2%; caveat exclusión)")
    print(f"  INFO 6 — Distribución sexo (no gate)")
    print(f"  INFO 7 — Edad promedio ponderada (no gate)")
    print(f"\n[DRY-RUN] ✓ Gate 1 OK — listo para Gate 2 (--db local)")


# ---------------------------------------------------------------------
# Gate orchestration
# ---------------------------------------------------------------------


class GateError(Exception):
    """Raised when a gate fails — HALT."""


async def main_async(args: argparse.Namespace) -> int:
    try:
        if args.dry_run or args.db is None:
            gate_dry_run(only=args.only)
            return 0

        if args.db in ("local", "both"):
            await gate_load_and_verify(LOCAL_DSN, "LOCAL", only=args.only)
        if args.db in ("neon", "both"):
            await gate_load_and_verify(NEON_DSN, "NEON", only=args.only)
        if args.db == "both":
            await gate_compare_md5(only=args.only)
    except GateError as e:
        print(f"\n[HALT] {e}")
        return 1
    return 0


def main() -> int:
    p = argparse.ArgumentParser(
        description="Ingesta ENIGH 2024 NS — dominio persona (S4)"
    )
    p.add_argument("--db", choices=["local", "neon", "both"], default=None,
                   help="Si se omite, ejecuta dry-run sin tocar DB")
    p.add_argument("--dry-run", action="store_true",
                   help="Forzar dry-run (no DB) aún si --db está set")
    p.add_argument("--only", choices=TABLES, default=None,
                   help="Carga solo una tabla")
    args = p.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
