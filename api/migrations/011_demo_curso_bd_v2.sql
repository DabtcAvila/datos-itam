-- =============================================================================
-- Migration 011: demo.curso_bd v2 — agregar sueldo_diario_mxn + tipo
-- =============================================================================
--
-- Refactor del /demo de S15 (sesión 2): de demo educativa con toggle frontend
-- a aplicación HR/payroll empresarial verosímil. /demo se vuelve público
-- read-only; las modificaciones ocurren vía /api/docs (Swagger UI).
--
-- Nuevos campos:
--   - sueldo_diario_mxn NUMERIC(10,2) NOT NULL DEFAULT 0
--       Sueldo diario MXN del empleado. Contexto adicional, no determina el
--       monto del bono ($50,000 MXN flat para todos los reclamos).
--   - tipo VARCHAR(20) NOT NULL DEFAULT 'estudiante' CHECK in (...)
--       Subclasificación visual:
--         profesor   = 1 fila (Vasquez Beltrán)
--         equipo     = 4 filas (organizadores; sueldos 3900-4200)
--         estudiante = 7 filas (sueldos 1588-3578, scores Kahoot reales)
--
-- Reset reclamar_bono = FALSE en todos por si quedó algo togglead durante
-- pruebas pre-presentación.
--
-- Defensas:
--   1. UPDATE FROM VALUES con join por nombre_completo (UNIQUE, case-sensitive)
--   2. Assertion final: count filas con sueldo=0 debe ser 0
--   3. Assertion final: SUM(sueldo_diario_mxn) debe ser exactamente 37975.00
--   4. Assertion final: counts por tipo: 1 profesor + 4 equipo + 7 estudiante
-- =============================================================================

BEGIN;

-- ------------------------------------------------------------------
-- 1. Agregar columnas con DEFAULTs (permite ALTER sin NULLs)
-- ------------------------------------------------------------------

ALTER TABLE demo.curso_bd
    ADD COLUMN sueldo_diario_mxn NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE demo.curso_bd
    ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'estudiante'
        CONSTRAINT curso_bd_tipo_ck CHECK (tipo IN ('profesor', 'equipo', 'estudiante'));

CREATE INDEX idx_curso_bd_tipo ON demo.curso_bd(tipo);

COMMENT ON COLUMN demo.curso_bd.sueldo_diario_mxn IS
    'Sueldo diario MXN del empleado. Contexto pedagógico — no determina el monto del bono ($50,000 MXN flat para cualquier reclamo).';
COMMENT ON COLUMN demo.curso_bd.tipo IS
    'Subclasificación visual del empleado: profesor (1) | equipo (4 organizadores, sueldos 3900-4200) | estudiante (7, sueldos = score Kahoot real 1588-3578).';

-- ------------------------------------------------------------------
-- 2. UPDATE de las 12 filas con sueldo + tipo (join por nombre_completo)
-- ------------------------------------------------------------------

UPDATE demo.curso_bd cb
SET sueldo_diario_mxn = v.sueldo,
    tipo = v.tipo
FROM (VALUES
    ('MARCO AUGUSTO VASQUEZ BELTRAN',     4500.00, 'profesor'),
    ('DAVID FERNANDO AVILA DIAZ',         4200.00, 'equipo'),
    ('GERARDO ANDRE BUTRON RAMIREZ',      4100.00, 'equipo'),
    ('EMILIANO SEBASTIAN MILLAN GIFFARD', 4000.00, 'equipo'),
    ('JOSE ROBERTO URIBE CLEMENTE',       3900.00, 'equipo'),
    ('DIEGO MANRIQUE MEDINA',             3578.00, 'estudiante'),
    ('DIEGO HINOJOSA TELLEZ',             3318.00, 'estudiante'),
    ('FERNANDO ARELLANO GONZALEZ',        2742.00, 'estudiante'),
    ('PAULA LEON AGUILAR',                2469.00, 'estudiante'),
    ('ANIEL SOPHIA ORIHUELA VILLEGAS',    1800.00, 'estudiante'),
    ('MEYER HEMILSON ROSENTHAL',          1780.00, 'estudiante'),
    ('VALENTINA GARCIA RAMIREZ',          1588.00, 'estudiante')
) AS v(nombre, sueldo, tipo)
WHERE cb.nombre_completo = v.nombre;

-- ------------------------------------------------------------------
-- 3. Reset reclamar_bono = FALSE (defensivo, por si quedó toggle de tests)
-- ------------------------------------------------------------------

UPDATE demo.curso_bd
SET reclamar_bono = FALSE
WHERE reclamar_bono = TRUE;

-- ------------------------------------------------------------------
-- 4. Defensas: fail-fast si algo no matcheó como esperaba
-- ------------------------------------------------------------------

DO $$
DECLARE
    n_zero        INTEGER;
    sum_sueldo    NUMERIC(12,2);
    n_profesor    INTEGER;
    n_equipo      INTEGER;
    n_estudiante  INTEGER;
    n_bonos       INTEGER;
BEGIN
    SELECT COUNT(*) INTO n_zero FROM demo.curso_bd WHERE sueldo_diario_mxn = 0;
    IF n_zero > 0 THEN
        RAISE EXCEPTION 'Hay % filas con sueldo_diario_mxn = 0 — algún nombre_completo no matcheó al UPDATE FROM VALUES', n_zero;
    END IF;

    SELECT SUM(sueldo_diario_mxn) INTO sum_sueldo FROM demo.curso_bd;
    IF sum_sueldo <> 37975.00 THEN
        RAISE EXCEPTION 'SUM(sueldo_diario_mxn) esperado 37975.00 MXN, observado %', sum_sueldo;
    END IF;

    SELECT COUNT(*) INTO n_profesor   FROM demo.curso_bd WHERE tipo = 'profesor';
    SELECT COUNT(*) INTO n_equipo     FROM demo.curso_bd WHERE tipo = 'equipo';
    SELECT COUNT(*) INTO n_estudiante FROM demo.curso_bd WHERE tipo = 'estudiante';
    IF n_profesor <> 1 OR n_equipo <> 4 OR n_estudiante <> 7 THEN
        RAISE EXCEPTION 'Counts por tipo: esperado 1 profesor + 4 equipo + 7 estudiante = 12; observado % + % + % = %',
            n_profesor, n_equipo, n_estudiante, n_profesor + n_equipo + n_estudiante;
    END IF;

    SELECT COUNT(*) INTO n_bonos FROM demo.curso_bd WHERE reclamar_bono = TRUE;
    IF n_bonos <> 0 THEN
        RAISE EXCEPTION 'reclamar_bono debería ser FALSE en todas las filas post-reset; observado %', n_bonos;
    END IF;

    RAISE NOTICE '✓ migración 011 OK: 12 filas, SUM=37975.00 MXN/día, 1+4+7 por tipo, 0 bonos activos';
END $$;

COMMIT;

-- =============================================================================
-- Rollback (manual):
--   ALTER TABLE demo.curso_bd DROP COLUMN sueldo_diario_mxn;
--   ALTER TABLE demo.curso_bd DROP COLUMN tipo;
--   DROP INDEX IF EXISTS demo.idx_curso_bd_tipo;
-- =============================================================================
