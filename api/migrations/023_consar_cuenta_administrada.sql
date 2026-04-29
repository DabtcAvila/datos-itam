-- =============================================================================
-- Migration 023: CONSAR cuenta_administrada + cuenta_administrada_agg (S16 Sub-fase 7)
-- =============================================================================
--
-- Dataset #05 (datosgob_05_cuentas.csv) en formato canónico atomizado long-format.
-- Pivot wide→long: 4,303 rows wide × 11 métricas → 19,841 rows long (skip empties).
--
--   consar.cat_metrica_cuenta            → catálogo de 11 métricas (counts BIGINT)
--   consar.cat_cuenta_etiqueta_agg       → catálogo de 3 etiquetas no-commercial
--   consar.cuenta_administrada           → fact long-format atomic (10 commercial)
--   consar.cuenta_administrada_agg       → fact long-format aggregate (3 etiquetas)
--
-- Granularidad atomic:  (fecha × afore × metrica) → 1 valor BIGINT.  PK 3-tupla.
-- Granularidad agg:     (fecha × etiqueta × metrica) → 1 valor BIGINT. PK 3-tupla.
-- NO incluye dim siefore (a diferencia de #03 que sí). NO sub-variants concat.
--
-- Estructura del CSV original (4,303 rows, cartesian completo):
--   2 dim: fecha, afore
--   11 métricas wide-pivoted, todas BIGINT counts (cuentas o trabajadores):
--     cuentas_inhabilitadas (desde 2024-09-01, reforma)
--     cuentas_resguardadas_fondo_pensiones_para_bienestar_010 (sentinel-only, 2024-07+)
--     total_cuentas_administradas_sar (sentinel-only, 1997-12+)
--     total_cuentas_administradas_afores (commercial, 1997-12+)
--     trabajadores_asignados (commercial, 2001-06+)
--     trabajadores_asignados_recursos_depositados_banco_mexico (commercial, 2012-01+)
--     trabajadores_asignados_recursos_depositados_siefores (commercial, 2012-01+)
--     trabajadores_imss (commercial, 1997-12+)
--     trabajadores_independientes (commercial, 2005-08+)
--     trabajadores_issste (commercial, 2005-08+)
--     trabajadores_registrados (commercial, 1997-12+)
--
-- Cobertura temporal: 1997-12-01 → 2025-06-01 (331 fechas mensuales).
-- La cobertura más profunda de S16 (junto con #07 desde 1997-07).
--
-- Strings 'afore' del CSV (13 unique):
--   - 10 commercial real (match exact a consar.afores.nombre_csv): azteca, banamex,
--     coppel, inbursa, invercap, pensionissste, principal, profuturo, sura, xxi banorte
--   - 2 sentinels sistema-total:
--       'total de cuentas administradas en el sar' → reporta SOLO total_sar (331 rows)
--       'cuentas resguardadas en el fondo de pensiones para el bienestar 10'
--           → reporta SOLO cuentas_resguardadas_010 (12 rows desde 2024-07)
--   - 1 entidad administrativa especial:
--       'prestadora de servicios' → reporta SOLO cuentas_inhabilitadas (10 rows desde 2024-09)
--
-- Decisión arquitectural Sub-fase 7 (David approved):
--   D1: Modelo atomic + agg específico (replica pattern #07/#10)
--   D2: BIGINT vs ds3 NUMERIC(20,2) — empíricamente todos los valores son counts integer
--       (todos terminan en .0, sin decimales reales). BIGINT es semánticamente correcto
--       y más eficiente. Divergencia documentada vs DDL académico ds3.
--   D3: 3 categorías en cat_cuenta_etiqueta_agg:
--       'sistema_total'              (total_sar)
--       'sistema_categoria_especial' (bienestar_010, reforma 2024)
--       'administrativa_especial'    (prestadora_de_servicios, regulatoria especial)
--   D6: cuentas_inhabilitadas reportadas por commercial → atomic;
--                                       prestadora     → agg.
--
-- Hallazgo factual descriptivo (S13 disciplina, NO interpretativo):
--   Identidad SAR triple-capa post-reforma 2024:
--     Pre-2024-07-01: total_sar = Σ commercial.total_afores (cierre 100% exacto)
--     2024-07-01:     total_sar = Σ commercial + bienestar_010 (cierre 100%)
--     2024-09-01+:    total_sar > Σ commercial + bienestar_010 + prestadora.cuentas_inhab
--                     residuo creciente: 5,130,115 (2024-12) → 5,552,645 (2025-06)
--   Causa específica del residuo NO determinable con datos disponibles.
--   Probable atribución: cuentas en transición jurisdiccional (afores ↔ Pensión Bienestar
--   ↔ INFONAVIT) bajo reforma 2024, pero NO confirmable empíricamente con #05 solo.
--
-- Cobertura esperada post-ingest (validada byte-exact via dry-run):
--   consar.cuenta_administrada     = 19,488 long rows (10 commercial × 11 métricas, skip empties)
--   consar.cuenta_administrada_agg =    353 long rows (331 + 12 + 10)
--   GRAND TOTAL                    = 19,841 long rows
--
-- Vigésimo-tercera migración. Décimo-segunda de la familia CONSAR.
-- =============================================================================

BEGIN;

-- ------------------------------------------------------------------
-- consar.cat_metrica_cuenta: 11 métricas (counts BIGINT)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.cat_metrica_cuenta (
    id              SMALLSERIAL  PRIMARY KEY,
    columna_csv     VARCHAR(80)  NOT NULL UNIQUE,
    slug            VARCHAR(40)  NOT NULL UNIQUE,
    descripcion     TEXT         NOT NULL,
    unidad          VARCHAR(16)  NOT NULL DEFAULT 'count',
    desde_fecha     DATE         NOT NULL,
    orden_display   INTEGER      NOT NULL,
    notas           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT cat_metrica_cuenta_unidad_ck
        CHECK (unidad IN ('count'))
);

CREATE INDEX idx_cat_metrica_cuenta_slug ON consar.cat_metrica_cuenta(slug);

COMMENT ON TABLE consar.cat_metrica_cuenta IS
    'Catálogo de 11 métricas operacionales de cuentas administradas reportadas en '
    'dataset #05 (datosgob_05_cuentas.csv). Análogo a ds3.ds3_cat_metrica_cuenta. '
    'Todas las métricas son BIGINT counts (cuentas o trabajadores), no decimales. '
    'Empíricamente verificado: todos los valores en CSV terminan en .0 (sin '
    'fraccionarios reales). Producción adopta BIGINT vs ds3 NUMERIC(20,2) por '
    'eficiencia y exactitud semántica. Las métricas tienen primera fecha esperada '
    'distinta (desde_fecha) reflejando evolución regulatoria del SAR mexicano.';

COMMENT ON COLUMN consar.cat_metrica_cuenta.columna_csv IS
    'Nombre exacto de la columna en CSV crudo #05. Match byte-exact requerido en ingest.';

COMMENT ON COLUMN consar.cat_metrica_cuenta.slug IS
    'Slug canónico corto para queries API. NO incluido en ds3 — adición S16 Sub-fase 7.';

COMMENT ON COLUMN consar.cat_metrica_cuenta.unidad IS
    'count: contador entero (BIGINT). Las 11 métricas son uniformes en unidad '
    '(cuentas o trabajadores), a diferencia de #03 que mezcla ratio/pct/dias/count.';

COMMENT ON COLUMN consar.cat_metrica_cuenta.desde_fecha IS
    'Primera fecha empíricamente observada para esta métrica en el CSV. Refleja '
    'evolución regulatoria CONSAR: e.g. trabajadores_asignados aparece desde 2001-06, '
    'la subdivisión banco_mexico/siefores desde 2012-01, cuentas_inhabilitadas desde '
    '2024-09 (reforma Pensión Bienestar). Útil para bound checks en ingest.';

INSERT INTO consar.cat_metrica_cuenta (columna_csv, slug, descripcion, desde_fecha, orden_display, notas) VALUES
    ('cuentas_inhabilitadas',
     'cuentas_inhabilitadas',
     'Cuentas inhabilitadas (cuentas que no pueden recibir aportaciones por irregularidades regulatorias o duplicidad). Reportadas por afores commercial + prestadora de servicios.',
     '2024-09-01', 1,
     'Métrica nueva post-reforma 2024. 100 rows commercial (10 afores × 10 fechas) + 10 rows prestadora_de_servicios (agg).'),

    ('cuentas_resguardadas_fondo_pensiones_para_bienestar_010',
     'cuentas_bienestar_010',
     'Cuentas resguardadas en el Fondo de Pensiones para el Bienestar (Cuenta 010). Reportada SOLO como agregado de sistema (no por afore individual).',
     '2024-07-01', 2,
     'Sentinel-only: aparece exclusivamente con la etiqueta "cuentas resguardadas en el fondo de pensiones para el bienestar 10". 12 rows en cuenta_administrada_agg desde 2024-07.'),

    ('total_cuentas_administradas_sar',
     'total_cuentas_sar',
     'Total de cuentas administradas en el SAR (sistema completo). Sentinel sistema-total.',
     '1997-12-01', 3,
     'Sentinel-only: aparece exclusivamente con la etiqueta "total de cuentas administradas en el sar". 331 rows en cuenta_administrada_agg (cobertura completa 1997-12 → 2025-06).'),

    ('total_cuentas_administradas_afores',
     'total_cuentas_afores',
     'Total de cuentas administradas por las AFOREs (excluyendo bienestar y otras categorías). Reportada por afores commercial individuales.',
     '1997-12-01', 4,
     'Métrica core commercial. 2,929 rows (10 afores; algunos no operaron desde 1997).'),

    ('trabajadores_asignados',
     'trabajadores_asignados',
     'Trabajadores asignados (cuentas asignadas administrativamente por CONSAR a una afore específica, sin elección activa del trabajador).',
     '2001-06-01', 5,
     'Introducción CONSAR 2001 del concepto "asignados". 2,677 rows (10 afores).'),

    ('trabajadores_asignados_recursos_depositados_banco_mexico',
     'asignados_banco_mexico',
     'Trabajadores asignados con recursos depositados en Banco de México (subcategoria de asignados sin recursos canalizados a SIEFOREs aún).',
     '2012-01-01', 6,
     'Subdivisión post-2012 del concepto asignados. 1,620 rows (10 afores).'),

    ('trabajadores_asignados_recursos_depositados_siefores',
     'asignados_siefores',
     'Trabajadores asignados con recursos depositados en SIEFOREs (subcategoria de asignados con recursos ya canalizados al sistema de inversión).',
     '2012-01-01', 7,
     'Subdivisión post-2012 del concepto asignados. 1,620 rows (10 afores). Identidad parcial: trabajadores_asignados ≈ banco_mexico + siefores desde 2012.'),

    ('trabajadores_imss',
     'trabajadores_imss',
     'Trabajadores afiliados al IMSS administrados.',
     '1997-12-01', 8,
     'Métrica core commercial. 2,929 rows (10 afores). Cobertura más amplia de #05.'),

    ('trabajadores_independientes',
     'trabajadores_independientes',
     'Trabajadores independientes (auto-afiliación al SAR sin patrón empleador).',
     '2005-08-01', 9,
     'Introducción 2005 del concepto trabajador independiente. 2,342 rows (10 afores).'),

    ('trabajadores_issste',
     'trabajadores_issste',
     'Trabajadores afiliados al ISSSTE administrados (post-reforma ISSSTE 2007/2008).',
     '2005-08-01', 10,
     '2,342 rows (10 afores). Pre-2007 PensionISSSTE no existía como afore separada.'),

    ('trabajadores_registrados',
     'trabajadores_registrados',
     'Trabajadores registrados activamente (con elección de afore) — distinto de asignados.',
     '1997-12-01', 11,
     'Métrica core commercial. 2,929 rows (10 afores).');

-- ------------------------------------------------------------------
-- consar.cat_cuenta_etiqueta_agg: 3 etiquetas no-commercial
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.cat_cuenta_etiqueta_agg (
    id              SMALLSERIAL  PRIMARY KEY,
    slug            VARCHAR(40)  NOT NULL UNIQUE,
    csv_string      VARCHAR(120) NOT NULL UNIQUE,
    nombre_display  VARCHAR(150) NOT NULL,
    categoria       VARCHAR(40)  NOT NULL,
    notas           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT cat_cuenta_etiqueta_agg_categoria_ck
        CHECK (categoria IN ('sistema_total', 'sistema_categoria_especial', 'administrativa_especial'))
);

CREATE INDEX idx_cat_cuenta_etiqueta_agg_categoria ON consar.cat_cuenta_etiqueta_agg(categoria);

COMMENT ON TABLE consar.cat_cuenta_etiqueta_agg IS
    'Catálogo de 3 etiquetas no-commercial que aparecen en columna afore del CSV #05 '
    'pero NO corresponden a una afore comercial. Distinción semántica entre tipos de '
    'no-commercial: agregado del sistema completo (total_sar), categoría especial '
    'reformista (bienestar_010 post-2024), entidad regulatoria especial (prestadora_de_servicios). '
    'Análogo a flag es_agregado=TRUE en ds3.ds3_cat_afore pero con tipología explícita.';

COMMENT ON COLUMN consar.cat_cuenta_etiqueta_agg.categoria IS
    'sistema_total: agregado del SAR completo (total_sar reporta total cuentas SAR). '
    'sistema_categoria_especial: categoría especial post-reforma 2024 (bienestar_010 '
    'reporta cuentas resguardadas en Fondo Pensiones Bienestar Cuenta 010, introducida '
    'por reforma 2024). '
    'administrativa_especial: entidad regulatoria especial (prestadora_de_servicios '
    'reporta cuentas_inhabilitadas asociadas a empresas prestadoras de servicios bajo '
    'régimen de outsourcing).';

INSERT INTO consar.cat_cuenta_etiqueta_agg (slug, csv_string, nombre_display, categoria, notas) VALUES
    ('total_cuentas_sar',
     'total de cuentas administradas en el sar',
     'Total de cuentas administradas en el SAR',
     'sistema_total',
     'Sentinel sistema-total. Reporta SOLO la métrica total_cuentas_administradas_sar. '
     '331 rows (cobertura 1997-12 → 2025-06). Pre-2024-07 cierra exactamente con Σ commercial.total_afores.'),

    ('cuentas_bienestar_010',
     'cuentas resguardadas en el fondo de pensiones para el bienestar 10',
     'Cuentas resguardadas en Fondo de Pensiones para el Bienestar (Cuenta 010)',
     'sistema_categoria_especial',
     'Sentinel reformista 2024. Reporta SOLO cuentas_resguardadas_fondo_pensiones_para_bienestar_010. '
     '12 rows desde 2024-07-01 (introducción reforma SAR/Pensión Bienestar).'),

    ('prestadora_de_servicios',
     'prestadora de servicios',
     'Prestadora de servicios (entidad regulatoria especial)',
     'administrativa_especial',
     'Entidad regulatoria especial. Reporta SOLO cuentas_inhabilitadas. 10 rows desde '
     '2024-09-01. NO es afore comercial; representa cuentas asociadas a empresas '
     'prestadoras de servicios bajo régimen de outsourcing con cuentas inhabilitadas '
     'por irregularidades regulatorias.');

-- ------------------------------------------------------------------
-- consar.cuenta_administrada: long-format fact atomic (10 commercial)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.cuenta_administrada (
    fecha       DATE     NOT NULL,
    afore_id    INTEGER  NOT NULL REFERENCES consar.afores(id)              ON DELETE RESTRICT,
    metrica_id  SMALLINT NOT NULL REFERENCES consar.cat_metrica_cuenta(id)  ON DELETE RESTRICT,
    valor       BIGINT   NOT NULL,
    PRIMARY KEY (fecha, afore_id, metrica_id),
    CONSTRAINT cuenta_administrada_fecha_first_of_month
        CHECK (EXTRACT(DAY FROM fecha) = 1)
);

CREATE INDEX idx_cuenta_administrada_afore_metrica ON consar.cuenta_administrada(afore_id, metrica_id, fecha);
CREATE INDEX idx_cuenta_administrada_metrica_fecha ON consar.cuenta_administrada(metrica_id, fecha);

COMMENT ON TABLE consar.cuenta_administrada IS
    'Métricas operacionales de cuentas administradas mensual long-format por '
    '(AFORE × MÉTRICA). Solo afores commercial (10): azteca, banamex, coppel, '
    'inbursa, invercap, pensionissste, principal, profuturo, sura, xxi banorte. '
    'Etiquetas no-commercial (sentinels + prestadora) van a cuenta_administrada_agg. '
    'Dataset #05 (datosgob_05_cuentas.csv) post-pivot wide→long: cada fila wide CSV '
    'genera hasta 11 filas long (una por métrica con valor non-empty). '
    'Cobertura 1997-12 → 2025-06 (331 fechas mensuales). '
    'Skip empties: solo se inserta cuando valor != '''' en CSV (NOT NULL constraint).';

COMMENT ON COLUMN consar.cuenta_administrada.valor IS
    'Valor BIGINT count. Empíricamente todos los valores en CSV son enteros (terminan '
    'en .0). Divergencia vs ds3 NUMERIC(20,2): producción adopta BIGINT por exactitud '
    'semántica y eficiencia. Range observado total: [0, 18,597,840] (max es '
    'total_cuentas_administradas_afores de XXI-Banorte ~2024).';

-- ------------------------------------------------------------------
-- consar.cuenta_administrada_agg: long-format fact aggregate (3 etiquetas)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.cuenta_administrada_agg (
    fecha        DATE     NOT NULL,
    etiqueta_id  SMALLINT NOT NULL REFERENCES consar.cat_cuenta_etiqueta_agg(id) ON DELETE RESTRICT,
    metrica_id   SMALLINT NOT NULL REFERENCES consar.cat_metrica_cuenta(id)      ON DELETE RESTRICT,
    valor        BIGINT   NOT NULL,
    PRIMARY KEY (fecha, etiqueta_id, metrica_id),
    CONSTRAINT cuenta_administrada_agg_fecha_first_of_month
        CHECK (EXTRACT(DAY FROM fecha) = 1)
);

CREATE INDEX idx_cuenta_administrada_agg_etiqueta_metrica ON consar.cuenta_administrada_agg(etiqueta_id, metrica_id, fecha);
CREATE INDEX idx_cuenta_administrada_agg_metrica_fecha    ON consar.cuenta_administrada_agg(metrica_id, fecha);

COMMENT ON TABLE consar.cuenta_administrada_agg IS
    'Agregados no-commercial de cuentas administradas. Distinto a cuenta_administrada '
    '(atomic por afore commercial). Esta tabla almacena 3 etiquetas: '
    '(a) total_cuentas_sar — agregado sistema completo (sentinel sistema-total), '
    '(b) cuentas_bienestar_010 — categoría especial reforma 2024, '
    '(c) prestadora_de_servicios — entidad regulatoria especial. '
    'Análogo conceptual a consar.activo_neto_agg (#07) y consar.rendimiento_sis (#10), '
    'pero con catálogo de etiquetas explícito (cat_cuenta_etiqueta_agg) en lugar de '
    'string libre, por la heterogeneidad semántica entre las 3 categorías. '
    'Cobertura 1997-12 → 2025-06 (331 fechas para total_sar; 2024-07+ para bienestar; '
    '2024-09+ para prestadora).';

COMMENT ON COLUMN consar.cuenta_administrada_agg.valor IS
    'Valor BIGINT count. Misma semántica que cuenta_administrada.valor. '
    'Identidad SAR triple-capa (descriptiva, post-reforma 2024): '
    'pre-2024-07: total_sar = Σ cuenta_administrada(metric=total_afores) (cierre 100%); '
    '2024-07-01: total_sar = Σ commercial + bienestar_010 (cierre 100%); '
    '2024-09-01+: total_sar > Σ commercial + bienestar + prestadora.cuentas_inhab '
    '(residuo creciente NO atribuible a categorías visibles).';

COMMIT;

-- =============================================================================
-- Rollback:
--   DROP TABLE consar.cuenta_administrada_agg CASCADE;
--   DROP TABLE consar.cuenta_administrada CASCADE;
--   DROP TABLE consar.cat_cuenta_etiqueta_agg CASCADE;
--   DROP TABLE consar.cat_metrica_cuenta CASCADE;
-- =============================================================================
