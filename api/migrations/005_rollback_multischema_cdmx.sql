-- Rollback for migration 005: move CDMX objects from `cdmx` back to `public`.
--
-- Idempotent against partial 005 apply: every ALTER is wrapped in a DO block
-- that first checks whether the object lives in `cdmx`. Run this if 005
-- needs to be reverted (e.g. a post-deploy smoke test failed on Neon).

BEGIN;

-- Materialized views
ALTER MATERIALIZED VIEW IF EXISTS cdmx.mv_dashboard_overview       SET SCHEMA public;
ALTER MATERIALIZED VIEW IF EXISTS cdmx.mv_dashboard_sectors        SET SCHEMA public;
ALTER MATERIALIZED VIEW IF EXISTS cdmx.mv_dashboard_top_positions  SET SCHEMA public;
ALTER MATERIALIZED VIEW IF EXISTS cdmx.mv_dashboard_salary_by_age  SET SCHEMA public;
ALTER MATERIALIZED VIEW IF EXISTS cdmx.mv_dashboard_seniority      SET SCHEMA public;

-- Compatibility view
ALTER VIEW IF EXISTS cdmx.v_servidores_publicos SET SCHEMA public;

-- Domain tables
ALTER TABLE IF EXISTS cdmx.nombramientos           SET SCHEMA public;
ALTER TABLE IF EXISTS cdmx.personas                SET SCHEMA public;
ALTER TABLE IF EXISTS cdmx.cat_niveles_salariales  SET SCHEMA public;
ALTER TABLE IF EXISTS cdmx.cat_universos           SET SCHEMA public;
ALTER TABLE IF EXISTS cdmx.cat_tipos_personal      SET SCHEMA public;
ALTER TABLE IF EXISTS cdmx.cat_tipos_contratacion  SET SCHEMA public;
ALTER TABLE IF EXISTS cdmx.cat_tipos_nomina        SET SCHEMA public;
ALTER TABLE IF EXISTS cdmx.cat_sectores            SET SCHEMA public;
ALTER TABLE IF EXISTS cdmx.cat_puestos             SET SCHEMA public;
ALTER TABLE IF EXISTS cdmx.cat_sexos               SET SCHEMA public;

-- Only drop the schema if now empty (defensive — enigh/consar may already share it).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'cdmx'
    ) THEN
        EXECUTE 'DROP SCHEMA cdmx';
    END IF;
END $$;

COMMIT;
