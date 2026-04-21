-- Migration 005: Multi-schema refactor — move CDMX dataset into schema `cdmx`.
--
-- Rationale: this project is evolving into a multi-dataset observatorio
-- (CDMX servidores públicos → ENIGH → CONSAR). Keeping every dataset in the
-- `public` schema would cause naming collisions (e.g. both CDMX and ENIGH
-- have a notion of "ingresos"). Moving each dataset into its own schema
-- creates a clean namespace per dataset.
--
-- `users` stays in `public` — it's transversal auth, not dataset-specific.
--
-- Strategy: ALTER ... SET SCHEMA preserves object OIDs, so:
--   - Foreign keys between the moved tables keep working (FKs are OID-based).
--   - Materialized views keep their data and UNIQUE indexes (no re-aggregation).
--   - Views keep their OID-bound column references.
-- The app uses unqualified table names everywhere; setting
-- `search_path='cdmx, public'` in app/database.py lets existing SQL resolve
-- to cdmx.* first and falls back to public.* for `users`.

BEGIN;

CREATE SCHEMA IF NOT EXISTS cdmx;

-- Domain tables (10): 2 data tables + 8 catalogs
ALTER TABLE public.personas                SET SCHEMA cdmx;
ALTER TABLE public.nombramientos           SET SCHEMA cdmx;
ALTER TABLE public.cat_sexos               SET SCHEMA cdmx;
ALTER TABLE public.cat_puestos             SET SCHEMA cdmx;
ALTER TABLE public.cat_sectores            SET SCHEMA cdmx;
ALTER TABLE public.cat_tipos_nomina        SET SCHEMA cdmx;
ALTER TABLE public.cat_tipos_contratacion  SET SCHEMA cdmx;
ALTER TABLE public.cat_tipos_personal      SET SCHEMA cdmx;
ALTER TABLE public.cat_universos           SET SCHEMA cdmx;
ALTER TABLE public.cat_niveles_salariales  SET SCHEMA cdmx;

-- Compatibility view (denormalized CSV shape)
ALTER VIEW public.v_servidores_publicos SET SCHEMA cdmx;

-- Materialized views — data + UNIQUE indexes move atomically with the MV.
ALTER MATERIALIZED VIEW public.mv_dashboard_overview       SET SCHEMA cdmx;
ALTER MATERIALIZED VIEW public.mv_dashboard_sectors        SET SCHEMA cdmx;
ALTER MATERIALIZED VIEW public.mv_dashboard_top_positions  SET SCHEMA cdmx;
ALTER MATERIALIZED VIEW public.mv_dashboard_salary_by_age  SET SCHEMA cdmx;
ALTER MATERIALIZED VIEW public.mv_dashboard_seniority      SET SCHEMA cdmx;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification (run interactively after apply):
--
--   SELECT schemaname, COUNT(*) AS n
--     FROM pg_tables
--    WHERE tablename IN (
--      'personas','nombramientos','cat_sexos','cat_puestos','cat_sectores',
--      'cat_tipos_nomina','cat_tipos_contratacion','cat_tipos_personal',
--      'cat_universos','cat_niveles_salariales','users'
--    )
--    GROUP BY schemaname;
--   -- Expected: cdmx=10, public=1
--
--   SELECT schemaname, matviewname
--     FROM pg_matviews
--    WHERE matviewname LIKE 'mv_dashboard%';
--   -- Expected: all 5 in cdmx schema
--
--   SELECT COUNT(*) FROM cdmx.personas;        -- 246,821
--   SELECT COUNT(*) FROM cdmx.nombramientos;   -- 246,821
-- ---------------------------------------------------------------------------
