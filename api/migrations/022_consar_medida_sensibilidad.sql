-- =============================================================================
-- Migration 022: CONSAR medida_sensibilidad + cat_metrica_sensibilidad (S16 Sub-fase 6)
-- =============================================================================
--
-- Dataset #03 (datosgob_03_medidas.csv) en formato canónico atomizado long-format.
-- Pivot wide→long: 7,840 rows wide × 7 métricas → ~46,657 rows long (skip empties).
--
--   consar.cat_metrica_sensibilidad   → catálogo de 7 métricas (catálogo derivado)
--   consar.medida_sensibilidad        → fact long-format
--
-- Granularidad: (fecha × afore × siefore × metrica) → 1 valor numérico.
-- NO incluye dim plazo (a diferencia de #10).
--
-- Estructura del CSV original:
--   3 dim: fecha, siefore, afore
--   7 métricas wide-pivoted (cada columna = métrica conceptualmente distinta):
--     coeficiente_liquidez, diferencial_valor_riesgo_condicional_dcvar,
--     error_seguimiento, escenarios_valor_riesgo_var, plazo_promedio_ponderado_ppp,
--     provision_exposicion_instrumentos_derivados_pid, valor_riesgo_var
--
-- Distribución empírica de empties (skip en ingest):
--   - 6 métricas con 1 empty cada una (1 row canonical edge)
--   - error_seguimiento, pid: 1,140 empties = 1 canonical + 1,139 sub-variants
--                              (sub-variants nunca reportan tracking_error ni PID)
--   - escenarios_var: 5,939 empties (76% sparsity incluso en canonical;
--                                     1,139 sub-variants + 4,800 canonical)
--
-- Cobertura esperada (CSV: 7,840 wide rows, validada byte-exact):
--   consar.medida_sensibilidad = ~46,657 long rows
--      = 42,101 canonical (6,701 × 7 - 4,806 empties)
--      + 4,556 sub-variants decompuestos × 4 métricas (CL, DCVaR, PPP, VaR)
--      [los 17 sub-variants reportan exclusivamente 4 de las 7 métricas;
--       sus rows con tracking_error/escenarios_var/PID nunca son non-empty]
--
-- Strings 'afore' del CSV (27 unique):
--   - 10 canonical (azteca, banamex, coppel, inbursa, invercap, pensionissste,
--     principal, profuturo, sura, xxi banorte) — match exact a consar.afores.nombre_csv
--   - 17 sub-variants concat — IDÉNTICOS a #10 (banamex(siav2), profuturo(sac/siav),
--     sura(siav/siav1/siav2), xxi-banorte(siav/sps1..sps10))
--   Reuso 100% de consar.afore_siefore_alias entries con fuente_csv='#10'.
--   No se añaden entries fuente_csv='#03' (mismo mapping lógico, evitar bloat).
--
-- Strings 'siefore' del CSV (12 unique):
--   - 11 siefores reales: "siefore básica 55-59" .. "95-99" + "inicial" + "pensiones"
--     mapean a cat_siefore via ALIAS_03_NL_TO_SLUG en ingest.
--     Atención: "siefore básica pensiones" en #03 vs "siefore básica de pensiones" en #07
--     ambos mapean al mismo slug 'sb_pensiones'.
--   - 1 categoría 'siefores adicionales' (1,139 rows) aparece SOLO con sub-variants.
--     IGNORADA en ingest: el siefore real proviene de afore_siefore_alias decompose.
--     No se añade slug en cat_siefore (a diferencia de #10 que requirió 'agregado_adicionales').
--
-- Decisión metodológica documentada (corrección empírica vs DDL ds3):
--   PID (provision_exposicion_instrumentos_derivados): ds3 etiqueta unidad='monto',
--   evidencia empírica del CSV indica 'pct'. Range [0, 1.75] con granularidad 0.01,
--   Coppel/Inbursa/PensionISSSTE = 0 siempre (no operan derivados), patrón consistente
--   con porcentaje regulatorio del activo expuesto. Producción adopta etiqueta empírica.
--
-- Vigésimo-segunda migración. Décimo-primera de la familia CONSAR.
-- =============================================================================

BEGIN;

-- ------------------------------------------------------------------
-- consar.cat_metrica_sensibilidad: 7 métricas
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.cat_metrica_sensibilidad (
    id              SMALLSERIAL  PRIMARY KEY,
    columna_csv     VARCHAR(80)  NOT NULL UNIQUE,
    slug            VARCHAR(40)  NOT NULL UNIQUE,
    descripcion     TEXT         NOT NULL,
    unidad          VARCHAR(16)  NOT NULL,
    orden_display   INTEGER      NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT cat_metrica_sensibilidad_unidad_ck
        CHECK (unidad IN ('ratio', 'pct', 'count', 'dias'))
);

CREATE INDEX idx_cat_metrica_sensibilidad_slug ON consar.cat_metrica_sensibilidad(slug);

COMMENT ON TABLE consar.cat_metrica_sensibilidad IS
    'Catálogo de 7 métricas de sensibilidad regulatoria reportadas en dataset #03 '
    '(datosgob_03_medidas.csv). Análogo a ds3.ds3_cat_metrica_sensibilidad pero con '
    'slug canónico adicional (ds3 sólo tiene columna_csv). Unidad PID corregida '
    'empíricamente: ds3 dice ''monto'', evidencia indica ''pct'' (%) del activo expuesto.';

COMMENT ON COLUMN consar.cat_metrica_sensibilidad.columna_csv IS
    'Nombre exacto de la columna en CSV crudo #03. Match byte-exact requerido en ingest.';

COMMENT ON COLUMN consar.cat_metrica_sensibilidad.slug IS
    'Slug canónico corto para queries API. NO incluido en ds3 — adición S16 Sub-fase 6.';

COMMENT ON COLUMN consar.cat_metrica_sensibilidad.unidad IS
    'ratio: número adimensional sin techo (coef_liquidez observa hasta 89.44). '
    'pct: porcentaje (0-100, valores típicos <10). '
    'count: contador entero (escenarios_var ∈ [0, 25]). '
    'dias: días naturales (ppp ∈ [26, 6783]).';

INSERT INTO consar.cat_metrica_sensibilidad (columna_csv, slug, descripcion, unidad, orden_display) VALUES
    ('coeficiente_liquidez',
     'coef_liquidez',
     'Coeficiente de liquidez del portafolio (regulatorio CONSAR). Range observado [-0.07, 89.44].',
     'ratio', 1),

    ('diferencial_valor_riesgo_condicional_dcvar',
     'dcvar',
     'Diferencial del valor en riesgo condicional (DCVaR) — diferencia entre CVaR y VaR. Range observado [-0.20, 1.07]%.',
     'pct', 2),

    ('error_seguimiento',
     'tracking_error',
     'Error de seguimiento (tracking error) vs benchmark regulatorio. Range observado [0, 9.28]%. NO reportado por sub-variants (1,139 NULLs).',
     'pct', 3),

    ('escenarios_valor_riesgo_var',
     'escenarios_var',
     'Cantidad de escenarios stress-test bajo umbral regulatorio (entero). Range observado [0, 25] escenarios. Sparsity alta (76%) incluso en canonical; NO reportado por sub-variants.',
     'count', 4),

    ('plazo_promedio_ponderado_ppp',
     'ppp',
     'Plazo promedio ponderado del portafolio (PPP) en días naturales. Range observado [26, 6783] días (~74 días a 18.6 años).',
     'dias', 5),

    -- pid: corrección empírica vs ds3 ('monto' → 'pct'). Justificación:
    -- Range [0, 1.75] con granularidad 0.01, Coppel/Inbursa/PensionISSSTE = 0 siempre
    -- (no operan derivados). Patrón consistente con porcentaje regulatorio del activo
    -- expuesto, NO con monto absoluto en MM MXN. Si fuera monto, una afore con $100,000mm
    -- en activos reportar 0.5 sería absurdo. ds3 etiqueta 'monto' por conjetura sin
    -- verificación; producción corrige empíricamente.
    ('provision_exposicion_instrumentos_derivados_pid',
     'pid',
     'Provisión por exposición a instrumentos derivados (PID) como porcentaje del activo. Range observado [0, 1.75]%. Coppel/Inbursa/PensionISSSTE = 0 siempre (no operan derivados). NO reportado por sub-variants. Corregido vs ds3 que etiqueta ''monto'' (asunción no verificada).',
     'pct', 6),

    ('valor_riesgo_var',
     'var',
     'Valor en riesgo (VaR) regulatorio del portafolio. Range observado [0, 1.37]%.',
     'pct', 7);

-- ------------------------------------------------------------------
-- consar.medida_sensibilidad: long-format fact table
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.medida_sensibilidad (
    fecha       DATE          NOT NULL,
    afore_id    INTEGER       NOT NULL REFERENCES consar.afores(id)                  ON DELETE RESTRICT,
    siefore_id  INTEGER       NOT NULL REFERENCES consar.cat_siefore(id)             ON DELETE RESTRICT,
    metrica_id  SMALLINT      NOT NULL REFERENCES consar.cat_metrica_sensibilidad(id) ON DELETE RESTRICT,
    valor       NUMERIC(14,4) NOT NULL,
    PRIMARY KEY (fecha, afore_id, siefore_id, metrica_id),
    CONSTRAINT medida_sensibilidad_fecha_first_of_month
        CHECK (EXTRACT(DAY FROM fecha) = 1)
);

CREATE INDEX idx_medida_sensibilidad_afore_metrica   ON consar.medida_sensibilidad(afore_id, metrica_id, fecha);
CREATE INDEX idx_medida_sensibilidad_siefore_metrica ON consar.medida_sensibilidad(siefore_id, metrica_id, fecha);
CREATE INDEX idx_medida_sensibilidad_metrica_fecha   ON consar.medida_sensibilidad(metrica_id, fecha);

COMMENT ON TABLE consar.medida_sensibilidad IS
    'Medidas de sensibilidad regulatoria mensual long-format por (AFORE × SIEFORE × MÉTRICA). '
    'Dataset #03 (datosgob_03_medidas.csv) post-pivot wide→long: cada fila wide CSV genera '
    'hasta 7 filas long (una por métrica con valor non-empty). Sub-variants concat '
    '(banamex(siav2), profuturo(sac/siav), sura(siav/siav1/siav2), xxi-banorte(siav/sps1..sps10)) '
    'decompuestos vía consar.afore_siefore_alias (reuso fuente_csv=#10). '
    'Cobertura 2019-12 → 2025-06 (67 fechas mensuales). '
    'Skip empties: solo se inserta cuando valor != '''' en CSV (NOT NULL constraint).';

COMMENT ON COLUMN consar.medida_sensibilidad.valor IS
    'Valor numérico de la métrica. Unidad determinada por metrica_id: '
    'ratio (coef_liquidez), pct (dcvar/tracking_error/pid/var), '
    'count (escenarios_var), dias (ppp). Ver cat_metrica_sensibilidad.unidad.';

COMMIT;

-- =============================================================================
-- Rollback:
--   DROP TABLE consar.medida_sensibilidad CASCADE;
--   DROP TABLE consar.cat_metrica_sensibilidad CASCADE;
-- =============================================================================
