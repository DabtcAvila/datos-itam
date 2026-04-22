-- Migration 006: ENIGH 2024 (Nueva Serie) schema skeleton.
--
-- ⚠️  NOT YET EXECUTED. Apply after review. Paired with
--     api/docs/enigh-schema-plan.md which justifies every variable
--     included / descarded and estimates post-ingesta size.
--
-- This creates the `enigh` namespace for the Encuesta Nacional de
-- Ingresos y Gastos de los Hogares 2024 (INEGI) as the second dataset
-- in the observatorio multi-dataset (CDMX / ENIGH / CONSAR).
--
-- SCOPE DECISION (see enigh-schema-plan.md for full rationale):
-- ENIGH ships 16 tablas + CONCENTRADOHOGAR with ~960 total variables.
-- We subset aggressively to a narrative focus of empleo → ingreso →
-- ahorro/retiro, keeping 6 data tables + 4 catalogs and ~38 substantive
-- variables. Expense microdata (GASTOSHOGAR, GASTOSPERSONA, EROGACIONES,
-- GASTOTARJETAS), self-employment business micro-data (AGRO, NOAGRO,
-- and the 4 AGRO*/NOAGRO* child tables), and INGRESOS_JCF (program-
-- specific) are OMITTED. They can be added as a second pass later.
--
-- PRIMARY KEYS: The composite key pattern mirrors INEGI's:
--   folioviv (10 chars, 2=entidad + 1=ámbito + 4=upm + 1=decena + 2=consec)
--   foliohog (1 char, 1-5 per vivienda)
--   numren   (2 chars, renglón del integrante en cuestionario)
--   id_trabajo (1 char, dentro del integrante)

BEGIN;

CREATE SCHEMA IF NOT EXISTS enigh;

-- ============================================================
-- Catalogs
-- ============================================================

-- 32 entidades federativas (clave INEGI 2 dígitos)
CREATE TABLE enigh.cat_entidad (
    clave        CHAR(2) PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    abreviatura  VARCHAR(10)
);

-- Catálogo de parentesco (PDF sección 2.4.1) — relación del integrante con el jefe/a del hogar
CREATE TABLE enigh.cat_parentesco (
    clave   VARCHAR(3) PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL
);

-- Nivel escolar aprobado (derivado de la variable `nivel` del cuestionario)
CREATE TABLE enigh.cat_nivel_educativo (
    clave   VARCHAR(2) PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL,
    anios_equiv SMALLINT  -- años de escolaridad equivalentes para análisis continuo
);

-- Catálogo de claves de ingreso (PDF sección 2.4.8) — agrupa las ~150 claves
-- de ingreso (trabajo subordinado, negocio, renta, jubilación, transferencias, etc.)
CREATE TABLE enigh.cat_ingresos (
    clave     VARCHAR(4) PRIMARY KEY,
    nombre    VARCHAR(200) NOT NULL,
    categoria VARCHAR(50) NOT NULL  -- trabajo | negocio | renta | transfer | jubilacion | otro
);

-- ============================================================
-- Nivel vivienda
-- ============================================================

CREATE TABLE enigh.viviendas (
    folioviv  CHAR(10) PRIMARY KEY,
    entidad   CHAR(2)  NOT NULL REFERENCES enigh.cat_entidad(clave),
    tam_loc   CHAR(1)  NOT NULL,  -- 1=100k+, 2=15k-99k, 3=2.5k-14k, 4=<2.5k
    est_dis   CHAR(3)  NOT NULL,  -- estrato de diseño muestral
    upm       CHAR(7)  NOT NULL,  -- unidad primaria de muestreo
    factor    INTEGER  NOT NULL CHECK (factor > 0)  -- factor de expansión
);

CREATE INDEX idx_enigh_vivi_entidad ON enigh.viviendas(entidad);
CREATE INDEX idx_enigh_vivi_tam_loc ON enigh.viviendas(tam_loc);

-- ============================================================
-- Nivel hogar
-- ============================================================

CREATE TABLE enigh.hogares (
    folioviv  CHAR(10) NOT NULL REFERENCES enigh.viviendas(folioviv),
    foliohog  CHAR(1)  NOT NULL,
    tot_integ SMALLINT NOT NULL CHECK (tot_integ > 0),
    num_auto  SMALLINT NOT NULL DEFAULT 0,  -- proxy patrimonial
    factor    INTEGER  NOT NULL CHECK (factor > 0),
    PRIMARY KEY (folioviv, foliohog)
);

-- Tabla estrella del análisis (rollup trimestral construido por INEGI a partir
-- de todas las otras tablas). Una fila por hogar. 15 cols substantivas de las
-- 126 originales — las demás son subagregados de gasto (vesti_calz, vivienda,
-- limpieza, etc.) que no usamos en esta narrativa.
CREATE TABLE enigh.concentradohogar (
    folioviv    CHAR(10) NOT NULL,
    foliohog    CHAR(1)  NOT NULL,
    -- Características del hogar/jefe
    clase_hog   SMALLINT NOT NULL,          -- 1=unipersonal 2=nuclear 3=ampliado 4=compuesto 5=corresidente
    sexo_jefe   CHAR(1)  NOT NULL,          -- 1=hombre 2=mujer
    edad_jefe   SMALLINT NOT NULL,
    tam_loc     CHAR(1)  NOT NULL,
    -- Ingresos TRIMESTRALES del hogar (pesos corrientes)
    ing_cor     NUMERIC(14,2) NOT NULL,     -- ingreso corriente total
    ingtrab     NUMERIC(14,2) NOT NULL,     -- ingreso por trabajo (subordinado + independiente)
    renta       NUMERIC(14,2) NOT NULL,     -- renta de la propiedad
    transfer    NUMERIC(14,2) NOT NULL,     -- transferencias (incluye jubilaciones)
    jubilacion  NUMERIC(14,2) NOT NULL,     -- ⭐ subconjunto de transfer — KEY narrative variable
    -- Gastos trimestrales del hogar
    gasto_mon   NUMERIC(14,2) NOT NULL,     -- gasto monetario total
    alimentos   NUMERIC(14,2) NOT NULL,
    salud       NUMERIC(14,2) NOT NULL,
    educa_espa  NUMERIC(14,2) NOT NULL,     -- educación + esparcimiento
    -- Estratificación
    decil       SMALLINT NOT NULL CHECK (decil BETWEEN 1 AND 10),
    factor      INTEGER  NOT NULL CHECK (factor > 0),
    PRIMARY KEY (folioviv, foliohog),
    FOREIGN KEY (folioviv, foliohog) REFERENCES enigh.hogares(folioviv, foliohog)
);

CREATE INDEX idx_enigh_conc_decil  ON enigh.concentradohogar(decil);
CREATE INDEX idx_enigh_conc_ingcor ON enigh.concentradohogar(ing_cor);
-- partial index: hogares que reciben jubilación. Acelera queries narrativa.
CREATE INDEX idx_enigh_conc_jub    ON enigh.concentradohogar(jubilacion) WHERE jubilacion > 0;

-- ============================================================
-- Nivel persona (integrante del hogar)
-- ============================================================

CREATE TABLE enigh.poblacion (
    folioviv    CHAR(10) NOT NULL,
    foliohog    CHAR(1)  NOT NULL,
    numren      CHAR(2)  NOT NULL,  -- número de renglón del integrante
    parentesco  VARCHAR(3) NOT NULL REFERENCES enigh.cat_parentesco(clave),
    sexo        CHAR(1)  NOT NULL,
    edad        SMALLINT NOT NULL,
    -- Educación
    nivelaprob  CHAR(2)  REFERENCES enigh.cat_nivel_educativo(clave),
    -- Seguridad social (empleo formal)
    segsoc      CHAR(1),            -- 1=sí contribuye, 2=no
    ss_aa       SMALLINT,           -- años de contribución
    ss_mm       SMALLINT,           -- meses adicionales
    -- Afiliación a salud por retiro/invalidez y ahorro voluntario — ⭐ narrativa ahorro
    inscr_2     CHAR(1),            -- afiliado a servicio salud por jubilación o invalidez
    segvol_1    CHAR(1),            -- tiene seguro voluntario SAR o AFORE
    factor      INTEGER  NOT NULL CHECK (factor > 0),
    PRIMARY KEY (folioviv, foliohog, numren),
    FOREIGN KEY (folioviv, foliohog) REFERENCES enigh.hogares(folioviv, foliohog)
);

CREATE INDEX idx_enigh_pob_edad    ON enigh.poblacion(edad);
CREATE INDEX idx_enigh_pob_segsoc  ON enigh.poblacion(segsoc);
CREATE INDEX idx_enigh_pob_inscr2  ON enigh.poblacion(inscr_2) WHERE inscr_2 IS NOT NULL;

-- Característica ocupacional por persona-trabajo. Una persona puede tener
-- hasta 2 trabajos en ENIGH (id_trabajo=1 ó 2).
CREATE TABLE enigh.trabajos (
    folioviv    CHAR(10) NOT NULL,
    foliohog    CHAR(1)  NOT NULL,
    numren      CHAR(2)  NOT NULL,
    id_trabajo  CHAR(1)  NOT NULL,
    -- Tipo de empleo
    subor       CHAR(1),             -- 1=subordinado
    indep       CHAR(1),             -- 1=trabajó por su cuenta
    tipocontr   CHAR(1),             -- tipo de contrato (1=base/planta, 2=temporal, 3=sin contrato, etc.)
    htrab       SMALLINT,            -- horas trabajadas en la semana
    scian       VARCHAR(4),          -- Sistema de Clasificación Industrial
    tam_emp     CHAR(2),             -- tamaño de la empresa
    -- ⭐ Prestaciones clave para narrativa ahorro/retiro (de pres_1..pres_20 ENIGH)
    pres_8      CHAR(2),             -- tiene SAR o AFORE
    pres_17     CHAR(2),             -- pensión en caso de invalidez
    pres_18     CHAR(2),             -- pensión en caso de fallecimiento
    factor      INTEGER  NOT NULL CHECK (factor > 0),
    PRIMARY KEY (folioviv, foliohog, numren, id_trabajo),
    FOREIGN KEY (folioviv, foliohog, numren) REFERENCES enigh.poblacion(folioviv, foliohog, numren)
);

CREATE INDEX idx_enigh_trab_scian ON enigh.trabajos(scian);
CREATE INDEX idx_enigh_trab_pres8 ON enigh.trabajos(pres_8) WHERE pres_8 IS NOT NULL;

-- Ingresos detalle por persona+clave (la clave agrupa las ~150 fuentes de ingreso
-- de ENIGH). Necesaria para cruzar "ingresos por jubilación" (claves P038-P039)
-- con características de la persona que los recibe.
CREATE TABLE enigh.ingresos (
    folioviv    CHAR(10) NOT NULL,
    foliohog    CHAR(1)  NOT NULL,
    numren      CHAR(2)  NOT NULL,
    clave       VARCHAR(4) NOT NULL REFERENCES enigh.cat_ingresos(clave),
    ing_tri     NUMERIC(14,2) NOT NULL,  -- ingreso trimestral
    factor      INTEGER  NOT NULL CHECK (factor > 0),
    PRIMARY KEY (folioviv, foliohog, numren, clave),
    FOREIGN KEY (folioviv, foliohog, numren) REFERENCES enigh.poblacion(folioviv, foliohog, numren)
);

CREATE INDEX idx_enigh_ing_clave   ON enigh.ingresos(clave);
CREATE INDEX idx_enigh_ing_ing_tri ON enigh.ingresos(ing_tri);

COMMIT;

-- ============================================================
-- Post-apply validations (run interactively after ingesta):
-- ============================================================
--
--   SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'enigh' ORDER BY tablename;
--   -- expected: cat_entidad, cat_ingresos, cat_nivel_educativo, cat_parentesco,
--   --           concentradohogar, hogares, ingresos, poblacion, trabajos, viviendas
--
--   SELECT 'viviendas' t, COUNT(*) FROM enigh.viviendas
--   UNION ALL SELECT 'hogares', COUNT(*) FROM enigh.hogares
--   UNION ALL SELECT 'poblacion', COUNT(*) FROM enigh.poblacion
--   UNION ALL SELECT 'concentradohogar', COUNT(*) FROM enigh.concentradohogar
--   UNION ALL SELECT 'trabajos', COUNT(*) FROM enigh.trabajos
--   UNION ALL SELECT 'ingresos', COUNT(*) FROM enigh.ingresos;
--   -- expected (approx, ENIGH 2024 sample): viviendas≈95k, hogares≈97k,
--   --    concentradohogar=hogares, poblacion≈300k, trabajos≈200k, ingresos≈200k
