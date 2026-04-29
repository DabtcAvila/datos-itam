-- =============================================================================
-- Migration 020: CONSAR activo_neto + activo_neto_agg (S16 Sub-fase 4)
-- =============================================================================
--
-- Dataset #07 (datosgob_07_activos_netos.csv) en formato canónico atomizado
-- según Opción D del análisis Fase 1, S16:
--
--   consar.activo_neto      → rows atómicos (afore × siefore × fecha)
--   consar.activo_neto_agg  → rows agregados (afore × categoría agregada × fecha)
--
-- Distinción atomic vs agg en CSV original (columna tipo_recurso):
--   ATOMIC (11 valores siefore-específicos):
--     'siefore básica 55-59' .. '95-99' (9), 'siefore básica de pensiones',
--     'siefore básica inicial'
--     → mapean a slugs en consar.cat_siefore vía ALIAS_07_NL_TO_SLUG en ingest
--
--   AGGREGATE (3 valores totales):
--     'activos netos de las siefores'                  → 'act_neto_total_siefores'
--     'activos netos de las siefores básicas'          → 'act_neto_total_basicas'
--     'activo neto total de las siefores adicionales'  → 'act_neto_total_adicionales'
--
-- Sub-variants concat en columna afore (17 strings: xxi banorte 1..10, sura
-- av1/2/3, profuturo cp/lp, banamex av plus, xxi banorte ahorro individual)
-- aparecen ÚNICAMENTE con tipo_recurso='activo neto total de las siefores
-- adicionales' (verificado V4 Fase 1). El ingest los descompone vía
-- consar.afore_siefore_alias antes de insertar en activo_neto.
--
-- Decisión: cuando el CSV reporta el agregado 'adicionales' EN sub-variants
-- (xxi banorte 1..10, sura av1, etc.), esas filas representan el activo neto
-- atómico de (afore_id, siefore_id) ya descompuesto. Por eso van a
-- consar.activo_neto, NO a activo_neto_agg. activo_neto_agg recibe SÓLO
-- los rows con afore canonical/alias + tipo_recurso ∈ los 3 agregados.
--
-- Cobertura esperada (CSV: 9,849 rows, validado byte-exact en local):
--   consar.activo_neto      = 8,509 rows
--      = 7,370 atomic siefore-specific
--      + 1,139 sub-variants concat decompuestos via consar.afore_siefore_alias
--      NULLs: 670 (560 sb 95-99 + 110 sb 55-59 — sparsity estructural por
--             cohorte tardía: algunos afores no reportan esos buckets en
--             todos los meses)
--
--   consar.activo_neto_agg  = 1,340 rows
--      = 670 act_neto_total_basicas    (10 reporting entities × 67 fechas)
--      + 670 act_neto_total_siefores   (10 reporting entities × 67 fechas, todos NON-NULL)
--      + 0   act_neto_total_adicionales
--             (CSV no tiene rows con afore canonical/alias + tipo='adicionales';
--              los 1,139 rows con tipo='adicionales' son TODOS sub-variants,
--              que se decomponen y van a activo_neto)
--
--   "10 reporting entities" en agg: 9 commercial canonical (azteca, banamex,
--   coppel, inbursa, invercap, pensionissste, principal, profuturo, sura)
--   + 1 alias 'xxi-banorte' (con guion). El commercial 'xxi banorte' (sin guion)
--   reporta atomic siefore-specific, no agregados — los agregados de XXI
--   se reportan bajo el alias 'xxi-banorte'. Resuelto vía consar.afore_alias.
--
--   Σ = 8,509 + 1,340 = 9,849 ✓ (matchea CSV total)
--
-- Vigésima migración. Novena de la familia CONSAR (009 schema base, 013 comisiones,
-- 014 flujo_recurso, 015 traspaso, 016 pea_cotizantes, 017 cat_siefore,
-- 018 afore_alias, 019 afore_siefore_alias).
-- =============================================================================

BEGIN;

-- ------------------------------------------------------------------
-- consar.activo_neto: rows atómicos
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.activo_neto (
    afore_id          INTEGER       NOT NULL REFERENCES consar.afores(id)      ON DELETE RESTRICT,
    siefore_id        INTEGER       NOT NULL REFERENCES consar.cat_siefore(id) ON DELETE RESTRICT,
    fecha             DATE          NOT NULL,
    monto_mxn_mm      NUMERIC(14,4),  -- NULLable: sparsity estructural en CSV (sb 95-99 cohorte tardía)
    PRIMARY KEY (afore_id, siefore_id, fecha),
    CONSTRAINT activo_neto_fecha_first_of_month
        CHECK (EXTRACT(DAY FROM fecha) = 1),
    CONSTRAINT activo_neto_monto_nonneg
        CHECK (monto_mxn_mm IS NULL OR monto_mxn_mm >= 0)
);

CREATE INDEX idx_activo_neto_fecha           ON consar.activo_neto(fecha);
CREATE INDEX idx_activo_neto_siefore_fecha   ON consar.activo_neto(siefore_id, fecha);

COMMENT ON TABLE consar.activo_neto IS
    'Activo neto mensual atómico por AFORE × SIEFORE en MXN millones corrientes. '
    'Dataset #07 (datosgob_07_activos_netos.csv) post-decomposition: rows con sub-variant concat '
    'decodificados vía consar.afore_siefore_alias en ingest. '
    'Cobertura 2019-12 → 2025-06 (67 fechas mensuales). '
    'NULLs preservados (sparsity estructural cohorte sb 95-99).';

COMMENT ON COLUMN consar.activo_neto.monto_mxn_mm IS
    'Millones de pesos MXN corrientes (no reales). NULL = no reportado en CSV oficial.';

-- ------------------------------------------------------------------
-- consar.activo_neto_agg: rows agregados (3 categorías)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.activo_neto_agg (
    afore_id          INTEGER       NOT NULL REFERENCES consar.afores(id) ON DELETE RESTRICT,
    categoria         VARCHAR(48)   NOT NULL,
    fecha             DATE          NOT NULL,
    monto_mxn_mm      NUMERIC(14,4),
    PRIMARY KEY (afore_id, categoria, fecha),
    CONSTRAINT activo_neto_agg_categoria_ck
        CHECK (categoria IN (
            'act_neto_total_siefores',
            'act_neto_total_basicas',
            'act_neto_total_adicionales'
        )),
    CONSTRAINT activo_neto_agg_fecha_first_of_month
        CHECK (EXTRACT(DAY FROM fecha) = 1),
    CONSTRAINT activo_neto_agg_monto_nonneg
        CHECK (monto_mxn_mm IS NULL OR monto_mxn_mm >= 0)
);

CREATE INDEX idx_activo_neto_agg_fecha     ON consar.activo_neto_agg(fecha);
CREATE INDEX idx_activo_neto_agg_categoria ON consar.activo_neto_agg(categoria);

COMMENT ON TABLE consar.activo_neto_agg IS
    'Agregados de activo neto reportados directamente en CSV #07 (no recomputados): '
    'act_neto_total_siefores (sistema completo, todos NULL en CSV oficial), '
    'act_neto_total_basicas (suma siefores básicas por afore), '
    'act_neto_total_adicionales (suma siefores adicionales por afore — sub-variants '
    'NO van aquí, se descomponen en activo_neto). Prefijo "act_neto_" en categoria '
    'autoexplica en JOINs cross-tabla cuando aparezcan futuros _agg (rendimiento_sis, etc.).';

COMMIT;

-- =============================================================================
-- Rollback: DROP TABLE consar.activo_neto, consar.activo_neto_agg CASCADE;
-- =============================================================================
