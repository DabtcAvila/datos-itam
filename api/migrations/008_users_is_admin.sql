-- 008_users_is_admin.sql
-- Add is_admin flag to users. Only users with is_admin=TRUE will be
-- authorized for mutation endpoints (ingest, CRUD on personas/nombramientos/
-- catalogos, refresh-materialized-views, etc.).
--
-- Idempotent: safe to rerun.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
    SET is_admin = TRUE
    WHERE email = 'admin@datos-itam.org';
