-- =============================================================================
-- Migration 012: nivelar sueldos del equipo organizador a $4,200 MXN/día
-- =============================================================================
--
-- Decisión editorial pre-presentación: los 4 integrantes del equipo
-- organizador (David / Gerardo / Emiliano / Roberto) pasan de sueldos
-- escalonados (4200/4100/4000/3900) a un sueldo plano de 4200.00 MXN/día.
--
-- Narrativa: el equipo trabaja en condiciones equivalentes; el escalonamiento
-- previo no aportaba a la demo y podía leerse como jerarquía interna que no
-- existe.
--
-- Impacto en cifras:
--   - SUM(sueldo_diario_mxn) pasa 37,975.00 → 38,575.00 MXN/día (Δ +600)
--   - nómina equipo: 16,200 → 16,800
--   - profesor (4500), 7 estudiantes (1588-3578) sin cambio
-- =============================================================================

BEGIN;

UPDATE demo.curso_bd
SET sueldo_diario_mxn = 4200.00
WHERE tipo = 'equipo';

-- Defensa: verificar resultado
DO $$
DECLARE
    n_equipo            INTEGER;
    n_equipo_4200       INTEGER;
    sum_total           NUMERIC(12,2);
BEGIN
    SELECT COUNT(*)                                    INTO n_equipo       FROM demo.curso_bd WHERE tipo = 'equipo';
    SELECT COUNT(*) FILTER (WHERE sueldo_diario_mxn = 4200.00) INTO n_equipo_4200 FROM demo.curso_bd WHERE tipo = 'equipo';
    IF n_equipo <> 4 OR n_equipo_4200 <> 4 THEN
        RAISE EXCEPTION 'esperado 4 filas equipo todas con sueldo=4200; observado total=% en4200=%', n_equipo, n_equipo_4200;
    END IF;

    SELECT SUM(sueldo_diario_mxn) INTO sum_total FROM demo.curso_bd;
    IF sum_total <> 38575.00 THEN
        RAISE EXCEPTION 'SUM esperado 38575.00 MXN, observado %', sum_total;
    END IF;

    RAISE NOTICE '✓ migración 012 OK: equipo=4×4200=16800, SUM total=38575.00';
END $$;

COMMIT;

-- =============================================================================
-- Rollback (manual, restaura sueldos S15.2):
--   UPDATE demo.curso_bd SET sueldo_diario_mxn = 4200 WHERE nombre_completo='DAVID FERNANDO AVILA DIAZ';
--   UPDATE demo.curso_bd SET sueldo_diario_mxn = 4100 WHERE nombre_completo='GERARDO ANDRE BUTRON RAMIREZ';
--   UPDATE demo.curso_bd SET sueldo_diario_mxn = 4000 WHERE nombre_completo='EMILIANO SEBASTIAN MILLAN GIFFARD';
--   UPDATE demo.curso_bd SET sueldo_diario_mxn = 3900 WHERE nombre_completo='JOSE ROBERTO URIBE CLEMENTE';
-- =============================================================================
