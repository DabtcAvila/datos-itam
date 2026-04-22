# ENIGH 2024 NS — Plan de schema v2 (alcance ampliado)

**Estado**: borrador. NO reemplaza `enigh-schema-plan.md` hasta aprobación.
**Fecha**: 2026-04-21.
**Fuente**: INEGI, Encuesta Nacional de Ingresos y Gastos de los Hogares 2024
(Nueva Serie) — microdatos CSV oficiales + diccionarios + 111 catálogos en
`/Users/davicho/datos-itam/data-sources/conjunto_de_datos_enigh2024_ns_csv/`.
**Evidencia**: `api/docs/enigh-inventory.md` (1 411 líneas) generado por
`api/scripts/explore_enigh.py` sobre los 17 CSVs reales.

## 0. TL;DR vs plan v1

| Dimensión | v1 (MVP) | v2 (alcance ampliado) |
|---|---|---|
| Tablas de datos | 6 | **17** |
| Catálogos | 4 (construidos a mano desde PDF) | **111** (CSVs oficiales INEGI, 1:1) |
| Variables substantivas | ~38 (subset manual) | **957** columnas totales, 768 únicas |
| Filas a ingerir | ~900 000 | **7 281 164** |
| Tamaño post-ingesta | ~82 MB | **~1.3–1.6 GB** |
| Tiempo ingesta | — (no estimado) | **5–10 min** con `asyncpg.copy_records_to_table` |
| Migración | `006_enigh_schema.sql` (10 KB) | pendiente — reemplazo o `007_enigh_schema.sql` |

## 1. Hallazgos críticos de la exploración

El plan v1 + migración 006 contienen **4 errores** respecto a los CSVs reales
de la Nueva Serie. Ninguno es estructural (las PKs coinciden), pero los
nombres/ubicación de columnas hay que corregirlos:

| # | Migración dice | CSV real dice | Fix |
|---|---|---|---|
| 1 | `viviendas.entidad CHAR(2) REFERENCES cat_entidad` | no existe. `viviendas.ubica_geo` (5 chars `EEMMM`) sí existe. `entidad` está como columna suelta en hogares / poblacion / trabajos / ingresos / gastos* pero no en viviendas. | Quitar `entidad` de viviendas. Derivar entidad de `LEFT(folioviv, 2)` cuando se necesite, o JOIN con ubica_geo. |
| 2 | `hogares.tot_integ SMALLINT` | no existe en hogares.csv. `concentradohogar.tot_integ` sí existe. | Mover `tot_integ` de hogares a concentradohogar en el schema. |
| 3 | `concentradohogar.renta NUMERIC(14,2)` | no existe. El nombre real es `rentas` (plural). El diccionario confirma: "Renta de la propiedad" → nemónico `rentas`. | Renombrar a `rentas`. |
| 4 | `concentradohogar.decil SMALLINT NOT NULL CHECK (decil BETWEEN 1 AND 10)` | **no existe en ningún dataset ENIGH 2024 NS**. Breaking change documentado como riesgo en `enigh-schema-plan.md` §9. | Computar post-ingesta: `NTILE(10) OVER (ORDER BY ing_cor * factor)`. Guardar en columna `decil` o materialized view `mv_enigh_deciles`. |

Warnings menores detectados (información, no fixes):
- `hogares.nr_viv` — 100% nula.
- `noagro.nvo_prog3`, `noagro.nvo_act3`, `noagro.nvo_cant3` — 100% nulas.
- `poblacion.norecib_10`, `poblacion.razon_2` — 100% nulas.

Son artefactos del diseño de cuestionario (secciones no aplicables a ciertos
universos). Ingresar igual; los descartamos analíticamente.

### 1.bis Hallazgo post-scan: PK surrogate para gastoshogar y gastospersona

Durante la construcción de la migración 007 (sesión S2, 2026-04-21) el
generador hizo sanity-check de unicidad de PK sobre los CSVs reales. Se
encontró que la tupla natural asumida en v2 §2 no deduplica las filas:

| Tabla | Tupla natural propuesta | Dupes en CSV 2024 NS |
|---|---|---:|
| `gastoshogar` | `(folioviv, foliohog, clave)` | ~836 000 |
| `gastospersona` | `(folioviv, foliohog, numren, clave)` | ~235 000 |

**Motivo**: cada fila es un evento individual de gasto dentro del
periodo trimestral, no un agregado por hogar/persona. INEGI registra
cada ocurrencia como fila separada. La columna `numero_gasto` mencionada
en el plan v1 no existe en el diccionario ni en el CSV.

**Decisión 2026-04-21 (usuario aprueba opción B con matices)**:

1. Ambas tablas obtienen `id BIGSERIAL PRIMARY KEY` como primera columna.
2. Columnas naturales (`folioviv`, `foliohog`, `clave`, y `numren` en
   gastospersona) quedan `NOT NULL` — invariante del cuestionario.
3. **No** se añade UNIQUE sobre la tupla natural (sería documentar una
   mentira — no es única por diseño).
4. Se añade B-tree `idx_<tabla>_nk` sobre la tupla natural para joins
   y agregaciones por hogar/persona.
5. `COMMENT ON TABLE` en cada una explica que cada fila es un evento
   individual, que múltiples filas pueden compartir la tupla natural, y
   que para agregar hay que usar GROUP BY.

Justificación de la opción B sobre A (dejar PK natural y resolver en S5):
la fidelidad a INEGI no aplica — INEGI **no publica** PK en sus CSVs; la
elección de la tupla natural como PK fue nuestra, y esta decisión
corrige la nuestra, no contradice a INEGI.

Para `agroproductos` y `agroconsumo` el generador encontró un patrón
distinto: la tupla en v2 §2 (5-tuple) sí tenía dupes, pero extendiéndola
a 6-tuple `(..., numprod)` en agroproductos y 7-tuple
`(..., numprod, destino)` en agroconsumo, 0 dupes. Esos son PKs naturales
bien-formadas; el generador las aplicó automáticamente.

## 2. Arquitectura v2: 17 tablas agrupadas por grain

La llave determina la cardinalidad. **Ingerimos todas las columnas tal cual
vienen del CSV**, sin subset manual. Rationale: storage es barato (cabe en
Neon free tier) y cualquier columna puede alimentar una pregunta futura.
La "limpieza analítica" se hace en vistas/materialized views, no tirando
columnas a la basura.

### 2.1 Nivel vivienda — 1 tabla

| Tabla | Filas | Cols | Llave | CSV size |
|---|---:|---:|---|---:|
| `enigh.viviendas` | 90 324 | 82 | `folioviv` | 15.4 MB |

### 2.2 Nivel hogar — 2 tablas

| Tabla | Filas | Cols | Llave | CSV size |
|---|---:|---:|---|---:|
| `enigh.hogares` | 91 414 | 148 | `folioviv + foliohog` | 24.3 MB |
| `enigh.concentradohogar` ⭐ | 91 414 | 126 | `folioviv + foliohog` | 43.5 MB |

Observación: `hogares` y `concentradohogar` tienen el mismo count (91 414),
confirma la relación 1:1 del diseño INEGI.

### 2.3 Nivel hogar-transacción (gastos agregados) — 3 tablas

| Tabla | Filas | Cols | Llave | CSV size |
|---|---:|---:|---|---:|
| `enigh.gastoshogar` 🐘 | 5 311 497 | 31 | `folioviv + foliohog + clave` (+ `numero_gasto` implícito) | 552.2 MB |
| `enigh.erogaciones` | 69 162 | 16 | `folioviv + foliohog + clave` | 4.6 MB |
| `enigh.gastotarjetas` | 19 464 | 6 | `folioviv + foliohog + clave` | 627.6 KB |

La tabla `gastoshogar` concentra 73% de todas las filas. Requiere cuidado en
la ingesta (COPY en streaming, índice diferido).

### 2.4 Nivel persona — 1 tabla

| Tabla | Filas | Cols | Llave | CSV size |
|---|---:|---:|---|---:|
| `enigh.poblacion` | 308 598 | 185 | `folioviv + foliohog + numren` | 88.5 MB |

### 2.5 Nivel persona-clave — 3 tablas

| Tabla | Filas | Cols | Llave | CSV size |
|---|---:|---:|---|---:|
| `enigh.ingresos` | 391 563 | 21 | `folioviv + foliohog + numren + clave` | 33.6 MB |
| `enigh.gastospersona` | 377 073 | 23 | `folioviv + foliohog + numren + clave` | 30.9 MB |
| `enigh.ingresos_jcf` | 327 | 18 | `folioviv + foliohog + numren + clave` | 24.2 KB |

### 2.6 Nivel persona-trabajo — 1 tabla

| Tabla | Filas | Cols | Llave | CSV size |
|---|---:|---:|---|---:|
| `enigh.trabajos` | 164 325 | 60 | `folioviv + foliohog + numren + id_trabajo` | 19.2 MB |

### 2.7 Nivel negocio (persona-trabajo-tipoact) — 5 tablas agropecuario + 1 no-agro

| Tabla | Filas | Cols | Llave | CSV size |
|---|---:|---:|---|---:|
| `enigh.agro` | 17 442 | 66 | `folioviv + foliohog + numren + id_trabajo + tipoact` | 2.7 MB |
| `enigh.agroproductos` | 69 052 | 25 | mismo | 4.4 MB |
| `enigh.agroconsumo` | 43 992 | 11 | mismo | 1.6 MB |
| `enigh.agrogasto` | 61 132 | 7 | mismo + `clave` | 1.7 MB |
| `enigh.noagro` | 23 109 | 115 | `folioviv + foliohog + numren + id_trabajo + tipoact` | 6.5 MB |
| `enigh.noagroimportes` | 151 276 | 17 | `folioviv + foliohog + numren + id_trabajo + clave` | 9.3 MB |

**Totales**: 17 tablas, 7 281 164 filas, 957 columnas, **838.9 MB en CSV**.

## 3. Catálogos — 111 tablas, todas de INEGI verbatim

INEGI empaqueta un directorio `catalogos/*.csv` por cada dataset. Total:
**111 archivos de catálogo únicos** (por nombre), muchos compartidos entre
datasets (`si_no.csv` aparece en 7, `entidad.csv` en 6, `tipoact.csv` en 6,
`mes.csv` en 7, `id_trabajo.csv` en 7). Todos siguen el formato
`code,descripcion`.

**Estrategia**: cargar los 111 como `enigh.cat_<nombre>` (quitando `.csv`).
Más simple que inventar versiones sintetizadas. Overhead en disco
despreciable (<1 MB total, cada catálogo <500 filas).

Los 15 catálogos más compartidos (candidatos a FK en múltiples tablas):

| Catálogo | # datasets que lo referencian |
|---|---:|
| `si_no` | 7 |
| `mes` | 7 |
| `id_trabajo` | 7 |
| `entidad` | 6 |
| `tipoact` | 6 |
| `sexo` | 2 |
| `ct_futuro` | 2 |
| `ubica_geo` | 2 |
| `tam_loc` | 2 |
| `gastos`, `cantidades`, `forma_pag`, `inst_salud`, `mes_dia`, `tipo_gasto` | 2 c/u |

Los 96 catálogos restantes aparecen en 1 solo dataset (altamente
específicos: `mat_pared`, `drenaje`, `parentesco`, `scian`, etc.).

El inventario completo (incluyendo qué datasets usan cada catálogo) está en
`api/docs/enigh-inventory.md` §"Activos reutilizables de INEGI".

## 4. Redundancia intencional en los CSVs

Varias tablas-hijas traen las columnas `factor`, `entidad`, `est_dis`, `upm`
pegadas al final:
- **Con factor/entidad/est_dis/upm**: gastoshogar, gastospersona, hogares,
  ingresos, poblacion, trabajos.
- **Solo con factor**: concentradohogar, viviendas.

Es duplicación intencional de INEGI para que cada tabla sea analizable
standalone sin JOIN. **Recomendación v2**: mantener la redundancia en la BD
— fidelidad 1:1 con INEGI + queries más legibles + cost marginal (factor es
INTEGER, 4 bytes × 7M filas = 28 MB total). Los puristas pueden agregar
restricciones CHECK para mantener consistencia factor ↔ hogares.

## 5. Activos INEGI reutilizables (no reinventar la rueda)

Lo que viene empaquetado oficialmente y **no tenemos que construir**:

| Artefacto | Qué es | Uso en ingesta |
|---|---|---|
| Diccionarios (17 CSVs) | Nombre, longitud, tipo C/N, nemónico, catálogo, rango | **Autoritativo para tipos** — cruzar con inferencia Python |
| Catálogos (111 CSVs) | `clave,descripcion` | Carga directa como `enigh.cat_*` |
| ER diagrams (17 PNGs) | Una imagen por dataset | Documentación; no es DDL, no se auto-parsea |
| Metadatos (17 TXTs) | Descripción larga, metodología muestral | Referencia humana; no estructurado |

El PNG del modelo ER es lo único no-procesable automáticamente. Las FKs se
infieren del diccionario (columna `catálogo`) + la convención de nombres.

## 6. Estimación de tamaño post-ingesta en Neon

Aritmética sin optimismo de compresión (Neon usa compresión de página pero
el overhead típico es ~1.2× CSV):

| Concepto | Estimado |
|---|---:|
| CSVs raw | 838.9 MB |
| Datos en Postgres (factor ~1.3×) | ~1.09 GB |
| Catálogos (111 tablas pequeñas) | ~2 MB |
| Índices PK (compuestos, 17 tablas) | ~150–200 MB |
| Índices analíticos (~15–20 adicionales) | ~50–100 MB |
| Materialized views (decil, rollups) | ~50 MB |
| **Total estimado** | **~1.35 – 1.55 GB** |

**Capacidad Neon**:
- Free tier: 3.0 GB.
- CDMX actual: ~0.5 GB.
- Post-ENIGH total: **~1.9 GB** → dentro del cap con ~37% de headroom.

Si hay presión, primera palanca: omitir columnas 100% nulas al ingerir
(ahorro marginal pero limpio). Segunda palanca: `noagroimportes.importe_*`
tiene 6 columnas mensuales que podemos colapsar.

## 7. Tiempo de ingesta vía `asyncpg.copy_records_to_table`

Método rápido (el que usa CDMX hoy, no INSERT paralelo). Throughput
medido/observado en proyectos similares contra Neon-pooler:

- Pipe estable: **100–200 K filas/seg** (limitado por red round-trip +
  parsing Python).
- Overhead estimado conservador: **150 K rps**.

| Fase | Filas | Tiempo @150K rps |
|---|---:|---:|
| Catálogos (111 tablas, ~10 K filas totales) | 10 000 | <1 s |
| Core (viviendas + hogares + concentradohogar) | 273 152 | ~2 s |
| Persona (poblacion + ingresos + ingresos_jcf + trabajos) | 864 813 | ~6 s |
| Gastos (gastoshogar + gastospersona + gastotarjetas + erogaciones) | 5 777 196 | ~38 s |
| Negocios (agro* + noagro*) | 366 003 | ~2 s |
| **Total COPY puro** | **7 291 164** | **~48 s** |

Con overhead de parsing Python + round-trip + index maintenance:
**5–10 min wall-clock total**. gastoshogar solo domina (~3–5 min).

**Tuning recomendado para la sesión de ingesta**:
1. Crear índices **después** de COPY (CDMX lo hace al revés; ahí es simple
   porque son 246K filas, aquí gastoshogar requiere esta optimización).
2. `ALTER TABLE ... SET UNLOGGED` antes de COPY, `SET LOGGED` después (2–3×
   más rápido). Neon soporta esto.
3. Desactivar triggers FK durante carga si los hay; validar post-load.
4. Batches de 50 K filas por `copy_records_to_table` (dentro de una sesión
   asyncpg larga, no una por batch).

## 8. División propuesta en sesiones

Con el alcance v1 (6 tablas) la ingesta iba a ser una sola sesión. Con v2
(17 tablas + 111 catálogos + 4 fixes al schema + decil computado)
recomiendo 5 sesiones pequeñas enfocadas. Cada una cierra con validación.

### S2 — `enigh-schema-setup`: schema y catálogos
**Scope**: sustituir migración 006 por `007_enigh_schema.sql` v2 con 17
tablas + 111 catálogos. Ingerir los 111 catálogos (~10 K filas totales).

**Entregables**:
- `api/migrations/007_enigh_schema.sql` (o renombrar 006 a `006_enigh_schema_legacy.sql.bak`).
- `api/scripts/ingest_enigh_catalogs.py` (stdlib + asyncpg, itera los 111 CSVs).
- Validación: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'enigh'` = 128 (17 datos + 111 cat).

**Tiempo estimado**: 90 min trabajo. <5 s ingesta.

### S3 — `enigh-ingest-core`: vivienda + hogar
**Scope**: ingestar viviendas, hogares, concentradohogar (~273K filas).

**Entregables**:
- `api/scripts/ingest_enigh.py` (genérico por tabla, lee dict INEGI para tipos).
- Validaciones: count viviendas == 90 324; count hogares == count concentradohogar == 91 414.
- Materialized view `mv_enigh_deciles` computando `decil` desde `concentradohogar.ing_cor * factor`.

**Tiempo estimado**: 60 min trabajo. ~2 s ingesta.

### S4 — `enigh-ingest-persona`: nivel persona
**Scope**: poblacion, trabajos, ingresos, ingresos_jcf (~865K filas).

**Entregables**:
- Extensión de `ingest_enigh.py`.
- Validaciones: persona uniqueness, FKs a hogar, claves de ingreso en catálogo.

**Tiempo estimado**: 60 min trabajo. ~6 s ingesta.

### S5 — `enigh-ingest-gastos`: la sesión pesada
**Scope**: gastoshogar (5.3M), gastospersona, gastotarjetas, erogaciones.

**Entregables**:
- Carga con índices diferidos (crear PK después del COPY).
- Strategy UNLOGGED→LOGGED.
- Sanity check: suma de `gasto_tri * factor` en rango nacional publicado.

**Tiempo estimado**: 90 min trabajo. ~5 min ingesta (gastoshogar es el cuello).

### S6 — `enigh-ingest-negocios`: agro + noagro
**Scope**: agro, agroproductos, agroconsumo, agrogasto, noagro, noagroimportes.

**Entregables**:
- Carga estándar (volúmenes modestos).
- Validación final: `COUNT(*)` en enigh por tabla coincide con el inventario.

**Tiempo estimado**: 60 min trabajo. ~2 s ingesta.

### S7+ — API, materialized views, frontend
**Scope**: routers `/enigh/*`, analytics endpoints, comparativos CDMX↔ENIGH, componentes dashboard. Fuera del alcance de esta discusión de schema.

## 9. Estimación de endpoints potenciales

Si exponemos todo con la misma plantilla CRUD+stats+analytics del dataset
CDMX (hoy 31 endpoints sobre 10 tablas):

- **Lista + stats por tabla de datos** (17 tablas × 2 endpoints): **34**
- **Lista de cada catálogo** (~10 catálogos compartidos, resto on-demand): **10**
- **Analytics cruzado** (decil, brecha, cobertura retiro, por entidad, ahorro): **8–10**
- **Cross-dataset CDMX↔ENIGH**: **4–6**
- **Auth, export, admin**: heredados del stack existente.

**Total estimado: 55–65 endpoints nuevos** si exponemos todo. MVP práctico
post-ingesta: **~15 endpoints** (los que alimentan dashboards).

## 10. Decisiones pendientes para revisión

1. ¿Reemplazar migración 006 in-place o crear 007 dejando 006 como legado
   documental?
2. ¿Cargar TODAS las columnas al 100% o descartar las 6 columnas 100%-nulas
   detectadas (cosmético; ahorro marginal)?
3. ¿FKs explícitas entre tablas-hijas y `viviendas/hogares`, o "FK de
   documentación" (en el plan, no en DDL)? INEGI no las declara; si las
   imponemos, necesitamos validar todos los 7M registros antes del COPY.
4. ¿`decil` como columna materializada en `concentradohogar` (persist) o
   como `mv_enigh_deciles` (refresh on demand)?
5. ¿Algún descarte de tabla por prioridad? El inventario es exhaustivo; si
   una tabla no se va a usar en 6 meses, vale la pena discutir si entra.

## 11. Riesgos y mitigaciones (actualizado)

| Riesgo | Prob. | Mitigación |
|---|---|---|
| Inferencia de tipos equivoca CHAR vs INT en columnas con ceros a la izquierda (ej. `folioviv` = 10 chars incluyendo ceros). | alta | Forzar tipo desde diccionario INEGI: `tipo=C` → VARCHAR, `tipo=N` → NUMERIC. No confiar en inferencia Python para columnas-llave. |
| Neon cap 3 GB rebasado por índices + materialized views. | baja | Si pasa, descartar índices no usados en las primeras semanas y recrearlos selectivos. |
| FK inserts fallan por orden incorrecto. | media | Deshabilitar session-level `session_replication_role = replica` durante COPY, reactivar + validar al cerrar sesión S6. |
| `decil` computado no coincide con publicaciones INEGI por diferencia de método. | media | Documentar fórmula usada (`NTILE(10) OVER (ORDER BY ing_cor * factor)`). Comparar contra tabla de deciles publicada en comunicado oficial. |
| Ingesta de gastoshogar (5.3M filas) falla por timeout Neon-pooler. | media | Dividir en batches de 500K; retry con backoff; o ingerir en horario bajo. |

## 12. Siguientes pasos concretos

1. Usuario revisa este v2.
2. Decidir items §10.
3. Si OK: reemplazar `enigh-schema-plan.md` con este archivo (o mergear).
4. Arrancar sesión S2 (schema + catálogos).
