-- =============================================================================
-- Migration 024: CONSAR precio_bolsa (S16 Sub-fase 8)
-- =============================================================================
--
-- Dataset #01 (datosgob_01_precios_bolsa_siefores.csv) — schema atomic puro.
-- Cobertura más profunda del proyecto: 28 años diarios.
--
--   consar.precio_bolsa  → fact atomic, 635,167 rows
--
-- Granularidad: (fecha × afore × siefore) → 1 precio NAV. PK 3-tupla.
-- NO agg table (CSV no tiene sentinels). NO sub-variants concat (siefores
-- aparecen LIMPIAS, distinto a #07/#10/#03).
--
-- Estructura del CSV:
--   4 cols: fecha (DATE diaria de mercado), afore (string), siefore (string),
--           precio (NUMERIC NAV).
--   0 empty precio. 0 skip-empty necesario.
--
-- Cobertura temporal: 1997-01-08 → 2025-12-06 (7,059 fechas hábiles M-V + algunos
-- weekends de reporting). Granularidad diaria de mercado.
--
-- Strings 'afore' del CSV (11 unique → 10 afore_ids post-merge):
--   - 9 commercial directos (azteca, coppel, inbursa, invercap, pensionissste,
--     principal, profuturo, sura) — match exact a consar.afores.nombre_csv
--   - banamex (commercial directo) + citibanamex (alias rebrand) → MERGE bajo
--     afore_id=3. Empíricamente disjoint en (fecha × siefore):
--       * banamex: 56,572 rows × 10 siefores (sb 1000, 60-64, 65-69, 70-74,
--         75-79, 80-84, 85-89, 90-94, 95-99, sb0)
--       * citibanamex: 10,643 rows × 2 siefores (sb 55-59, siav)
--       * Shared siefores: ∅. PK collisions: 0.
--     Esto refuerza decisión Sub-fase 1-3: citibanamex es alias del mismo afore
--     comercial (continuidad de series 1997+). Validado empíricamente en #07,
--     ahora también en #01.
--   - xxi-banorte (con guion, alias en consar.afore_alias) → afore_id=2.
--     En #01 SIEMPRE aparece con guion (101,394 rows); nunca 'xxi banorte' sin guion.
--
-- Strings 'siefore' del CSV (25 unique):
--   - 9 SB edad (sb 55-59 a sb 95-99) — slugs canónicos
--   - sb 1000 (basica_pensionados legacy), sb0 (basica_inicial)
--   - sac (cuenta_administrada), siav/siav1/siav2 (ahorro_voluntario)
--   - sps1..sps10 (previsional_social)
--   Todos los 25 slugs ya existen en consar.cat_siefore (28 entries; las 3 no
--   usadas son sb_pensiones [#03], sb5 [#11 legacy], agregado_adicionales [#10]).
--   ZERO catálogos nuevos requeridos.
--
-- Decisiones arquitecturales Sub-fase 8:
--   D1: Schema atomic-only (sin agg) — CSV no tiene sentinels.
--   D2: NUMERIC(20,8) compat ds3 + safety margin.
--       Range empírico [0.560568, 19.045541] con max 6 decimales observados.
--       Storage overhead trivial vs riesgo truncamiento si CONSAR aumenta precisión.
--   D3: Merge banamex+citibanamex bajo afore_id=3 (validado disjoint).
--   D4: NO check first_of_month (granularidad diaria de mercado).
--   D7: Ingest vía COPY FROM (psql \copy client-side sobre TSV tempfile) —
--       1 transacción vs 3,175 batches INSERT, factor ~3000× más eficiente.
--       Decisión obligatoria David post-#05 catch operacional.
--
-- Hallazgo descriptivo (S13 disciplina, NO interpretativo):
--   Range NAV [0.560568, 19.045541] cubre 28 años de evolución del SAR.
--   Min observado 0.560568 corresponde a SIEFORE específica (probable SAC/SIAV
--   inicial, NAV pre-rendimiento). Max 19.045541 representa cohorte madura con
--   décadas de capitalización.
--
-- Cobertura esperada post-COPY:
--   consar.precio_bolsa = 635,167 atomic rows
--   Distribución por afore_id (post-merge):
--     id=2 (xxi_banorte): 101,394   id=4 (sura): 73,468
--     id=1 (profuturo):    68,476   id=3 (banamex):   67,215
--     id=8 (principal):    63,410   id=10 (inbursa):  63,410
--     id=7 (azteca):       53,386   id=9 (invercap):  49,921
--     id=5 (coppel):       47,842   id=6 (pensionissste): 46,645
--   126 pares distintos (afore_id, siefore_id).
--
-- Vigésimo-cuarta migración. Décimo-tercera de la familia CONSAR.
-- =============================================================================

BEGIN;

-- ------------------------------------------------------------------
-- consar.precio_bolsa: atomic fact diario
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consar.precio_bolsa (
    fecha       DATE          NOT NULL,
    afore_id    INTEGER       NOT NULL REFERENCES consar.afores(id)       ON DELETE RESTRICT,
    siefore_id  INTEGER       NOT NULL REFERENCES consar.cat_siefore(id)  ON DELETE RESTRICT,
    precio      NUMERIC(20,8) NOT NULL,
    PRIMARY KEY (fecha, afore_id, siefore_id)
);

CREATE INDEX idx_precio_bolsa_afore_siefore ON consar.precio_bolsa(afore_id, siefore_id, fecha);
CREATE INDEX idx_precio_bolsa_siefore_fecha ON consar.precio_bolsa(siefore_id, fecha);

COMMENT ON TABLE consar.precio_bolsa IS
    'Precios diarios NAV (Net Asset Value) de SIEFOREs por AFORE. Dataset #01 '
    '(datosgob_01_precios_bolsa_siefores.csv). Schema atomic puro: 1 row por '
    '(fecha × afore × siefore). 635,167 rows totales. '
    'Cobertura más profunda del proyecto: 1997-01-08 → 2025-12-06 (28 años, '
    '7,059 fechas distintas, granularidad diaria de mercado M-V + algunos weekends). '
    'NO sub-variants concat (siefores aparecen LIMPIAS, distinto a #07/#10/#03). '
    'NO agg table (CSV no tiene sentinels). 126 pares distintos (afore_id, siefore_id). '
    'Strings citibanamex (alias rebrand) y xxi-banorte (alias guion) se resuelven '
    'vía consar.afore_alias a afore_id=3 y afore_id=2 respectivamente. Merge '
    'banamex+citibanamex validado empíricamente disjoint en (fecha × siefore): '
    'banamex reporta 10 siefores, citibanamex reporta las otras 2 (sb 55-59, siav). '
    'Shared siefores: ∅. PK collisions: 0. Refuerza decisión Sub-fase 1-3 de '
    'tratar citibanamex como alias del mismo afore comercial.';

COMMENT ON COLUMN consar.precio_bolsa.precio IS
    'NAV (Net Asset Value) en MXN. Range empírico observado [0.560568, 19.045541] '
    'con max 6 decimales. NUMERIC(20,8) overkill empírico (12 dígitos enteros vs '
    '~2 observados) pero mantenido por compat DDL ds3 + safety margin si CONSAR '
    'incrementa precisión en futuro. Storage overhead trivial vs riesgo truncamiento.';

COMMIT;

-- =============================================================================
-- Rollback:
--   DROP TABLE consar.precio_bolsa CASCADE;
-- =============================================================================
