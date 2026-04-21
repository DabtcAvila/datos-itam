-- Migration 003: Trigram extension + missing indexes for ILIKE searches
-- and window-function analytics endpoints (/api/v1/analytics/*).
--
-- NOTE: CREATE INDEX CONCURRENTLY is NOT used because it cannot run inside
-- a transaction block. On 246K rows each index takes ~2-8s and the lock is
-- acceptable. If running against a live production DB, run this outside
-- business hours or adapt to use CONCURRENTLY with psql in autocommit mode.

BEGIN;

-- ============================================================
-- 1. Extension for trigram-based ILIKE acceleration
-- ============================================================
-- Neon supports pg_trgm on the default role. If permission is missing
-- the statement fails and the remaining B-tree indexes still apply.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. GIN trigram indexes on text columns used in ILIKE
-- ============================================================
-- Used by /servidores?puesto_search= and /catalogos/puestos?search=
CREATE INDEX IF NOT EXISTS idx_cat_puestos_nombre_trgm
    ON cat_puestos USING gin (nombre gin_trgm_ops);

-- Used by /personas?nombre= (ILIKE over nombre + apellido_1 + apellido_2)
CREATE INDEX IF NOT EXISTS idx_personas_nombre_trgm
    ON personas USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_personas_apellido_1_trgm
    ON personas USING gin (apellido_1 gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_personas_apellido_2_trgm
    ON personas USING gin (apellido_2 gin_trgm_ops);

-- ============================================================
-- 3. Missing B-tree indexes on filter/sort columns
-- ============================================================
-- tipo_nomina_id is aggregated in dashboard stats but had no explicit index
CREATE INDEX IF NOT EXISTS idx_nomb_tipo_nomina
    ON nombramientos(tipo_nomina_id);

-- fecha_ingreso is used by seniority buckets (EXTRACT YEAR FROM AGE(...))
-- and by ORDER BY in /servidores?order_by=fecha_ingreso
CREATE INDEX IF NOT EXISTS idx_nomb_fecha_ingreso
    ON nombramientos(fecha_ingreso);

-- Composite index for /analytics/puestos/ranking (GROUP BY puesto, AVG(sueldo))
CREATE INDEX IF NOT EXISTS idx_nomb_puesto_sueldo
    ON nombramientos(puesto_id, sueldo_bruto);

COMMIT;
