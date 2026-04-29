-- =============================================================================
-- Migration 016: CONSAR pea_cotizantes schema (dataset #02)
-- =============================================================================
--
-- Extends consar.* with annual nationwide series of PEA (Población
-- Económicamente Activa) vs cotizantes formales registrados en SAR. Macro-level
-- aggregate without afore dimension — measures formal SAR coverage of the
-- Mexican workforce.
--
-- Source: datos.gob.mx / CONSAR
--   File: datosgob_02_pea_vs_cotizantes_datos_abiertos_2024.csv
--   MD5: 7744934484033bd6ded53d8bc8c4c424
--   License: CC-BY-4.0
--   Coverage: 2010 → 2024 (15 annual rows). Rectangular, no empty cells.
--
-- Defensive CHECK cotizantes <= pea: cotizantes are by construction a subset
-- of PEA (formality is subset of economic activity). Empirically verified
-- across all 15 rows; future updates that violate this would indicate data
-- corruption.
--
-- Five-th CONSAR fact table after recursos_mensuales (009), comisiones (013),
-- flujo_recurso (014) and traspaso (015).
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS consar.pea_cotizantes CASCADE;

CREATE TABLE consar.pea_cotizantes (
    anio                  SMALLINT     PRIMARY KEY,
    cotizantes            BIGINT       NOT NULL,
    pea                   BIGINT       NOT NULL,
    porcentaje_pea_afore  NUMERIC(6,2) NOT NULL,
    CONSTRAINT pea_anio_range
        CHECK (anio BETWEEN 1990 AND 2100),
    CONSTRAINT pea_pct_range
        CHECK (porcentaje_pea_afore BETWEEN 0 AND 100),
    CONSTRAINT pea_cotizantes_le_pea
        CHECK (cotizantes <= pea)
);

COMMENT ON TABLE consar.pea_cotizantes IS
    'Serie anual nacional: cotizantes formales en SAR vs Población Económicamente Activa total. Mide cobertura formal del sistema de pensiones (sin dimensión AFORE).';

COMMENT ON COLUMN consar.pea_cotizantes.cotizantes IS
    'Trabajadores cotizando en SAR (subset formal de la PEA).';

COMMENT ON COLUMN consar.pea_cotizantes.pea IS
    'Población Económicamente Activa total (incluye informales y desempleados).';

COMMENT ON COLUMN consar.pea_cotizantes.porcentaje_pea_afore IS
    'Cobertura: 100 * cotizantes / pea. Diferencia con 100 representa brecha de informalidad/desempleo.';

COMMIT;

-- =============================================================================
-- Rollback: DROP TABLE consar.pea_cotizantes CASCADE;
-- =============================================================================
