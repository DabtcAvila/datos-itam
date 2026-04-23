-- =============================================================================
-- Migration 009: CONSAR AFORE recursos mensuales schema
-- =============================================================================
--
-- Creates the `consar` namespace for CONSAR's monthly AFORE resource registry.
-- Third dataset in the multi-schema observatorio (cdmx + enigh + consar).
--
-- Source: datos.gob.mx / CONSAR
--   URL: https://repodatos.atdt.gob.mx/api_update/consar/
--        monto_recursos_registrados_afore/09_recursos.csv
--   License: CC-BY-4.0
--   MD5: 19083c9a46d9d958b1428056c2f5f0b1
--   Coverage: 1998-05-01 → 2025-06-01 (326 monthly observations)
--   Shape: 3,586 raw rows × 17 cols (15 monto cols + fecha + afore).
--   675 rows are sentinel (all-NaN, pre-launch months per AFORE) and are
--   NOT persisted. 35,617 non-null cells become rows in long format.
--
-- Design (long vs. wide):
--   Wide CSV (fecha, afore, 15 monto cols) is transposed to long format
--   (fecha, afore_id, tipo_recurso_id, monto_mxn_mm) for analytical SQL.
--   NULL cells are dropped during ingest (carry no information).
--
-- Accounting identities verified in raw CSV (all exact to <0.05 MXN):
--   vivienda = infonavit + fovissste                                   (2397 rows)
--   ahorro_vol_y_solidario = ahorro_voluntario + ahorro_solidario      (1900 rows)
--   sar_total = rcv_imss + rcv_issste + bono_issste + vivienda
--             + ahorro_vol_sol + capital_afores + banxico
--             + fondos_prevision_social                                (2911 eval rows, 98.83% close at
--                                                                      the cent, 100% close in 2020+,
--                                                                      residue 24 rows XXI-Banorte
--                                                                      2010-2012 max Δ 2.36%)
--   recursos_administrados = recursos_trabajadores + capital_afores    (2737/2899 rows; the 162
--                                                                       residuals are XXI-Banorte's
--                                                                       fondos_prevision_social again)
--
-- FPB9 naming decision: the CSV literal is 'fondo de pensiones para el
-- bienestar 9' (CONSAR administrative numbering: AFORE 9). Public brand
-- is "Pensión Bienestar"; we expose the brand in nombre_corto and keep
-- the CSV literal in nombre_csv for trazabilidad.
--
-- NOT taken: materialized views, partial indexes, check-constraint on
-- monto_mxn_mm upper bound (max observed ~2 bill MXN fits NUMERIC(14,2)).
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS consar;

-- ------------------------------------------------------------------
-- Catálogo: 11 AFOREs
-- ------------------------------------------------------------------
-- orden_display follows snapshot at 2025-06-01 ordered by sar_total desc,
-- so UI tables render largest-to-smallest by default.

CREATE TABLE consar.afores (
    id                SERIAL PRIMARY KEY,
    codigo            VARCHAR(32)  NOT NULL UNIQUE,
    nombre_corto      VARCHAR(64)  NOT NULL,
    nombre_csv        VARCHAR(128) NOT NULL UNIQUE,
    tipo_pension      VARCHAR(16)  NOT NULL,
    fecha_alta_serie  DATE         NOT NULL,
    activa            BOOLEAN      NOT NULL DEFAULT TRUE,
    orden_display     INTEGER      NOT NULL,
    CONSTRAINT afores_tipo_pension_ck
        CHECK (tipo_pension IN ('privada','publica','bienestar'))
);

COMMENT ON TABLE consar.afores IS
    '11 AFOREs activas en el SAR mexicano. fecha_alta_serie es el primer mes con monto no-NaN en el CSV oficial.';

-- ------------------------------------------------------------------
-- Catálogo: 15 tipos de recurso
-- ------------------------------------------------------------------

CREATE TABLE consar.tipos_recurso (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(40)  NOT NULL UNIQUE,
    columna_csv     VARCHAR(80)  NOT NULL UNIQUE,
    nombre_corto    VARCHAR(80)  NOT NULL,
    nombre_oficial  VARCHAR(160) NOT NULL,
    descripcion     TEXT,
    categoria       VARCHAR(16)  NOT NULL,
    es_total_sar    BOOLEAN      NOT NULL DEFAULT FALSE,
    orden_display   INTEGER      NOT NULL,
    CONSTRAINT tipos_recurso_categoria_ck
        CHECK (categoria IN ('component','aggregate','total','operativo'))
);

-- Partial UNIQUE index: exactly one row can have es_total_sar=TRUE.
CREATE UNIQUE INDEX tipos_recurso_single_total_sar
    ON consar.tipos_recurso (es_total_sar)
    WHERE es_total_sar = TRUE;

COMMENT ON TABLE consar.tipos_recurso IS
    '15 conceptos de recursos del reporte mensual CONSAR. columna_csv preserva el nombre exacto del CSV para round-trip de validación byte-exact.';

COMMENT ON COLUMN consar.tipos_recurso.categoria IS
    'component: concepto atómico. aggregate: suma de components (vivienda=infonavit+fovissste; ahorro_vol_y_sol=voluntario+solidario). operativo: capital de la AFORE (no pertenece al trabajador). total: agregado a nivel AFORE/sistema (sar_total, recursos_administrados, recursos_trabajadores).';

-- ------------------------------------------------------------------
-- Tabla de hechos: recursos mensuales (formato largo)
-- ------------------------------------------------------------------

CREATE TABLE consar.recursos_mensuales (
    fecha            DATE          NOT NULL,
    afore_id         INTEGER       NOT NULL REFERENCES consar.afores(id)        ON DELETE RESTRICT,
    tipo_recurso_id  INTEGER       NOT NULL REFERENCES consar.tipos_recurso(id) ON DELETE RESTRICT,
    monto_mxn_mm     NUMERIC(14,2) NOT NULL,
    PRIMARY KEY (fecha, afore_id, tipo_recurso_id),
    CONSTRAINT recursos_monto_nonneg
        CHECK (monto_mxn_mm >= 0),
    CONSTRAINT recursos_fecha_first_of_month
        CHECK (EXTRACT(DAY FROM fecha) = 1)
);

COMMENT ON TABLE consar.recursos_mensuales IS
    'Monto mensual por AFORE × tipo de recurso, en millones de pesos MXN CORRIENTES (no reales). Cobertura 1998-05 a 2025-06. Filas NULL en el CSV NO se persisten.';

COMMENT ON COLUMN consar.recursos_mensuales.monto_mxn_mm IS
    'Millones de pesos MXN a valor nominal (corriente) del mes reportado. Para comparaciones históricas, deflactar con INPC BASE 2018=100 INEGI.';

-- ------------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------------
-- Query patterns:
--   (a) Serie temporal de un tipo de recurso a nivel sistema:
--       SELECT fecha, SUM(monto_mxn_mm) FROM recursos_mensuales
--       WHERE tipo_recurso_id = X GROUP BY fecha ORDER BY fecha
--       → idx_consar_recursos_tipo_fecha (covering via PK order)
--   (b) Snapshot mensual por AFORE (todos los tipos de un mes):
--       WHERE fecha = 'YYYY-MM-01'
--       → PK leading column (no extra index needed)
--   (c) Histórico de una AFORE en todos los conceptos:
--       WHERE afore_id = X ORDER BY fecha
--       → idx_consar_recursos_afore_fecha

CREATE INDEX idx_consar_recursos_tipo_fecha
    ON consar.recursos_mensuales(tipo_recurso_id, fecha);

CREATE INDEX idx_consar_recursos_afore_fecha
    ON consar.recursos_mensuales(afore_id, fecha);

-- ------------------------------------------------------------------
-- Seed: 11 AFOREs
-- ------------------------------------------------------------------

INSERT INTO consar.afores (codigo, nombre_corto, nombre_csv, tipo_pension, fecha_alta_serie, activa, orden_display) VALUES
    ('profuturo',         'Profuturo',           'profuturo',                                'privada',    '1998-05-01', TRUE, 1),
    ('xxi_banorte',       'XXI-Banorte',         'xxi banorte',                              'privada',    '1998-05-01', TRUE, 2),
    ('banamex',           'Banamex',             'banamex',                                  'privada',    '1998-05-01', TRUE, 3),
    ('sura',              'SURA',                'sura',                                     'privada',    '1998-05-01', TRUE, 4),
    ('coppel',            'Coppel',              'coppel',                                   'privada',    '2006-04-01', TRUE, 5),
    ('pensionissste',     'PensionISSSTE',       'pensionissste',                            'publica',    '2008-12-01', TRUE, 6),
    ('azteca',            'Azteca',              'azteca',                                   'privada',    '2003-03-01', TRUE, 7),
    ('principal',         'Principal',           'principal',                                'privada',    '1998-05-01', TRUE, 8),
    ('invercap',          'Invercap',            'invercap',                                 'privada',    '2005-02-01', TRUE, 9),
    ('inbursa',           'Inbursa',             'inbursa',                                  'privada',    '1998-05-01', TRUE, 10),
    ('pension_bienestar', 'Pensión Bienestar',   'fondo de pensiones para el bienestar 9',   'bienestar',  '2024-07-01', TRUE, 11);

-- ------------------------------------------------------------------
-- Seed: 15 tipos de recurso
-- ------------------------------------------------------------------
-- orden_display is narrative: totales → vivienda → RCV → ahorro vol → fondos/banxico → capital.

INSERT INTO consar.tipos_recurso (codigo, columna_csv, nombre_corto, nombre_oficial, descripcion, categoria, es_total_sar, orden_display) VALUES
    (
        'sar_total',
        'monto_recursos registrados en el sar',
        'SAR Total',
        'Recursos Registrados en el SAR',
        'Recursos Registrados en el SAR: gran total del Sistema de Ahorro para el Retiro. Identidad contable verificada empíricamente en 2,911 filas del CSV oficial: sar_total = rcv_imss + rcv_issste + bono_pension_issste + vivienda + ahorro_voluntario_y_solidario + capital_afores + banxico + fondos_prevision_social. Cierre exacto (Δ ≤ 0.05 mm MXN) en 98.83% de filas; cierre dentro de 0.5% en 99.52%; cota superior 2.36% (1 caso). Residuo concentrado 100% en XXI-Banorte 2010-2012, probable artefacto transitorio post-introducción de fondos_prevision_social (2009-02). Identidad cierra al peso en 100% de filas 2020+.',
        'total', TRUE, 1
    ),
    (
        'recursos_administrados',
        'monto_recursos administrados por las afores',
        'Recursos Administrados',
        'Recursos administrados por las AFORE',
        'Recursos administrados por cada AFORE (recursos_trabajadores + capital_afores + fondos_prevision_social en el caso de XXI-Banorte). Excluye recursos depositados en Banxico (cuentas asignadas sin AFORE elegida) y recursos de vivienda.',
        'total', FALSE, 2
    ),
    (
        'recursos_trabajadores',
        'monto_recursos de los trabajadores',
        'Recursos de los Trabajadores',
        'Recursos que pertenecen a los trabajadores (excluye capital propio de la AFORE).',
        'total', FALSE, 3
    ),
    (
        'vivienda',
        'monto_vivienda',
        'Vivienda',
        'Subcuenta de vivienda. Agregado: vivienda = infonavit + fovissste (identidad verificada al peso).',
        'aggregate', FALSE, 4
    ),
    (
        'infonavit',
        'monto_infonavit',
        'INFONAVIT',
        'Subcuenta de vivienda INFONAVIT (trabajadores del sector privado afiliados al IMSS).',
        'component', FALSE, 5
    ),
    (
        'fovissste',
        'monto_fovissste',
        'FOVISSSTE',
        'Subcuenta de vivienda FOVISSSTE (trabajadores del sector público afiliados al ISSSTE). Reportado a partir de ~2005.',
        'component', FALSE, 6
    ),
    (
        'rcv_imss',
        'monto_rcv - imss',
        'RCV-IMSS',
        'Retiro, Cesantía en edad avanzada y Vejez (RCV) — cuentas IMSS (trabajadores del sector privado).',
        'component', FALSE, 7
    ),
    (
        'rcv_issste',
        'monto_rcv - issste',
        'RCV-ISSSTE',
        'Retiro, Cesantía en edad avanzada y Vejez (RCV) — cuentas ISSSTE (trabajadores del sector público). Reportado a partir de ~2008.',
        'component', FALSE, 8
    ),
    (
        'bono_pension_issste',
        'monto_bono de pension issste',
        'Bono Pensión ISSSTE',
        'Bono de Pensión ISSSTE: reconocimiento por aportaciones realizadas bajo el régimen previo a la reforma ISSSTE 2007. Reportado desde 2008-12.',
        'component', FALSE, 9
    ),
    (
        'ahorro_voluntario_y_solidario',
        'monto_ahorro voluntario y solidario',
        'Ahorro Voluntario + Solidario',
        'Agregado: ahorro_voluntario_y_solidario = ahorro_voluntario + ahorro_solidario (identidad verificada al peso).',
        'aggregate', FALSE, 10
    ),
    (
        'ahorro_voluntario',
        'monto_ahorro voluntario',
        'Ahorro Voluntario',
        'Aportaciones voluntarias del trabajador (sin aportación patronal match).',
        'component', FALSE, 11
    ),
    (
        'ahorro_solidario',
        'monto_ahorro solidario',
        'Ahorro Solidario',
        'Aportación solidaria ISSSTE (trabajador aporta 1-2% del salario, gobierno federal aporta 3.25% por cada 1% del trabajador).',
        'component', FALSE, 12
    ),
    (
        'fondos_prevision_social',
        'monto_fondos de prevision social',
        'Fondos de Previsión Social',
        'Fondos de previsión social administrados por la AFORE. EXCLUSIVO de XXI-Banorte, reportado desde 2009-02.',
        'component', FALSE, 13
    ),
    (
        'banxico',
        'monto_recursos depositados en banco de méxico',
        'Depósitos en Banxico',
        'Recursos de trabajadores que aún no han elegido AFORE (cuentas asignadas), depositados en el Banco de México. Reportado desde 2012-01 a nivel sistema.',
        'component', FALSE, 14
    ),
    (
        'capital_afores',
        'monto_capital de las afores',
        'Capital AFORES',
        'Capital propio de la administradora (no pertenece a los trabajadores). Requerido por CONSAR como reserva mínima.',
        'operativo', FALSE, 15
    );

COMMIT;

-- =============================================================================
-- Rollback (manual): DROP SCHEMA consar CASCADE;
-- =============================================================================
