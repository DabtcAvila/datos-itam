-- =============================================================================
-- Migration 017: CONSAR cat_siefore (S16 Sub-fase 1)
-- =============================================================================
--
-- Catálogo canónico de SIEFOREs observadas en datasets CONSAR #01/#07/#10/#11.
-- Es la primera entidad compartida transversalmente entre 4 datasets pendientes
-- de ingerir (precio_bolsa, activo_neto, rendimiento, precio_gestion). Los slugs
-- igualan exactamente la columna `siefore` de #01/#11 atómico; #07 y #10 mapean
-- vía aliases en código de ingest (NL labels y "promedio ponderado" labels).
--
-- Fuente: análisis empírico de los 4 CSVs.
--   #01 datosgob_01_precios_bolsa_siefores.csv     (635,167 rows, 25 siefores)
--   #07 datosgob_07_activos_netos.csv              (9,849 rows,  11 siefore-spec)
--   #10 datosgob_10_rendimientos_precio_bolsa.csv  (35,041 rows, 11 siefore-spec)
--   #11 datosgob_11_precios_gestion_siefores.csv   (588,318 rows, 24 siefores)
--
-- Total: 27 entries (unión #01 ∪ #11 + sb_pensiones que sólo aparece en #07/#10).
-- Desglose: 9 basica_edad (cohortes 55-59 a 95-99 step 5) + 2 basica_pensionados
-- (sb 1000, sb_pensiones) + 1 basica_inicial (sb0) + 1 basica_legacy (sb5)
-- + 1 cuenta_administrada (sac) + 3 ahorro_voluntario (siav, siav1, siav2)
-- + 10 previsional_social (sps1..sps10) = 27.
--
-- Nota crítica sb 1000 vs sb_pensiones: son DOS siefores distintas. #10 las
-- reporta como tipo_recurso separados ("sb 1000 promedio ponderado" y
-- "sb pensiones promedio ponderado"). #01/#11 atómico publica precio sólo de
-- sb 1000; sb_pensiones no tiene precio_bolsa ni precio_gestion (probable razón:
-- la siefore de pensionados está en fase de pago, no de inversión bursátil).
--
-- sb5 es legacy: sólo afore xxi (pre-fusión Banorte 2012), nomenclatura
-- pre-reforma generacional 2019. vigente=FALSE.
--
-- Décimo-séptima migración. Sexta de la familia CONSAR (009 schema base,
-- 013 comisiones, 014 flujo_recurso, 015 traspaso, 016 pea_cotizantes).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS consar.cat_siefore (
    id              SERIAL       PRIMARY KEY,
    slug            VARCHAR(40)  NOT NULL UNIQUE,
    nombre          VARCHAR(80)  NOT NULL,
    categoria       VARCHAR(32)  NOT NULL,
    descripcion     TEXT,
    vigente         BOOLEAN      NOT NULL DEFAULT TRUE,
    orden_display   INTEGER      NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT cat_siefore_categoria_ck
        CHECK (categoria IN (
            'basica_edad',
            'basica_pensionados',
            'basica_inicial',
            'basica_legacy',
            'cuenta_administrada',
            'ahorro_voluntario',
            'previsional_social'
        ))
);

CREATE INDEX idx_cat_siefore_categoria ON consar.cat_siefore(categoria);
CREATE INDEX idx_cat_siefore_vigente   ON consar.cat_siefore(vigente);

COMMENT ON TABLE consar.cat_siefore IS
    'Catálogo canónico de SIEFOREs observadas en datasets CONSAR #01/#07/#10/#11. '
    'Slug match exacto a la columna siefore en #01/#11 atómico; #07/#10 mapean vía aliases en ingest.';

COMMENT ON COLUMN consar.cat_siefore.slug IS
    'Identificador canónico, lowercase con espacios cuando el slug original lo tiene (ej: "sb 55-59"). Match byte-exact con #01/#11.';

COMMENT ON COLUMN consar.cat_siefore.categoria IS
    'basica_edad: 10 generacionales por edad (régimen reforma 2019). '
    'basica_pensionados: sb 1000 (con precio bolsa) y sb_pensiones (sin precio bolsa, sólo activo_neto/rendimiento). '
    'basica_inicial: sb0 (cuentas en transición). '
    'basica_legacy: sb5 (régimen pre-reforma 2019, sólo afore XXI ≤2012). '
    'cuenta_administrada: sac. '
    'ahorro_voluntario: siav, siav1, siav2. '
    'previsional_social: sps1..sps10 (cuentas corporativas XXI-Banorte).';

COMMENT ON COLUMN consar.cat_siefore.vigente IS
    'TRUE para siefores con datos post-2019 (régimen actual). FALSE para sb5 (legacy ≤2012).';

-- ------------------------------------------------------------------
-- Seed: 28 SIEFOREs canónicas
-- ------------------------------------------------------------------
-- orden_display narrativo: básicas edad ascendente → pensionados → inicial →
-- legacy → adicionales (sac, siav, sps).

INSERT INTO consar.cat_siefore (slug, nombre, categoria, descripcion, vigente, orden_display) VALUES
    -- 10 básicas por edad (régimen generacional 2019+)
    ('sb 55-59',     'Siefore Básica 55-59',         'basica_edad',          'Cohorte aprox 1965-1969. Régimen generacional reforma 2019.',                       TRUE,   1),
    ('sb 60-64',     'Siefore Básica 60-64',         'basica_edad',          'Cohorte aprox 1960-1964. Régimen generacional reforma 2019.',                       TRUE,   2),
    ('sb 65-69',     'Siefore Básica 65-69',         'basica_edad',          'Cohorte aprox 1955-1959. Régimen generacional reforma 2019.',                       TRUE,   3),
    ('sb 70-74',     'Siefore Básica 70-74',         'basica_edad',          'Cohorte aprox 1950-1954. Régimen generacional reforma 2019.',                       TRUE,   4),
    ('sb 75-79',     'Siefore Básica 75-79',         'basica_edad',          'Cohorte aprox 1945-1949. Régimen generacional reforma 2019.',                       TRUE,   5),
    ('sb 80-84',     'Siefore Básica 80-84',         'basica_edad',          'Cohorte aprox 1940-1944. Régimen generacional reforma 2019.',                       TRUE,   6),
    ('sb 85-89',     'Siefore Básica 85-89',         'basica_edad',          'Cohorte aprox 1935-1939. Régimen generacional reforma 2019.',                       TRUE,   7),
    ('sb 90-94',     'Siefore Básica 90-94',         'basica_edad',          'Cohorte aprox 1930-1934. Régimen generacional reforma 2019.',                       TRUE,   8),
    ('sb 95-99',     'Siefore Básica 95-99',         'basica_edad',          'Cohorte aprox 1925-1929 (sparsity estructural en datos: pocos afores reportan).',   TRUE,   9),
    -- 2 siefores especiales de pensionados
    ('sb 1000',      'Siefore Básica 1000',          'basica_pensionados',   'Pensionados; con precio_bolsa publicado en #01/#11. Distinta de sb_pensiones.',     TRUE,  10),
    ('sb_pensiones', 'Siefore Básica de Pensiones',  'basica_pensionados',   'Activo neto y rendimiento en #07/#10; sin precio bursátil atómico en #01/#11.',     TRUE,  11),
    -- 1 inicial / transición
    ('sb0',          'Siefore Básica Inicial',       'basica_inicial',       'Cuentas en transición / sin asignación de afore.',                                  TRUE,  12),
    -- 1 legacy
    ('sb5',          'Siefore Básica 5 (legacy)',    'basica_legacy',        'Régimen pre-reforma 2019. Sólo afore XXI standalone (≤2012-12 pre-fusión Banorte).', FALSE, 13),
    -- 1 cuenta administrada
    ('sac',          'Subcuenta de Aportaciones Complementarias', 'cuenta_administrada', 'Aportaciones voluntarias complementarias.',                              TRUE,  14),
    -- 3 ahorro voluntario individual
    ('siav',         'Subcuenta Individual de Ahorro Voluntario',   'ahorro_voluntario', 'Ahorro voluntario individual (sin variante).',                           TRUE,  15),
    ('siav1',        'Subcuenta Individual de Ahorro Voluntario 1', 'ahorro_voluntario', 'Variante 1 (algunas afores reportan múltiples siav).',                   TRUE,  16),
    ('siav2',        'Subcuenta Individual de Ahorro Voluntario 2', 'ahorro_voluntario', 'Variante 2 (algunas afores reportan múltiples siav).',                   TRUE,  17),
    -- 10 previsional social (XXI-Banorte corporativos)
    ('sps1',         'Subcuenta Previsional Social 1',  'previsional_social', 'Cuenta corporativa SPS (XXI-Banorte).',                                            TRUE,  18),
    ('sps2',         'Subcuenta Previsional Social 2',  'previsional_social', 'Cuenta corporativa SPS (XXI-Banorte).',                                            TRUE,  19),
    ('sps3',         'Subcuenta Previsional Social 3',  'previsional_social', 'Cuenta corporativa SPS (XXI-Banorte).',                                            TRUE,  20),
    ('sps4',         'Subcuenta Previsional Social 4',  'previsional_social', 'Cuenta corporativa SPS (XXI-Banorte).',                                            TRUE,  21),
    ('sps5',         'Subcuenta Previsional Social 5',  'previsional_social', 'Cuenta corporativa SPS (XXI-Banorte).',                                            TRUE,  22),
    ('sps6',         'Subcuenta Previsional Social 6',  'previsional_social', 'Cuenta corporativa SPS (XXI-Banorte).',                                            TRUE,  23),
    ('sps7',         'Subcuenta Previsional Social 7',  'previsional_social', 'Cuenta corporativa SPS (XXI-Banorte).',                                            TRUE,  24),
    ('sps8',         'Subcuenta Previsional Social 8',  'previsional_social', 'Cuenta corporativa SPS (XXI-Banorte).',                                            TRUE,  25),
    ('sps9',         'Subcuenta Previsional Social 9',  'previsional_social', 'Cuenta corporativa SPS (XXI-Banorte).',                                            TRUE,  26),
    ('sps10',        'Subcuenta Previsional Social 10', 'previsional_social', 'Cuenta corporativa SPS (XXI-Banorte).',                                            TRUE,  27);

COMMIT;

-- =============================================================================
-- Rollback: DROP TABLE consar.cat_siefore CASCADE;
-- =============================================================================
