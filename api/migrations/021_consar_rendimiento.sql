-- =============================================================================
-- Migration 021: CONSAR rendimiento + rendimiento_sis (S16 Sub-fase 5)
-- =============================================================================
--
-- Dataset #10 (datosgob_10_rendimientos_precio_bolsa.csv) en formato canónico
-- atomizado (Opción D, S16). Pattern análogo a #07 (mig 020) extendido con
-- dim adicional `plazo` (5 valores: 12_meses, 24_meses, 36_meses, 5_anios,
-- historico).
--
--   consar.rendimiento      → rows atómicos (afore × siefore × fecha × plazo)
--   consar.rendimiento_sis  → rows agregados inter-afore (siefore × fecha × plazo)
--
-- Distinción clave vs #07 activo_neto_agg:
--   activo_neto_agg es agregado INTRA-afore (cada afore reporta totales propios,
--                  PK incluye afore_id; suma de siefores básicas / adicionales).
--   rendimiento_sis es agregado INTER-afore (sistema completo, sin afore_id;
--                  promedio ponderado CONSAR sobre todas las afores que ofrecen
--                  cada siefore). Conceptualmente distinto, schema distinto.
--
-- Distinción atomic vs system-agg en CSV original:
--   ATOMIC (35,041 - 3,015 = 32,026 rows):
--     - 27,470 rows con afore canonical (10 afores × 11 tipo_recurso × N fechas × N plazos)
--                tipo_recurso ∈ {sb 55-59 .. sb 95-99, sb 1000, sb_pensiones}
--                NUNCA con tipo_recurso='adicionales promedio ponderado' (canonical no reportan)
--     - 4,556 rows con afore sub-variant concat (17 strings)
--                tipo_recurso = 'adicionales promedio ponderado' SIEMPRE
--                Decompuestos vía consar.afore_siefore_alias (fuente_csv='#10')
--                → 17 entries: banamex(siav2), profuturo(sac/siav), sura(siav/siav1/siav2),
--                  xxi-banorte(siav/sps1..sps10)
--
--   SYSTEM-AGG (3,015 rows): afore == tipo_recurso (12 strings system-aggregate)
--     11 mapean a siefore real en cat_siefore (sb 55-59 .. 95-99, sb 1000, sb_pensiones)
--     1  mapea a 'agregado_adicionales' (slug nuevo, categoría 'sistema_agregado')
--
-- Cobertura esperada (CSV: 35,041 rows, validado byte-exact en local):
--   consar.rendimiento      = 32,026 rows
--      = 27,470 atomic canonical
--      + 4,556  sub-variants concat decompuestos
--      todos NON-NULL (sin sparsity en monto — rendimiento siempre reportado)
--
--   consar.rendimiento_sis  = 3,015 rows
--      = 12 system-aggregates × ~268 rows c/u (4 plazos × 67 fechas, ajustado por sparsity)
--      Sparsity por cohorte tardía: sb 95-99 sólo 484 rows, sb 55-59 2,464 rows;
--      'historico' sólo aplica a sb 60-64 (decisión metodológica CONSAR — única
--      siefore con serie histórica antes de reforma generacional 2019).
--
--   Σ = 32,026 + 3,015 = 35,041 ✓ (matchea CSV total)
--
-- Cambios necesarios al catálogo:
--   1. Extender CHECK consar.cat_siefore.categoria con 'sistema_agregado' (8va categoría)
--   2. INSERT 1 entry: ('agregado_adicionales', 'sistema_agregado'), orden_display=28
--   Decisión NO migrar #07 retroactivamente: act_neto_total_basicas/_siefores/_adicionales
--   son agregados INTRA-afore (PK incluye afore_id), conceptualmente distintos del
--   agregado INTER-afore de #10. Mantienen schemas distintos.
--
-- Vigésimo-primera migración. Décima de la familia CONSAR (009/013/014/015/016/
-- 017/018/019/020).
-- =============================================================================

BEGIN;

-- ------------------------------------------------------------------
-- Paso 1: extender consar.cat_siefore para acomodar agregado del sistema
-- ------------------------------------------------------------------

ALTER TABLE consar.cat_siefore DROP CONSTRAINT cat_siefore_categoria_ck;

ALTER TABLE consar.cat_siefore ADD CONSTRAINT cat_siefore_categoria_ck
    CHECK (categoria IN (
        'basica_edad',
        'basica_pensionados',
        'basica_inicial',
        'basica_legacy',
        'cuenta_administrada',
        'ahorro_voluntario',
        'previsional_social',
        'sistema_agregado'
    ));

INSERT INTO consar.cat_siefore (slug, nombre, categoria, descripcion, vigente, orden_display) VALUES
    ('agregado_adicionales',
     'Agregado del Sistema: Productos Adicionales',
     'sistema_agregado',
     'Promedio ponderado del sistema sobre los 17 productos adicionales (SAC, SIAV, SIAV1, SIAV2, SPS1..SPS10). NO es siefore individual: es agregado computado por CONSAR sobre los productos no-básicos del sistema completo. Reportado en #10 como tipo_recurso=''adicionales promedio ponderado'' con afore=tipo_recurso (system-aggregate). Slug con prefijo ''agregado_'' previene confusión con siefores reales en queries analíticas.',
     TRUE, 28);

COMMENT ON COLUMN consar.cat_siefore.categoria IS
    'basica_edad: 9 generacionales por edad (régimen reforma 2019). '
    'basica_pensionados: sb 1000 (con precio bolsa) y sb_pensiones (sin precio bolsa, sólo activo_neto/rendimiento). '
    'basica_inicial: sb0 (cuentas en transición). '
    'basica_legacy: sb5 (régimen pre-reforma 2019, sólo afore XXI ≤2012). '
    'cuenta_administrada: sac. '
    'ahorro_voluntario: siav, siav1, siav2. '
    'previsional_social: sps1..sps10 (cuentas corporativas XXI-Banorte). '
    'sistema_agregado: agregados inter-afore reportados por CONSAR (no son siefores individuales). '
    'Filtrar con `categoria != ''sistema_agregado''` para "solo siefores reales".';

-- ------------------------------------------------------------------
-- Paso 2a: consar.rendimiento (atomic afore × siefore × fecha × plazo)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.rendimiento (
    afore_id        INTEGER       NOT NULL REFERENCES consar.afores(id)      ON DELETE RESTRICT,
    siefore_id      INTEGER       NOT NULL REFERENCES consar.cat_siefore(id) ON DELETE RESTRICT,
    fecha           DATE          NOT NULL,
    plazo           VARCHAR(16)   NOT NULL,
    rendimiento_pct NUMERIC(8,4)  NOT NULL,
    PRIMARY KEY (afore_id, siefore_id, fecha, plazo),
    CONSTRAINT rendimiento_plazo_ck
        CHECK (plazo IN ('12_meses', '24_meses', '36_meses', '5_anios', 'historico')),
    CONSTRAINT rendimiento_fecha_first_of_month
        CHECK (EXTRACT(DAY FROM fecha) = 1)
);

CREATE INDEX idx_rendimiento_fecha           ON consar.rendimiento(fecha);
CREATE INDEX idx_rendimiento_siefore_fecha   ON consar.rendimiento(siefore_id, fecha);
CREATE INDEX idx_rendimiento_plazo_fecha     ON consar.rendimiento(plazo, fecha);

COMMENT ON TABLE consar.rendimiento IS
    'Rendimiento mensual atómico por AFORE × SIEFORE × PLAZO en porcentaje anualizado. '
    'Dataset #10 (datosgob_10_rendimientos_precio_bolsa.csv) post-decomposition: rows con '
    'sub-variant concat (banamex/profuturo/sura/xxi-banorte para SIAV/SAC/SPS) decodificados '
    'vía consar.afore_siefore_alias (fuente_csv=#10) en ingest. '
    'Cobertura 2019-12 → 2025-06 (67 fechas mensuales) × 5 plazos (12/24/36 meses, 5 años, historico). '
    'plazo=historico solo poblado para sb 60-64 (decisión metodológica CONSAR).';

COMMENT ON COLUMN consar.rendimiento.rendimiento_pct IS
    'Porcentaje anualizado de rendimiento neto. Range observado [-11.47%, +27.17%]. '
    'NULLs no esperados (CSV sin sparsity en monto).';

COMMENT ON COLUMN consar.rendimiento.plazo IS
    'Ventana temporal sobre la que se calcula el rendimiento anualizado: '
    '12_meses, 24_meses, 36_meses (rolling). 5_anios (rolling 60 meses). '
    'historico (rendimiento histórico desde inicio del SAR; sólo publicado para sb 60-64).';

-- ------------------------------------------------------------------
-- Paso 2b: consar.rendimiento_sis (system-aggregate inter-afore)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.rendimiento_sis (
    siefore_id      INTEGER       NOT NULL REFERENCES consar.cat_siefore(id) ON DELETE RESTRICT,
    fecha           DATE          NOT NULL,
    plazo           VARCHAR(16)   NOT NULL,
    rendimiento_pct NUMERIC(8,4)  NOT NULL,
    PRIMARY KEY (siefore_id, fecha, plazo),
    CONSTRAINT rendimiento_sis_plazo_ck
        CHECK (plazo IN ('12_meses', '24_meses', '36_meses', '5_anios', 'historico')),
    CONSTRAINT rendimiento_sis_fecha_first_of_month
        CHECK (EXTRACT(DAY FROM fecha) = 1)
);

CREATE INDEX idx_rendimiento_sis_fecha       ON consar.rendimiento_sis(fecha);
CREATE INDEX idx_rendimiento_sis_plazo_fecha ON consar.rendimiento_sis(plazo, fecha);

COMMENT ON TABLE consar.rendimiento_sis IS
    'Rendimiento agregado del sistema (INTER-afore) por SIEFORE × PLAZO en porcentaje anualizado. '
    'Distinto de consar.activo_neto_agg que es agregado INTRA-afore (PK incluye afore_id). '
    'rendimiento_sis es promedio ponderado CONSAR sobre todas las afores que ofrecen cada siefore. '
    'Reportado directamente en CSV #10 (no recomputado): rows donde afore == tipo_recurso. '
    '12 system-aggregates: 11 mapean a siefores reales (sb 55-59..95-99, sb 1000, sb_pensiones), '
    '1 mapea a slug ''agregado_adicionales'' (categoría sistema_agregado).';

COMMIT;

-- =============================================================================
-- Rollback:
--   DROP TABLE consar.rendimiento, consar.rendimiento_sis CASCADE;
--   DELETE FROM consar.cat_siefore WHERE slug = 'agregado_adicionales';
--   ALTER TABLE consar.cat_siefore DROP CONSTRAINT cat_siefore_categoria_ck;
--   ALTER TABLE consar.cat_siefore ADD CONSTRAINT cat_siefore_categoria_ck
--     CHECK (categoria IN ('basica_edad','basica_pensionados','basica_inicial','basica_legacy',
--                          'cuenta_administrada','ahorro_voluntario','previsional_social'));
-- =============================================================================
