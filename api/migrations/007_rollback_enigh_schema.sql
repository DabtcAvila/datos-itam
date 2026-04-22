-- =============================================================================
-- Rollback for migration 007: ENIGH 2024 (Nueva Serie) schema.
-- =============================================================================
--
-- ⚠️  DESTRUCTIVE. Drops the entire `enigh` schema and every object inside
--     (128 tables + all data + all comments). Use only to undo 007.
--
-- =============================================================================

BEGIN;

DROP SCHEMA IF EXISTS enigh CASCADE;

COMMIT;
