-- Migration 004: Materialized views for /dashboard/stats hot path.
--
-- Replaces 5 of the 11 SQL queries in app/routers/dashboard.py with MVs
-- backed by UNIQUE indexes (required for REFRESH MATERIALIZED VIEW CONCURRENTLY).
--
-- Refresh strategy: POST /api/v1/admin/refresh-materialized-views
-- (JWT-protected). Call after /api/v1/ingest/csv runs or on a nightly cron.
--
-- The 6 remaining SQLs in dashboard.py (SALARY_DISTRIBUTION, AGE_DISTRIBUTION,
-- CONTRACT_TYPES, PERSONAL_TYPES, BRUTO_NETO_BY_RANGE) stay inline because
-- they are cheap enough with existing indexes and don't justify materializing.

BEGIN;

-- ============================================================
-- 1. mv_dashboard_overview (single-row summary)
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_overview CASCADE;
CREATE MATERIALIZED VIEW mv_dashboard_overview AS
SELECT
    1 AS key,
    COUNT(*) AS total,
    COUNT(DISTINCT n.sector_id) AS total_sectors,
    AVG(n.sueldo_bruto)::float AS avg_salary,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY n.sueldo_bruto)::float AS median_salary,
    MIN(n.sueldo_bruto)::float AS min_salary,
    MAX(n.sueldo_bruto)::float AS max_salary,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY n.sueldo_bruto)::float AS p25,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY n.sueldo_bruto)::float AS p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY n.sueldo_bruto)::float AS p75,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY n.sueldo_bruto)::float AS p90,
    COUNT(*) FILTER (WHERE csex.nombre = 'MASCULINO') AS hombres,
    COUNT(*) FILTER (WHERE csex.nombre = 'FEMENINO') AS mujeres,
    AVG(n.sueldo_bruto) FILTER (WHERE csex.nombre = 'MASCULINO')::float AS avg_male,
    AVG(n.sueldo_bruto) FILTER (WHERE csex.nombre = 'FEMENINO')::float AS avg_female,
    AVG(n.sueldo_neto)::float AS avg_net,
    AVG(n.sueldo_bruto - n.sueldo_neto)::float AS avg_deduction,
    CASE WHEN AVG(n.sueldo_bruto) > 0
        THEN (AVG(n.sueldo_bruto - n.sueldo_neto) / AVG(n.sueldo_bruto) * 100)::float
        ELSE 0 END AS avg_deduction_pct,
    AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, n.fecha_ingreso)))::float AS avg_seniority
FROM nombramientos n
JOIN personas p ON n.persona_id = p.id
LEFT JOIN cat_sexos csex ON p.sexo_id = csex.id
WHERE n.sueldo_bruto IS NOT NULL;

CREATE UNIQUE INDEX idx_mv_dashboard_overview_key
    ON mv_dashboard_overview(key);

-- ============================================================
-- 2. mv_dashboard_sectors
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_sectors CASCADE;
CREATE MATERIALIZED VIEW mv_dashboard_sectors AS
SELECT
    cs.id AS sector_id,
    cs.nombre AS name,
    COUNT(n.id) AS count,
    AVG(n.sueldo_bruto)::float AS avg_salary,
    COALESCE(AVG(n.sueldo_bruto) FILTER (WHERE csex.nombre = 'MASCULINO'), 0)::float AS avg_male,
    COALESCE(AVG(n.sueldo_bruto) FILTER (WHERE csex.nombre = 'FEMENINO'), 0)::float AS avg_female
FROM cat_sectores cs
JOIN nombramientos n ON n.sector_id = cs.id
JOIN personas p ON n.persona_id = p.id
LEFT JOIN cat_sexos csex ON p.sexo_id = csex.id
WHERE n.sueldo_bruto IS NOT NULL
GROUP BY cs.id, cs.nombre
ORDER BY count DESC;

CREATE UNIQUE INDEX idx_mv_dashboard_sectors_id
    ON mv_dashboard_sectors(sector_id);

-- ============================================================
-- 3. mv_dashboard_top_positions
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_top_positions CASCADE;
CREATE MATERIALIZED VIEW mv_dashboard_top_positions AS
SELECT
    cp.id AS puesto_id,
    cp.nombre AS name,
    COUNT(*) AS count,
    AVG(n.sueldo_bruto)::float AS avg_salary
FROM nombramientos n
JOIN cat_puestos cp ON n.puesto_id = cp.id
WHERE n.sueldo_bruto IS NOT NULL
GROUP BY cp.id, cp.nombre
ORDER BY avg_salary DESC
LIMIT 10;

CREATE UNIQUE INDEX idx_mv_dashboard_top_positions_id
    ON mv_dashboard_top_positions(puesto_id);

-- ============================================================
-- 4. mv_dashboard_salary_by_age
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_salary_by_age CASCADE;
CREATE MATERIALIZED VIEW mv_dashboard_salary_by_age AS
SELECT label, avg, ord FROM (
    SELECT '18-25' AS label, AVG(n.sueldo_bruto)::float AS avg, 1 AS ord
    FROM nombramientos n JOIN personas p ON n.persona_id = p.id
    WHERE p.edad BETWEEN 18 AND 25 AND n.sueldo_bruto IS NOT NULL
    UNION ALL
    SELECT '26-35', AVG(n.sueldo_bruto)::float, 2
    FROM nombramientos n JOIN personas p ON n.persona_id = p.id
    WHERE p.edad BETWEEN 26 AND 35 AND n.sueldo_bruto IS NOT NULL
    UNION ALL
    SELECT '36-45', AVG(n.sueldo_bruto)::float, 3
    FROM nombramientos n JOIN personas p ON n.persona_id = p.id
    WHERE p.edad BETWEEN 36 AND 45 AND n.sueldo_bruto IS NOT NULL
    UNION ALL
    SELECT '46-55', AVG(n.sueldo_bruto)::float, 4
    FROM nombramientos n JOIN personas p ON n.persona_id = p.id
    WHERE p.edad BETWEEN 46 AND 55 AND n.sueldo_bruto IS NOT NULL
    UNION ALL
    SELECT '56+', AVG(n.sueldo_bruto)::float, 5
    FROM nombramientos n JOIN personas p ON n.persona_id = p.id
    WHERE p.edad > 55 AND n.sueldo_bruto IS NOT NULL
) sub;

CREATE UNIQUE INDEX idx_mv_dashboard_salary_by_age_label
    ON mv_dashboard_salary_by_age(label);

-- ============================================================
-- 5. mv_dashboard_seniority (merges seniority distribution + salary_by_seniority)
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_seniority CASCADE;
CREATE MATERIALIZED VIEW mv_dashboard_seniority AS
SELECT label, ord, count_all, count_with_salary, avg_salary FROM (
    SELECT '0-2 años' AS label, 1 AS ord,
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 0 AND 2) AS count_all,
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 0 AND 2) AS count_with_salary,
        (SELECT AVG(sueldo_bruto)::float FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 0 AND 2) AS avg_salary
    UNION ALL
    SELECT '3-5 años', 2,
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 3 AND 5),
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 3 AND 5),
        (SELECT AVG(sueldo_bruto)::float FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 3 AND 5)
    UNION ALL
    SELECT '6-10 años', 3,
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 6 AND 10),
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 6 AND 10),
        (SELECT AVG(sueldo_bruto)::float FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 6 AND 10)
    UNION ALL
    SELECT '11-20 años', 4,
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 11 AND 20),
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 11 AND 20),
        (SELECT AVG(sueldo_bruto)::float FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 11 AND 20)
    UNION ALL
    SELECT '21-30 años', 5,
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 21 AND 30),
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 21 AND 30),
        (SELECT AVG(sueldo_bruto)::float FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) BETWEEN 21 AND 30)
    UNION ALL
    SELECT '30+ años', 6,
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) > 30),
        (SELECT COUNT(*) FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) > 30),
        (SELECT AVG(sueldo_bruto)::float FROM nombramientos
         WHERE fecha_ingreso IS NOT NULL AND sueldo_bruto IS NOT NULL
           AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso)) > 30)
) sub;

CREATE UNIQUE INDEX idx_mv_dashboard_seniority_label
    ON mv_dashboard_seniority(label);

COMMIT;
