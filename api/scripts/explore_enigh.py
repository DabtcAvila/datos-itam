#!/usr/bin/env python3
"""
Explorador de la distribución oficial de ENIGH 2024 Nueva Serie (INEGI).

Lectura pura — no toca la base de datos ni mueve archivos. stdlib only.

Genera:
  - Reporte por stdout con progress por dataset.
  - Archivo markdown `api/docs/enigh-inventory.md` con inventario completo:
    tablas, columnas, tipos, nulos, cardinalidades + activos reutilizables
    de INEGI (catálogos, ER, metadatos).

Uso:
  /Users/davicho/datos-itam/api/.venv/bin/python \
      api/scripts/explore_enigh.py \
      --root /Users/davicho/datos-itam/data-sources/conjunto_de_datos_enigh2024_ns_csv \
      --out  api/docs/enigh-inventory.md

Decisiones:
  - Null tokens considerados: "", " ", "NA", "-"
  - Encoding probado en orden: UTF-8 → Latin-1 → CP1252 (primero que no falla)
  - Sep sniffeado por csv.Sniffer sobre primeros 16KB
  - Tipos inferidos en sample de hasta 1000 valores no-null por columna:
      INT si ≥95% parsean como int, NUMERIC si ≥95% como float, TEXT resto.
  - Row count exacto por streaming (sin cargar archivo).
  - Cardinalidad rastreada solo para llaves ENIGH: folioviv, foliohog, numren.
"""
from __future__ import annotations

import argparse
import csv
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

NULL_TOKENS = {"", " ", "NA", "-"}
KEY_COLS = {"folioviv", "foliohog", "numren"}
ENCODINGS = ["utf-8", "latin-1", "cp1252"]
SAMPLE_ROWS = 1000
TYPE_CONFIDENCE = 0.95


@dataclass
class ColumnStats:
    name: str
    inferred_type: str = "TEXT"
    non_null: int = 0
    null: int = 0
    total: int = 0
    sample_examples: list[str] = field(default_factory=list)

    @property
    def null_pct(self) -> float:
        return (self.null / self.total * 100.0) if self.total else 0.0


@dataclass
class DatasetReport:
    name: str
    csv_path: Path
    size_bytes: int = 0
    encoding: str = "unknown"
    separator: str = ","
    row_count: int = 0
    header: list[str] = field(default_factory=list)
    columns: list[ColumnStats] = field(default_factory=list)
    key_cardinality: dict[str, int] = field(default_factory=dict)
    dict_variables: int | None = None
    dict_path: Path | None = None
    catalog_files: list[str] = field(default_factory=list)
    er_files: list[str] = field(default_factory=list)
    metadata_files: list[str] = field(default_factory=list)
    scan_seconds: float = 0.0
    warnings: list[str] = field(default_factory=list)


def detect_encoding(path: Path) -> str:
    with path.open("rb") as f:
        head = f.read(1_000_000)
    for enc in ENCODINGS:
        try:
            head.decode(enc)
            return enc
        except UnicodeDecodeError:
            continue
    return "binary"


def detect_separator(path: Path, encoding: str) -> str:
    with path.open("r", encoding=encoding, newline="") as f:
        sample = f.read(16_384)
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        return dialect.delimiter
    except csv.Error:
        return ","


def classify_value(v: str) -> str:
    """Devuelve 'int', 'float' o 'text' para un literal no-null."""
    try:
        int(v)
        return "int"
    except ValueError:
        pass
    try:
        float(v)
        return "float"
    except ValueError:
        return "text"


def infer_type(samples: list[str]) -> str:
    if not samples:
        return "TEXT"
    n = len(samples)
    int_count = float_count = 0
    for v in samples:
        k = classify_value(v)
        if k == "int":
            int_count += 1
            float_count += 1
        elif k == "float":
            float_count += 1
    if int_count / n >= TYPE_CONFIDENCE:
        return "INT"
    if float_count / n >= TYPE_CONFIDENCE:
        return "NUMERIC"
    return "TEXT"


def scan_csv(path: Path, encoding: str, sep: str) -> tuple[int, list[ColumnStats], dict[str, int]]:
    """Una pasada de streaming. Cuenta filas, acumula nulls, sample por columna, cardinalidad de llaves."""
    with path.open("r", encoding=encoding, newline="") as f:
        reader = csv.reader(f, delimiter=sep)
        try:
            header = next(reader)
        except StopIteration:
            return 0, [], {}

        cols = [ColumnStats(name=h.strip()) for h in header]
        samples: list[list[str]] = [[] for _ in header]
        key_idx = {name: i for i, name in enumerate(c.name for c in cols) if name in KEY_COLS}
        key_sets: dict[str, set[str]] = {name: set() for name in key_idx}

        row_count = 0
        for row in reader:
            row_count += 1
            if len(row) < len(cols):
                row = row + [""] * (len(cols) - len(row))
            for i, cell in enumerate(row[: len(cols)]):
                cols[i].total += 1
                if cell in NULL_TOKENS:
                    cols[i].null += 1
                else:
                    cols[i].non_null += 1
                    if len(samples[i]) < SAMPLE_ROWS:
                        samples[i].append(cell)
            for kname, kidx in key_idx.items():
                v = row[kidx] if kidx < len(row) else ""
                if v not in NULL_TOKENS:
                    key_sets[kname].add(v)

        for i, col in enumerate(cols):
            col.inferred_type = infer_type(samples[i])
            col.sample_examples = samples[i][:3]

        cardinality = {k: len(s) for k, s in key_sets.items()}
        return row_count, cols, cardinality


def count_dict_variables(dict_csv: Path) -> int | None:
    """Cuenta filas de datos (sin header) en diccionario_datos_*.csv."""
    try:
        enc = detect_encoding(dict_csv)
        with dict_csv.open("r", encoding=enc, newline="") as f:
            reader = csv.reader(f)
            try:
                next(reader)
            except StopIteration:
                return 0
            return sum(1 for _ in reader)
    except Exception:
        return None


def dataset_name_from_folder(folder: Path) -> str:
    name = folder.name
    prefix = "conjunto_de_datos_"
    suffix = "_enigh2024_ns"
    if name.startswith(prefix) and name.endswith(suffix):
        return name[len(prefix):-len(suffix)]
    return name


def discover_datasets(root: Path) -> list[DatasetReport]:
    reports: list[DatasetReport] = []
    for folder in sorted(root.iterdir()):
        if not folder.is_dir():
            continue
        if not folder.name.startswith("conjunto_de_datos_"):
            continue
        data_dir = folder / "conjunto_de_datos"
        if not data_dir.is_dir():
            continue
        csvs = list(data_dir.glob("*.csv"))
        if not csvs:
            continue
        csv_path = csvs[0]
        if len(csvs) > 1:
            # quedarse con el que contiene el sufijo estándar
            for c in csvs:
                if c.name.endswith("_enigh2024_ns.csv"):
                    csv_path = c
                    break

        r = DatasetReport(
            name=dataset_name_from_folder(folder),
            csv_path=csv_path,
            size_bytes=csv_path.stat().st_size,
        )
        dict_dir = folder / "diccionario_de_datos"
        if dict_dir.is_dir():
            dict_csvs = list(dict_dir.glob("*.csv"))
            if dict_csvs:
                r.dict_path = dict_csvs[0]
        cat_dir = folder / "catalogos"
        if cat_dir.is_dir():
            r.catalog_files = sorted(p.name for p in cat_dir.glob("*.csv"))
        er_dir = folder / "modelo_entidad_relacion"
        if er_dir.is_dir():
            r.er_files = sorted(
                p.name for p in er_dir.iterdir()
                if p.is_file() and not p.name.startswith(".") and p.name != "Thumbs.db"
            )
        meta_dir = folder / "metadatos"
        if meta_dir.is_dir():
            r.metadata_files = sorted(
                p.name for p in meta_dir.iterdir()
                if p.is_file() and not p.name.startswith(".")
            )
        reports.append(r)
    return reports


def process(r: DatasetReport) -> None:
    t0 = time.monotonic()
    r.encoding = detect_encoding(r.csv_path)
    if r.encoding == "binary":
        r.warnings.append("encoding no decodificable (ni utf-8/latin-1/cp1252)")
        return
    if r.encoding != "utf-8":
        r.warnings.append(f"encoding = {r.encoding} (no utf-8)")
    r.separator = detect_separator(r.csv_path, r.encoding)
    if r.separator != ",":
        r.warnings.append(f"separador = {r.separator!r} (no coma)")

    row_count, cols, cardinality = scan_csv(r.csv_path, r.encoding, r.separator)
    r.row_count = row_count
    r.columns = cols
    r.header = [c.name for c in cols]
    r.key_cardinality = cardinality

    for col in cols:
        if col.total > 0 and col.null_pct == 100.0:
            r.warnings.append(f"columna 100% nula: {col.name}")
        if col.total > 0 and col.non_null > 0 and col.inferred_type == "TEXT":
            # heurística: texto con baja cardinalidad suele ser categórica -> candidato a catálogo
            pass

    if r.dict_path:
        r.dict_variables = count_dict_variables(r.dict_path)

    r.scan_seconds = time.monotonic() - t0


def fmt_bytes(n: int) -> str:
    step = 1024.0
    unit = "B"
    v = float(n)
    for u in ("KB", "MB", "GB"):
        if v < step:
            break
        v /= step
        unit = u
    return f"{v:.1f} {unit}"


def fmt_num(n: int) -> str:
    return f"{n:,}".replace(",", " ")


def write_markdown(reports: list[DatasetReport], out_path: Path, root: Path) -> None:
    lines: list[str] = []
    A = lines.append

    total_rows = sum(r.row_count for r in reports)
    total_bytes = sum(r.size_bytes for r in reports)
    total_columns = sum(len(r.columns) for r in reports)
    unique_column_names = set()
    for r in reports:
        unique_column_names.update(c.name for c in r.columns)

    A("# ENIGH 2024 NS — Inventario de datos crudos")
    A("")
    A(f"Generado por `api/scripts/explore_enigh.py` (stdlib-only).  ")
    A(f"Fuente: `{root}`")
    A("")
    A("## Resumen agregado")
    A("")
    A(f"- Datasets encontrados: **{len(reports)}**")
    A(f"- Filas totales (suma): **{fmt_num(total_rows)}**")
    A(f"- Columnas totales (suma): **{total_columns}**")
    A(f"- Columnas únicas por nombre: **{len(unique_column_names)}**")
    A(f"- Bytes en disco (datos primarios): **{fmt_bytes(total_bytes)}**")
    A("")
    all_warnings = [(r.name, w) for r in reports for w in r.warnings]
    if all_warnings:
        A("### Warnings detectados")
        A("")
        for name, w in all_warnings:
            A(f"- `{name}`: {w}")
        A("")
    else:
        A("Sin warnings.")
        A("")

    A("## Tabla-resumen por dataset")
    A("")
    A("| Dataset | Filas | Cols | Tamaño | Encoding | Sep | Llaves presentes |")
    A("|---|---:|---:|---:|---|---|---|")
    for r in reports:
        keys = ", ".join(sorted(r.key_cardinality)) or "—"
        A(
            f"| `{r.name}` | {fmt_num(r.row_count)} | {len(r.columns)} | "
            f"{fmt_bytes(r.size_bytes)} | {r.encoding} | `{r.separator}` | {keys} |"
        )
    A("")

    A("## Detalle por dataset")
    A("")
    for r in reports:
        A(f"### `{r.name}`")
        A("")
        A(f"- CSV: `{r.csv_path.relative_to(root)}`")
        A(f"- Tamaño: {fmt_bytes(r.size_bytes)} — {fmt_num(r.row_count)} filas × {len(r.columns)} columnas")
        A(f"- Encoding: `{r.encoding}` — Separador: `{r.separator}`")
        A(f"- Scan: {r.scan_seconds:.1f}s")
        if r.dict_variables is not None:
            A(f"- Diccionario oficial INEGI: `{r.dict_path.name}` — {r.dict_variables} variables documentadas")
        if r.catalog_files:
            A(f"- Catálogos INEGI en carpeta (`{len(r.catalog_files)}`): {', '.join(f'`{c}`' for c in r.catalog_files)}")
        if r.er_files:
            A(f"- Modelo ER: {', '.join(f'`{e}`' for e in r.er_files)}")
        if r.metadata_files:
            A(f"- Metadatos: {', '.join(f'`{m}`' for m in r.metadata_files)}")
        if r.key_cardinality:
            parts = [f"`{k}` = {fmt_num(v)}" for k, v in sorted(r.key_cardinality.items())]
            A(f"- Cardinalidad de llaves: {', '.join(parts)}")
        if r.warnings:
            A(f"- Warnings: {'; '.join(r.warnings)}")
        A("")
        A("| # | Columna | Tipo inferido | Total | Nulls | % Null | Ejemplos |")
        A("|---:|---|---|---:|---:|---:|---|")
        for i, c in enumerate(r.columns, 1):
            ex = ", ".join(repr(x) for x in c.sample_examples) if c.sample_examples else "—"
            A(
                f"| {i} | `{c.name}` | {c.inferred_type} | {fmt_num(c.total)} | "
                f"{fmt_num(c.null)} | {c.null_pct:.1f}% | {ex} |"
            )
        A("")

    A("## Activos reutilizables de INEGI")
    A("")
    A("INEGI empaqueta cada dataset con recursos adicionales listos para integrar. "
      "Esta tabla los centraliza para la sesión de ingesta.")
    A("")
    A("| Dataset | Diccionario CSV | Catálogos | ER | Metadatos |")
    A("|---|---|---:|---|---|")
    total_catalogs = 0
    total_dict_vars = 0
    for r in reports:
        dict_cell = (
            f"`{r.dict_path.name}` ({r.dict_variables})"
            if r.dict_path and r.dict_variables is not None
            else (f"`{r.dict_path.name}` (?)" if r.dict_path else "—")
        )
        total_catalogs += len(r.catalog_files)
        if r.dict_variables:
            total_dict_vars += r.dict_variables
        catalog_cell = f"{len(r.catalog_files)}" if r.catalog_files else "—"
        er_cell = ", ".join(f"`{e}`" for e in r.er_files) if r.er_files else "—"
        meta_cell = ", ".join(f"`{m}`" for m in r.metadata_files) if r.metadata_files else "—"
        A(f"| `{r.name}` | {dict_cell} | {catalog_cell} | {er_cell} | {meta_cell} |")
    A("")
    A(f"- Variables documentadas totales (suma de diccionarios): **{fmt_num(total_dict_vars)}**")
    A(f"- Archivos de catálogo en disco (suma por dataset, con duplicados): **{total_catalogs}**")

    # deduplicación global de catálogos por nombre
    global_cats: dict[str, list[str]] = {}
    for r in reports:
        for c in r.catalog_files:
            global_cats.setdefault(c, []).append(r.name)
    A(f"- Catálogos únicos (nombre de archivo): **{len(global_cats)}**")
    A("")
    A("### Catálogos únicos y en qué datasets aparecen")
    A("")
    A("| Catálogo | Datasets |")
    A("|---|---|")
    for cat in sorted(global_cats):
        datasets = ", ".join(f"`{d}`" for d in sorted(global_cats[cat]))
        A(f"| `{cat}` | {datasets} |")
    A("")

    A("### Nota sobre el modelo ER")
    A("")
    A("El modelo ER oficial viene como PNG (una imagen por dataset) — **no es SQL ni DDL**, "
      "así que no podemos auto-extraer las FKs de INEGI. Las relaciones siguen siendo las conocidas:")
    A("- Nivel vivienda: `folioviv`")
    A("- Nivel hogar: `folioviv + foliohog`")
    A("- Nivel persona: `folioviv + foliohog + numren`")
    A("")

    out_path.write_text("\n".join(lines), encoding="utf-8")


def run(root: Path, out: Path) -> list[DatasetReport]:
    print(f"[explore] root = {root}")
    reports = discover_datasets(root)
    print(f"[explore] {len(reports)} datasets descubiertos")
    for i, r in enumerate(reports, 1):
        print(f"[{i:2d}/{len(reports)}] {r.name}: procesando ({fmt_bytes(r.size_bytes)})...", flush=True)
        process(r)
        print(
            f"         → {fmt_num(r.row_count)} filas × {len(r.columns)} cols "
            f"| enc={r.encoding} sep={r.separator!r} | {r.scan_seconds:.1f}s"
            + (f" | warnings: {len(r.warnings)}" if r.warnings else ""),
            flush=True,
        )
    out.parent.mkdir(parents=True, exist_ok=True)
    write_markdown(reports, out, root)
    print(f"\n[explore] inventario escrito en: {out}")
    return reports


def print_summary(reports: list[DatasetReport]) -> None:
    total_rows = sum(r.row_count for r in reports)
    total_bytes = sum(r.size_bytes for r in reports)
    total_cols = sum(len(r.columns) for r in reports)
    unique_names = {c.name for r in reports for c in r.columns}
    all_warnings = [(r.name, w) for r in reports for w in r.warnings]

    print("\n" + "=" * 72)
    print("RESUMEN AGREGADO")
    print("=" * 72)
    print(f"Datasets         : {len(reports)}")
    print(f"Filas totales    : {fmt_num(total_rows)}")
    print(f"Columnas totales : {total_cols}")
    print(f"Columnas únicas  : {len(unique_names)}")
    print(f"Bytes en disco   : {fmt_bytes(total_bytes)}")
    print(f"Warnings         : {len(all_warnings)}")
    if all_warnings:
        for name, w in all_warnings:
            print(f"   - [{name}] {w}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[1] if __doc__ else "")
    p.add_argument("--root", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    args = p.parse_args()

    if not args.root.is_dir():
        print(f"[error] root no existe o no es dir: {args.root}", file=sys.stderr)
        sys.exit(2)

    t0 = time.monotonic()
    reports = run(args.root.resolve(), args.out.resolve())
    print_summary(reports)
    print(f"\n[explore] tiempo total: {time.monotonic() - t0:.1f}s")


if __name__ == "__main__":
    main()
