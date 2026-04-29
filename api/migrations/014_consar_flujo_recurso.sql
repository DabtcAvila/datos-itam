-- =============================================================================
-- Migration 014: CONSAR flujo_recurso schema (dataset #04)
-- =============================================================================
--
-- Extends consar.* with monthly cash flow per AFORE: entries (montos_entradas,
-- aportaciones brutas que llegan a la AFORE) and exits (montos_salidas, retiros
-- por jubilación, traspasos cedidos, otros). Third CONSAR fact table after
-- recursos_mensuales (009) and comisiones (013).
--
-- Source: datos.gob.mx / CONSAR
--   File: datosgob_04_entradas_salidas.csv
--   MD5: 1100022826c117e0f10f7794f34b0e04
--   License: CC-BY-4.0
--   Coverage: 2009-01-01 → 2025-06-01 (198 months × 10 AFOREs = 1,980 rows)
--   Shape: rectangular, no empty cells. All rows ingested.
--
-- Pension Bienestar (FPB9) excluded by design (régimen administrativo
-- diferenciado, ya documentado en S10/consar.py).
--
-- Mirrors DDL canónico ds3.ds3_flujo_recurso (S16 architectural decision: prod
-- preserves operational schema, ds3 is academic deliverable).
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS consar.flujo_recurso CASCADE;

CREATE TABLE consar.flujo_recurso (
    fecha            DATE          NOT NULL,
    afore_id         INTEGER       NOT NULL REFERENCES consar.afores(id) ON DELETE RESTRICT,
    montos_entradas  NUMERIC(20,4) NOT NULL,
    montos_salidas   NUMERIC(20,4) NOT NULL,
    PRIMARY KEY (fecha, afore_id),
    CONSTRAINT flujo_fecha_first_of_month
        CHECK (EXTRACT(DAY FROM fecha) = 1),
    CONSTRAINT flujo_montos_no_neg
        CHECK (montos_entradas >= 0 AND montos_salidas >= 0)
);

COMMENT ON TABLE consar.flujo_recurso IS
    'Flujo mensual de recursos por AFORE: entradas (aportaciones brutas) y salidas (retiros, traspasos cedidos, otros). Cobertura 2009-01 a 2025-06. Pensión Bienestar excluida (régimen administrativo diferenciado).';

COMMENT ON COLUMN consar.flujo_recurso.montos_entradas IS
    'Millones de pesos MXN corrientes que ingresaron a la AFORE en el mes (aportaciones obrero-patronales, voluntarias, traspasos recibidos).';

COMMENT ON COLUMN consar.flujo_recurso.montos_salidas IS
    'Millones de pesos MXN corrientes que salieron de la AFORE en el mes (retiros por jubilación/desempleo/matrimonio, traspasos cedidos, gastos administrativos).';

CREATE INDEX idx_consar_flujo_afore_fecha ON consar.flujo_recurso(afore_id, fecha);

COMMIT;

-- =============================================================================
-- Rollback: DROP TABLE consar.flujo_recurso CASCADE;
-- =============================================================================
