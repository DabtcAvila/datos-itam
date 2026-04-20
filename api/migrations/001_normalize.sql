-- Migration 001: Normalize servidores_publicos into personas + nombramientos
-- Creates 2 new catalog tables (cat_sexos, cat_niveles_salariales)
-- and splits servidores_publicos into personas + nombramientos.

BEGIN;

-- ============================================================
-- 1. New catalogs
-- ============================================================

CREATE TABLE cat_sexos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE
);
INSERT INTO cat_sexos (nombre)
SELECT DISTINCT sexo FROM servidores_publicos ORDER BY sexo;

CREATE TABLE cat_niveles_salariales (
    id SERIAL PRIMARY KEY,
    clave INT NOT NULL UNIQUE
);
INSERT INTO cat_niveles_salariales (clave)
SELECT DISTINCT id_nivel_salarial
FROM servidores_publicos
WHERE id_nivel_salarial IS NOT NULL
ORDER BY id_nivel_salarial;

-- ============================================================
-- 2. personas table (identity data)
-- ============================================================

CREATE TABLE personas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    apellido_1 VARCHAR(200) NOT NULL,
    apellido_2 VARCHAR(200),
    sexo_id INT REFERENCES cat_sexos(id),
    edad INT
);

INSERT INTO personas (id, nombre, apellido_1, apellido_2, sexo_id, edad)
SELECT sp.id, sp.nombre, sp.apellido_1, sp.apellido_2, cs.id, sp.edad
FROM servidores_publicos sp
LEFT JOIN cat_sexos cs ON cs.nombre = sp.sexo;

-- Reset sequence to max id + 1
SELECT setval('personas_id_seq', (SELECT MAX(id) FROM personas));

-- ============================================================
-- 3. nombramientos table (appointment / role data)
-- ============================================================

CREATE TABLE nombramientos (
    id SERIAL PRIMARY KEY,
    persona_id INT NOT NULL REFERENCES personas(id),
    puesto_id INT REFERENCES cat_puestos(id),
    sector_id INT REFERENCES cat_sectores(id),
    tipo_nomina_id INT REFERENCES cat_tipos_nomina(id),
    tipo_contratacion_id INT REFERENCES cat_tipos_contratacion(id),
    tipo_personal_id INT REFERENCES cat_tipos_personal(id),
    universo_id INT REFERENCES cat_universos(id),
    nivel_salarial_id INT REFERENCES cat_niveles_salariales(id),
    fecha_ingreso DATE,
    sueldo_bruto NUMERIC(12,2),
    sueldo_neto NUMERIC(12,2)
);

INSERT INTO nombramientos (
    persona_id, puesto_id, sector_id, tipo_nomina_id,
    tipo_contratacion_id, tipo_personal_id, universo_id, nivel_salarial_id,
    fecha_ingreso, sueldo_bruto, sueldo_neto
)
SELECT
    sp.id, sp.puesto_id, sp.sector_id, sp.tipo_nomina_id,
    sp.tipo_contratacion_id, sp.tipo_personal_id, sp.universo_id,
    cns.id, sp.fecha_ingreso, sp.sueldo_bruto, sp.sueldo_neto
FROM servidores_publicos sp
LEFT JOIN cat_niveles_salariales cns ON cns.clave = sp.id_nivel_salarial;

-- ============================================================
-- 4. Indexes
-- ============================================================

CREATE INDEX idx_nomb_persona_id ON nombramientos(persona_id);
CREATE INDEX idx_nomb_sector_id ON nombramientos(sector_id);
CREATE INDEX idx_nomb_puesto_id ON nombramientos(puesto_id);
CREATE INDEX idx_nomb_sueldo_bruto ON nombramientos(sueldo_bruto);
CREATE INDEX idx_nomb_tipo_contratacion ON nombramientos(tipo_contratacion_id);
CREATE INDEX idx_nomb_tipo_personal ON nombramientos(tipo_personal_id);
CREATE INDEX idx_nomb_universo_id ON nombramientos(universo_id);
CREATE INDEX idx_nomb_nivel_salarial ON nombramientos(nivel_salarial_id);
CREATE INDEX idx_personas_sexo_id ON personas(sexo_id);
CREATE INDEX idx_personas_edad ON personas(edad);

-- ============================================================
-- 5. Compatibility view (for verification)
-- ============================================================

CREATE VIEW v_servidores_publicos AS
SELECT
    p.id, p.nombre, p.apellido_1, p.apellido_2,
    cs.nombre AS sexo, p.edad,
    n.puesto_id, n.tipo_nomina_id, n.tipo_contratacion_id,
    n.tipo_personal_id, n.fecha_ingreso, n.universo_id, n.sector_id,
    cns.clave AS id_nivel_salarial, n.sueldo_bruto, n.sueldo_neto
FROM personas p
JOIN nombramientos n ON n.persona_id = p.id
LEFT JOIN cat_sexos cs ON p.sexo_id = cs.id
LEFT JOIN cat_niveles_salariales cns ON n.nivel_salarial_id = cns.id;

-- ============================================================
-- 6. Drop old table
-- ============================================================

DROP TABLE servidores_publicos CASCADE;

COMMIT;
