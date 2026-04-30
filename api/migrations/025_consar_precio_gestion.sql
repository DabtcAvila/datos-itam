-- =============================================================================
-- Migration 025: CONSAR precio_gestion (S16 Sub-fase 9)
-- =============================================================================
--
-- Dataset #11 (datosgob_11_precios_gestion_siefores.csv) — schema atomic puro.
-- Hermana directa de #01 (precio_bolsa, mig 024). Mismo shape (4 cols), mismo
-- pattern atomic-only sin agg/pivots/sub-variants.
--
--   consar.precio_gestion → fact atomic, 588,317 rows
--
-- Granularidad: (fecha × afore × siefore) → 1 precio (gestión interna). PK 3-tupla.
-- NO agg table (CSV no tiene sentinels). NO sub-variants concat.
--
-- Estructura del CSV:
--   4 cols: fecha (DATE diaria de mercado), afore (string), siefore (string),
--           precio (NUMERIC).
--   1 empty precio (row 120594 = 2015-08-12/citibanamex/siav). Skip empírico.
--   588,318 rows totales en CSV → 588,317 efectivos.
--
-- Cobertura temporal: 1997-01-07 → 2025-12-06 (28+ años, 7,060 fechas distintas).
-- 1 fecha extra vs #01: 1997-01-07 (solo xxi/sb5 row inicial — XXI legacy
-- arrancó 1 día antes que el resto del SAR).
--
-- Strings 'afore' del CSV (11 unique → 10 afore_ids post-merge):
--   - 8 commercial directos (azteca, coppel, inbursa, invercap, principal,
--     profuturo, sura, banamex) — match exact a consar.afores.nombre_csv
--   - banamex + citibanamex → MERGE bajo afore_id=3 (validado disjoint en
--     #01 a 635K rows + ahora #11 a 588K rows). Empíricamente:
--       * banamex (56,568 rows): 10 siefores (sb 1000, 60-64, 65-69, 70-74,
--         75-79, 80-84, 85-89, 90-94, 95-99, sb0)
--       * citibanamex (10,642 rows): SOLO sb 55-59 + siav (2 disjoint)
--       * Shared (afore_id=3, siefore, fecha) tuples: 0 → merge sin colisión.
--     Pattern arquitectural sólido a 70× volumen vs #07.
--   - xxi-banorte (alias guion) → afore_id=2 (101,394 rows, 1997-01-08+).
--   - xxi (legacy standalone, alias en consar.afore_alias) → afore_id=2.
--     Cobertura 1997-01-07 → 2012-12-01 (3,664 fechas). Asociado EXCLUSIVAMENTE
--     a siefore sb5. xxi+xxi-banorte disjoint perfecto en siefore: xxi cubre
--     sb5 ÚNICA, xxi-banorte cubre 17 siefores ≠ sb5. 0 PK colisiones bajo afore_id=2.
--
-- Strings 'siefore' del CSV (24 unique):
--   - 9 SB edad (sb 55-59 a sb 95-99) — slugs canónicos
--   - sb 1000 (basica_pensionados legacy), sb0 (basica_inicial)
--   - sb5 (basica_legacy XXI ≤2012) — usado SOLO por afore xxi en #11
--   - sac (cuenta_administrada), siav (ahorro_voluntario)
--   - sps1..sps10 (previsional_social)
--   Todos los 24 slugs ya existen en consar.cat_siefore (28 entries; las 4 no
--   usadas son siav1, siav2, sb_pensiones, agregado_adicionales).
--   ZERO catálogos nuevos requeridos. Reuso 100%.
--
-- Decisiones arquitecturales Sub-fase 9 (heredadas de #01):
--   D1: Schema atomic-only (sin agg) — CSV no tiene sentinels.
--   D2: NUMERIC(20,8) compat ds3 + safety margin.
--       Range empírico [0.506404, 24.853032] con max 6 decimales observados.
--       Max NAV +30% vs #01 (cohorte distinta capitaliza más en gestión).
--   D3: Merge banamex+citibanamex bajo afore_id=3 (validado disjoint a 588K rows).
--   D4: NO check first_of_month (granularidad diaria de mercado).
--   D5: Skip 1 empty precio (row 120594) — atomic NOT NULL preserva integridad.
--   D6: xxi (legacy) y xxi-banorte resueltos a afore_id=2 vía afore_alias.
--       Disjoint en siefore (xxi=sb5 ÚNICA, xxi-banorte=17 siefores ≠ sb5).
--   D7: Ingest BATCH=200 INSERT VALUES via psql -f tempfile (pattern Sub-fase 7+8).
--       Streaming SSL writes a Neon ahogan (ver feedback_neon_streaming_writes_unreliable).
--       ~30 min para 588K rows. Deterministic + retry resilient.
--
-- Hallazgo descriptivo (S13 disciplina, NO interpretativo):
--   Range NAV [0.506404, 24.853032] cubre 28+ años de evolución del SAR en
--   precios de gestión interna. Min observado 0.506404 corresponde a SIEFORE
--   específica (probable SAC/SIAV o SPS inicial, NAV pre-rendimiento). Max
--   24.853032 representa cohorte madura con décadas de capitalización
--   (significativamente superior al max 19.045541 de #01 precio_bolsa, lo cual
--   sugiere distinta base/comisión entre ambas series).
--
-- Validación cruzada arquitectural Sub-fase 9 (2do dataset volumen alto):
--   - 0 PK collisions en 588,318 rows post-resolución alias (588,317 efectivos
--     + 1 empty skip).
--   - Merge XXI/XXI-Banorte: disjoint perfecto en siefore (sb5 vs 17 siefores).
--   - Merge banamex/citibanamex: disjoint perfecto en siefore (10 vs 2).
--   - 2× validación independiente del modelo de aliases en datasets diarios
--     600K+ rows (junto a #01).
--   - Pattern arquitectural sólido confirmado a 70× volumen vs #07 (9K rows).
--
-- Cobertura esperada post-INGEST:
--   consar.precio_gestion = 588,317 atomic rows (588,318 CSV − 1 empty skip)
--   Distribución por afore_id (post-merge xxi+xxi-banorte y banamex+citibanamex):
--     id=2 (xxi_banorte+xxi):    101,394 + 3,664 = 105,058
--     id=1 (profuturo):                            74,694
--     id=3 (banamex+citibanamex): 56,568 + 10,642 = 67,210
--     id=4 (sura):                                 63,406
--     id=8 (principal):                            63,406
--     id=10 (inbursa):                             63,406
--     id=7 (azteca):                               53,382
--     id=9 (invercap):                             49,917
--     id=5 (coppel):                               47,838
--     id=6 (pensionissste):                         0      (NO aparece en #11)
--   Total = 105,058 + 74,694 + 67,210 + 63,406×3 + 53,382 + 49,917 + 47,838 = 588,317.
--   114 pares distintos (afore_id, siefore_id).
--
-- Vigésimo-quinta migración. Décimo-cuarta de la familia CONSAR.
-- =============================================================================

BEGIN;

-- ------------------------------------------------------------------
-- consar.precio_gestion: atomic fact diario
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.precio_gestion (
    fecha       DATE          NOT NULL,
    afore_id    INTEGER       NOT NULL REFERENCES consar.afores(id)       ON DELETE RESTRICT,
    siefore_id  INTEGER       NOT NULL REFERENCES consar.cat_siefore(id)  ON DELETE RESTRICT,
    precio      NUMERIC(20,8) NOT NULL,
    PRIMARY KEY (fecha, afore_id, siefore_id)
);

CREATE INDEX idx_precio_gestion_afore_siefore ON consar.precio_gestion(afore_id, siefore_id, fecha);
CREATE INDEX idx_precio_gestion_siefore_fecha ON consar.precio_gestion(siefore_id, fecha);

COMMENT ON TABLE consar.precio_gestion IS
    'Precios diarios (gestión interna) de SIEFOREs por AFORE. Dataset #11 '
    '(datosgob_11_precios_gestion_siefores.csv). Schema atomic puro: 1 row por '
    '(fecha × afore × siefore). 588,317 rows efectivos (588,318 CSV − 1 empty). '
    'Cobertura diaria 1997-01-07 → 2025-12-06 (28+ años, 7,060 fechas distintas). '
    'NO sub-variants concat (siefores aparecen LIMPIAS, distinto a #07/#10/#03). '
    'NO agg table (CSV no tiene sentinels). 114 pares distintos (afore_id, siefore_id). '
    'Strings citibanamex (alias rebrand), xxi-banorte (alias guion) y xxi (legacy '
    'standalone ≤2012) se resuelven vía consar.afore_alias. Merge xxi+xxi-banorte '
    'bajo afore_id=2 validado disjoint en siefore: xxi cubre sb5 únicamente, '
    'xxi-banorte cubre 17 siefores ≠ sb5. Merge banamex+citibanamex bajo afore_id=3 '
    'validado disjoint en siefore: banamex 10 siefores, citibanamex 2 disjoint '
    '(sb 55-59, siav). Shared siefores: ∅. PK collisions: 0 (validado a 588K rows). '
    'Pattern arquitectural sólido confirmado a 70× volumen vs #07 (junto con #01). '
    'NO incluye PensionISSSTE (afore_id=6) — el dataset CONSAR #11 no reporta '
    'precio de gestión para esta afore pública. Diferencia estructural vs #01.';

COMMENT ON COLUMN consar.precio_gestion.precio IS
    'Precio de gestión interna en MXN. Range empírico observado [0.506404, 24.853032] '
    'con max 6 decimales. NUMERIC(20,8) overkill empírico pero mantenido por compat '
    'DDL ds3 + safety margin si CONSAR incrementa precisión. Max NAV +30% vs #01 '
    'precio_bolsa (19.045541) — sugiere distinta base/comisión entre serie de '
    'precio bolsa y serie de gestión interna. Hallazgo descriptivo, NO interpretativo.';

COMMIT;

-- =============================================================================
-- Rollback:
--   DROP TABLE consar.precio_gestion CASCADE;
-- =============================================================================
