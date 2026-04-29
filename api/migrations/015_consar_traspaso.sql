-- =============================================================================
-- Migration 015: CONSAR traspaso schema (dataset #08)
-- =============================================================================
--
-- Extends consar.* with monthly account-transfer counts per AFORE: number of
-- accounts ceded (lost) and received (gained) by each AFORE in the month.
-- Fourth CONSAR fact table after recursos_mensuales (009), comisiones (013)
-- and flujo_recurso (014).
--
-- Source: datos.gob.mx / CONSAR
--   File: datosgob_08_traspasos.csv
--   MD5: e796f110a35914647b199f6ed2e478e0
--   License: CC-BY-4.0
--   Coverage: 1998-11-01 → 2025-06-01 (320 months × 10 AFOREs = 3,200 rows)
--   Shape: rectangular grid; 336 rows have BOTH counts NULL (rows for AFOREs
--          before their fecha_alta_serie). Those rows are PRESERVED in the
--          ingest (DDL allows NULLs and the absence is informative).
--
-- Pension Bienestar (FPB9) excluded by design (régimen administrativo
-- diferenciado).
--
-- Implicit accounting identity (verified empirically): for each fecha,
--   Σ num_tras_cedido = Σ num_tras_recibido
-- because every transfer is exactly one ceded + one received account.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS consar.traspaso CASCADE;

CREATE TABLE consar.traspaso (
    fecha              DATE     NOT NULL,
    afore_id           INTEGER  NOT NULL REFERENCES consar.afores(id) ON DELETE RESTRICT,
    num_tras_cedido    INTEGER,
    num_tras_recibido  INTEGER,
    PRIMARY KEY (fecha, afore_id),
    CONSTRAINT traspaso_fecha_first_of_month
        CHECK (EXTRACT(DAY FROM fecha) = 1),
    CONSTRAINT traspaso_no_neg
        CHECK ((num_tras_cedido   IS NULL OR num_tras_cedido   >= 0)
           AND (num_tras_recibido IS NULL OR num_tras_recibido >= 0))
);

COMMENT ON TABLE consar.traspaso IS
    'Conteo mensual de traspasos de cuentas por AFORE: cedidas (perdidas) y recibidas (ganadas). Cobertura 1998-11 a 2025-06. Filas con ambas columnas NULL representan meses pre-alta de la AFORE.';

COMMENT ON COLUMN consar.traspaso.num_tras_cedido IS
    'Número de cuentas que esta AFORE perdió hacia otras AFOREs en el mes. NULL si la AFORE aún no había arrancado.';

COMMENT ON COLUMN consar.traspaso.num_tras_recibido IS
    'Número de cuentas que esta AFORE ganó desde otras AFOREs en el mes. NULL si la AFORE aún no había arrancado.';

CREATE INDEX idx_consar_traspaso_afore_fecha ON consar.traspaso(afore_id, fecha);

COMMIT;

-- =============================================================================
-- Rollback: DROP TABLE consar.traspaso CASCADE;
-- =============================================================================
