-- =============================================================================
-- Migration 010: demo.curso_bd — tabla de demostración en vivo
-- =============================================================================
--
-- Crea schema `demo` y tabla `curso_bd` para una demostración pedagógica
-- de CRUD + auth + frontend reactivo durante el checkpoint académico ITAM
-- Bases de Datos 2026-04-28.
--
-- Schema separado por aislamiento:
--   - NO mezclar con cdmx / enigh / consar (datasets oficiales del observatorio).
--   - Si la tabla se vuelve obsoleta tras el checkpoint, `DROP SCHEMA demo CASCADE`
--     no afecta el resto del proyecto.
--
-- Modelo de uso:
--   - 12 filas seed (11 estudiantes + 1 profesor del curso 001).
--   - Campo `reclamar_bono` toggleable desde la ruta pública /demo con login
--     compartido (user `demoabril`, NO is_admin).
--   - Endpoints admin separados (`/api/v1/admin/demo/*`) permiten CREATE/DELETE/
--     EDIT/RESET; estos requieren is_admin=TRUE.
--
-- Auth model heredado de S8.6:
--   - `users.is_admin BOOLEAN` ya existe (migración 008).
--   - `require_admin` dependency cubre los endpoints admin.
--   - Nueva dependency `require_demo_user` (en este sprint S15) cubre el toggle:
--     valida JWT pero no exige is_admin.
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS demo;

CREATE TABLE demo.curso_bd (
    id                   SERIAL PRIMARY KEY,
    nombre_completo      VARCHAR(120) NOT NULL,
    rol                  VARCHAR(20)  NOT NULL,
    seccion              VARCHAR(40)  NOT NULL DEFAULT 'BASES DE DATOS - 001',
    reclamar_bono        BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT curso_bd_rol_ck
        CHECK (rol IN ('estudiante', 'profesor')),
    CONSTRAINT curso_bd_nombre_unq UNIQUE (nombre_completo)
);

COMMENT ON TABLE  demo.curso_bd IS
    'Curso ITAM Bases de Datos sección 001 (abril 2026). Tabla de demostración en vivo durante checkpoint académico — CRUD + auth + frontend reactivo. NO confundir con datasets oficiales del observatorio (cdmx/enigh/consar).';
COMMENT ON COLUMN demo.curso_bd.reclamar_bono IS
    'Toggle pedagógico expuesto en /demo. Cualquier usuario autenticado (compartido vía cuenta demoabril) puede modificarlo. Reset masivo via /api/v1/admin/demo/reset (admin-only).';

CREATE INDEX idx_curso_bd_rol  ON demo.curso_bd(rol);
CREATE INDEX idx_curso_bd_bono ON demo.curso_bd(reclamar_bono);

-- ------------------------------------------------------------------
-- Trigger: mantener fecha_actualizacion al día en cada UPDATE
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION demo.curso_bd_touch_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_curso_bd_touch_actualizacion
    BEFORE UPDATE ON demo.curso_bd
    FOR EACH ROW
    EXECUTE FUNCTION demo.curso_bd_touch_fecha_actualizacion();

-- ------------------------------------------------------------------
-- Seed: 11 estudiantes (alfabético) + 1 profesor (al final)
-- ------------------------------------------------------------------

INSERT INTO demo.curso_bd (nombre_completo, rol) VALUES
    ('FERNANDO ARELLANO GONZALEZ',          'estudiante'),
    ('DAVID FERNANDO AVILA DIAZ',           'estudiante'),
    ('GERARDO ANDRE BUTRON RAMIREZ',        'estudiante'),
    ('VALENTINA GARCIA RAMIREZ',            'estudiante'),
    ('MEYER HEMILSON ROSENTHAL',            'estudiante'),
    ('DIEGO HINOJOSA TELLEZ',               'estudiante'),
    ('PAULA LEON AGUILAR',                  'estudiante'),
    ('DIEGO MANRIQUE MEDINA',               'estudiante'),
    ('EMILIANO SEBASTIAN MILLAN GIFFARD',   'estudiante'),
    ('ANIEL SOPHIA ORIHUELA VILLEGAS',      'estudiante'),
    ('JOSE ROBERTO URIBE CLEMENTE',         'estudiante'),
    ('MARCO AUGUSTO VASQUEZ BELTRAN',       'profesor');

COMMIT;

-- =============================================================================
-- Rollback (manual): DROP SCHEMA demo CASCADE;
-- =============================================================================
