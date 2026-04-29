-- =============================================================================
-- Migration 013: CONSAR comisiones schema (dataset #06)
-- =============================================================================
--
-- Extends the consar.* namespace with the monthly fee (comisión) charged by
-- each AFORE to the worker as % of saldo administrado. Second CONSAR fact
-- table after recursos_mensuales (migration 009).
--
-- Source: datos.gob.mx / CONSAR
--   File: datosgob_06_comisiones.csv
--   MD5: 9a0051e07211b08fbd7105d4454bd558
--   License: CC-BY-4.0
--   Coverage: 2008-03-01 → 2025-06-01 (~208 months × 10 AFOREs)
--   Shape: 2,080 raw rows × 3 cols (fecha, afore, comision); 2,071 non-null
--          rows expected after dropping 9 empty/sentinel cells.
--
-- Representation: comision is expressed as percentage points
-- (e.g. 1.96 = 1.96% of saldo administrado annual).
-- Empirically verified range [0.52, 3.30].
--
-- Pension Bienestar (FPB9) does NOT report comisión: régimen administrativo
-- diferenciado (already documented as caveat in S10 / consar.py).
-- Hence only 10 of the 11 afores appear in this fact.
--
-- This migration creates schema only. Data ingest is done via
-- api/scripts/ingest_consar_comisiones.py (run separately against LOCAL
-- then NEON, verifying byte-exact MD5 round-trip after each).
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS consar.comisiones CASCADE;

CREATE TABLE consar.comisiones (
    fecha       DATE          NOT NULL,
    afore_id    INTEGER       NOT NULL REFERENCES consar.afores(id) ON DELETE RESTRICT,
    comision    NUMERIC(7,4)  NOT NULL,
    PRIMARY KEY (fecha, afore_id),
    CONSTRAINT comisiones_fecha_first_of_month
        CHECK (EXTRACT(DAY FROM fecha) = 1),
    CONSTRAINT comisiones_pct_range
        CHECK (comision >= 0 AND comision <= 100)
);

COMMENT ON TABLE consar.comisiones IS
    'Comisión mensual cobrada por cada AFORE como % anual sobre saldo administrado. Cobertura 2008-03 a 2025-06. Pensión Bienestar no reporta (régimen administrativo diferenciado).';

COMMENT ON COLUMN consar.comisiones.comision IS
    'Porcentaje anual (e.g. 1.96 = 1.96%). Rango histórico empírico [0.52, 3.30]. Tendencia secular descendente post-reforma 2008.';

CREATE INDEX idx_consar_comisiones_afore_fecha ON consar.comisiones(afore_id, fecha);

COMMIT;

-- =============================================================================
-- Rollback: DROP TABLE consar.comisiones CASCADE;
-- =============================================================================
