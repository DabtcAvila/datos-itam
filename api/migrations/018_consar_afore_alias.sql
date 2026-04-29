-- =============================================================================
-- Migration 018: CONSAR afore_alias (S16 Sub-fase 2)
-- =============================================================================
--
-- Tabla puente para resolver strings de `afore` que aparecen en CSVs CONSAR
-- pero no matchean exactamente `consar.afores.nombre_csv`. Resuelve 3 fuentes
-- de divergencia ortográfica/histórica:
--
--   1) xxi-banorte (con guion) vs xxi banorte (con espacio): la forma con guion
--      es la usada en #01/#11 atómico (101K rows c/u), en #07 como 134 rows
--      raros (typo coexistente en el mismo dataset), y en #10 como prefix de
--      sub-variants. nombre_csv canónico se mantiene "xxi banorte" sin guion
--      por estabilidad del catálogo (decisión S16: aliases resuelven divergencia
--      ortográfica; no se mutan catálogos productivos)
--
--   2) xxi (legacy pre-fusión Banorte ≤2012-12): nomenclatura del afore XXI
--      standalone antes de fusionarse con Banorte en 2013. Cobertura empírica
--      en #11: 1997-01-07 → 2012-12-01 (3,664 fechas distintas), exactamente
--      el rango de XXI antes de la fusión. Misma entidad operacional
--
--   3) citibanamex (rebrand 2014, reverso 2025): Banamex fue adquirida por
--      Citigroup en 2001; el rebrand a "Citibanamex" ocurrió en 2014 (~13 años
--      después de la adquisición). En 2024 Citi anunció la venta de Banamex
--      a Grupo México con reverso de marca a "Banamex" en 2025. La AFORE como
--      entidad operacional se mantuvo continua durante todos estos cambios
--      corporativos. Decisión S16: alias del mismo afore_id para preservar
--      continuidad de series temporales 1997+
--
-- Pattern de uso en ingest scripts (Sub-fases siguientes):
--   def lookup_afore(s, canonical_map, alias_map):
--       if s in canonical_map: return canonical_map[s]
--       if s in alias_map:     return alias_map[s]
--       raise ValueError(f"unknown afore: {s}")
--
-- Sub-variants concat (xxi banorte 1..10, sura av1, profuturo cp, etc.) NO
-- viven aquí — esos requieren mapping (afore × siefore) en Sub-fase 4
-- (consar.afore_siefore_alias).
--
-- Décimo-octava migración. Séptima de la familia CONSAR (009 schema base,
-- 013 comisiones, 014 flujo_recurso, 015 traspaso, 016 pea_cotizantes,
-- 017 cat_siefore).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS consar.afore_alias (
    alias_text  VARCHAR(64)  NOT NULL PRIMARY KEY,
    afore_id    INTEGER      NOT NULL REFERENCES consar.afores(id) ON DELETE RESTRICT,
    fuente      VARCHAR(64),
    notas       TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_afore_alias_afore_id ON consar.afore_alias(afore_id);

COMMENT ON TABLE consar.afore_alias IS
    'Mapeo de strings divergentes en CSVs CONSAR (#01/#07/#10/#11) hacia consar.afores. '
    'Resuelve 3 casos: xxi-banorte (variante ortográfica con guion), xxi (legacy XXI pre-fusión 2012), '
    'citibanamex (rebrand 2014, reverso 2025). '
    'Sub-variants concat NO viven aquí — esos van a Sub-fase 4 con mapping (afore × siefore).';

COMMENT ON COLUMN consar.afore_alias.alias_text IS
    'String exacto como aparece en columna `afore` de los CSVs. Lookup en ingest tras fallar match con consar.afores.nombre_csv.';

COMMENT ON COLUMN consar.afore_alias.afore_id IS
    'FK a consar.afores. Múltiples aliases pueden apuntar al mismo afore_id (ej: xxi-banorte y xxi → mismo afore).';

COMMENT ON COLUMN consar.afore_alias.fuente IS
    'Datasets donde aparece el alias (informativo, no enforced).';

-- ------------------------------------------------------------------
-- Seed: 3 aliases
-- ------------------------------------------------------------------

INSERT INTO consar.afore_alias (alias_text, afore_id, fuente, notas) VALUES
    (
        'xxi-banorte',
        (SELECT id FROM consar.afores WHERE codigo = 'xxi_banorte'),
        'multi #01/#07/#10/#11',
        'Variante ortográfica con guion. nombre_csv canónico en migración 009 es "xxi banorte" sin guion. '
        'En #01/#11 atómico es la única forma del afore (101,394 rows c/u). '
        'En #07 aparece como 134 rows extra (typo: "xxi-banorte" hyphen vs "xxi banorte" space coexisten en mismo dataset). '
        'En #10 aparece sólo como prefix de sub-variants (xxi-banorte (sps1..10), xxi-banorte (siav)). '
        'Decisión S16: nombre_csv canónico se mantiene sin guion (estabilidad del catálogo, disciplina S2-S6); '
        'esta tabla resuelve la divergencia ortográfica.'
    ),
    (
        'xxi',
        (SELECT id FROM consar.afores WHERE codigo = 'xxi_banorte'),
        '#11 only',
        'Nomenclatura legacy del afore XXI standalone antes de la fusión con Banorte. '
        'Cobertura empírica en #11: 1997-01-07 → 2012-12-01 (3,664 fechas distintas), '
        'que es exactamente el rango de XXI antes de fusionarse a XXI-Banorte (2013+). '
        'Misma entidad operacional. Asociado únicamente a siefore sb5 (legacy pre-reforma 2019).'
    ),
    (
        'citibanamex',
        (SELECT id FROM consar.afores WHERE codigo = 'banamex'),
        '#01/#11',
        'Rebrand corporativo de Banamex a Citibanamex en 2014. '
        'La adquisición original de Banamex por Citigroup ocurrió en 2001 (~13 años antes del rebrand). '
        'En 2024, Citi anunció venta de Banamex a Grupo México con eventual reverso de marca a "Banamex" '
        '(rebrand reverso 2025). Misma entidad operacional continua de la AFORE durante todos estos cambios '
        'corporativos. Decisión S16: tratado como alias del mismo afore_id (no como afore distinto) para '
        'preservar continuidad de series temporales 1997+ — separar crearía discontinuidad artificial.'
    );

COMMIT;

-- =============================================================================
-- Rollback: DROP TABLE consar.afore_alias CASCADE;
-- =============================================================================
