-- =============================================================================
-- Migration 019: CONSAR afore_siefore_alias (S16 Sub-fase 3)
-- =============================================================================
--
-- Tabla puente que descompone strings concat de #07 y #10 en tuplas atómicas
-- (afore_id, siefore_id). 34 aliases totales: 17 de #07 (notación NL+sufijo) y
-- 17 de #10 (notación parens). Cada uno apunta a un par (afore × siefore) que
-- existe canónicamente en consar.afores × consar.cat_siefore.
--
-- Pattern de uso en ingest scripts:
--   def lookup_subvariant(s, asa_map):
--       row = asa_map.get(s)  # (afore_id, siefore_id, validated)
--       if row is None: raise ValueError(f"unknown sub-variant: {s}")
--       return row
--
-- mapping_validated:
--   TRUE  → mapping confirmado por evidencia (CONSAR docs, bijection observada,
--           o publicación pública). 32 de 34 entries.
--   FALSE → mapping plausible pero no confirmado por documentación externa.
--           2 entries: sura av2 y sura av3 (search confirma sólo AV1=SIAV1;
--           av2/av3 inferidos por orden lexicográfico + 1:1 con #10).
--
-- validated_via (categórico, CHECK constraint):
--   'consar_prospecto'              — confirmado por título oficial de PDFs en
--                                     portal CONSAR (Profuturo SIAV titled "CP",
--                                     Profuturo SAC titled "LP")
--   'consar_publicacion'            — confirmado por publicación CONSAR
--                                     (rendimientos AFORE) que cita "SURA (SIAV1)"
--   'bijection_with_10'             — #07 y #10 ambos tienen la misma
--                                     cardinalidad de sub-variants para una
--                                     misma afore; mapping 1:1 vía #10 que es
--                                     groundtruth canónico (parens = siefore_id)
--   'inferencia_orden_lexicografico' — sin evidencia directa; inferido por
--                                     orden lexicográfico tras agotar matches
--                                     confirmados (sólo sura av2 y av3)
--
-- Sub-variants concat son artefactos pre-pivoteados de los CSVs CONSAR. La
-- representación canónica vive en #01/#11 atómico (afore + siefore separados).
-- Esta tabla revierte la pivotada para conformar el modelo canónico atomizado
-- (Opción D del análisis Fase 1, S16).
--
-- Décimo-novena migración. Octava de la familia CONSAR (009 schema base,
-- 013 comisiones, 014 flujo_recurso, 015 traspaso, 016 pea_cotizantes,
-- 017 cat_siefore, 018 afore_alias).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS consar.afore_siefore_alias (
    alias_text          VARCHAR(80)  NOT NULL PRIMARY KEY,
    afore_id            INTEGER      NOT NULL REFERENCES consar.afores(id)      ON DELETE RESTRICT,
    siefore_id          INTEGER      NOT NULL REFERENCES consar.cat_siefore(id) ON DELETE RESTRICT,
    fuente_csv          VARCHAR(8)   NOT NULL,
    mapping_validated   BOOLEAN      NOT NULL DEFAULT TRUE,
    validated_via       VARCHAR(64)  NOT NULL,
    notas               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT afore_siefore_alias_fuente_ck
        CHECK (fuente_csv IN ('#07','#10')),
    CONSTRAINT afore_siefore_alias_validated_via_ck
        CHECK (validated_via IN (
            'consar_prospecto',
            'consar_publicacion',
            'bijection_with_10',
            'inferencia_orden_lexicografico'
        ))
);

CREATE INDEX idx_afore_siefore_alias_afore_id   ON consar.afore_siefore_alias(afore_id);
CREATE INDEX idx_afore_siefore_alias_siefore_id ON consar.afore_siefore_alias(siefore_id);
CREATE INDEX idx_afore_siefore_alias_validated  ON consar.afore_siefore_alias(mapping_validated);
CREATE INDEX idx_afore_siefore_alias_fuente     ON consar.afore_siefore_alias(fuente_csv);

COMMENT ON TABLE consar.afore_siefore_alias IS
    'Descomposición de strings concat de #07/#10 en tuplas atómicas (afore_id, siefore_id). '
    '34 entries: 17 de #07 (notación con espacios y sufijos) + 17 de #10 (notación parens). '
    'Soporta el modelo canónico atomizado (Opción D, S16 Fase 1).';

COMMENT ON COLUMN consar.afore_siefore_alias.mapping_validated IS
    'TRUE para mappings confirmados por docs CONSAR, publicación CONSAR, o bijection con #10 (groundtruth canónico). '
    'FALSE para mappings plausibles sin evidencia documental directa (sólo 2 entries: sura av2, sura av3).';

COMMENT ON COLUMN consar.afore_siefore_alias.validated_via IS
    'Método de validación. Ver header de migración para definiciones.';

-- ------------------------------------------------------------------
-- Seed: 17 entries de #07
-- ------------------------------------------------------------------

INSERT INTO consar.afore_siefore_alias
    (alias_text, afore_id, siefore_id, fuente_csv, mapping_validated, validated_via, notas) VALUES
    -- XXI-Banorte: 10 SPS + 1 SIAV (ahorro individual). Bijección clara con #10 (mismo afore, 11 sub-variants ↔ 11 sub-variants en #10).
    ('xxi banorte 1',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps1'),  '#07', TRUE, 'bijection_with_10', 'XXI-Banorte SPS1. Bijection con #10 alias xxi-banorte (sps1).'),
    ('xxi banorte 2',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps2'),  '#07', TRUE, 'bijection_with_10', 'XXI-Banorte SPS2. Bijection con #10 alias xxi-banorte (sps2).'),
    ('xxi banorte 3',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps3'),  '#07', TRUE, 'bijection_with_10', 'XXI-Banorte SPS3. Bijection con #10 alias xxi-banorte (sps3).'),
    ('xxi banorte 4',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps4'),  '#07', TRUE, 'bijection_with_10', 'XXI-Banorte SPS4. Bijection con #10 alias xxi-banorte (sps4).'),
    ('xxi banorte 5',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps5'),  '#07', TRUE, 'bijection_with_10', 'XXI-Banorte SPS5. Bijection con #10 alias xxi-banorte (sps5).'),
    ('xxi banorte 6',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps6'),  '#07', TRUE, 'bijection_with_10', 'XXI-Banorte SPS6. Bijection con #10 alias xxi-banorte (sps6).'),
    ('xxi banorte 7',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps7'),  '#07', TRUE, 'bijection_with_10', 'XXI-Banorte SPS7. Bijection con #10 alias xxi-banorte (sps7).'),
    ('xxi banorte 8',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps8'),  '#07', TRUE, 'bijection_with_10', 'XXI-Banorte SPS8. Bijection con #10 alias xxi-banorte (sps8).'),
    ('xxi banorte 9',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps9'),  '#07', TRUE, 'bijection_with_10', 'XXI-Banorte SPS9. Bijection con #10 alias xxi-banorte (sps9).'),
    ('xxi banorte 10', (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps10'), '#07', TRUE, 'bijection_with_10', 'XXI-Banorte SPS10. Bijection con #10 alias xxi-banorte (sps10).'),
    ('xxi banorte ahorro individual', (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='siav'), '#07', TRUE, 'bijection_with_10', 'XXI-Banorte ahorro individual = SIAV (Subcuenta de Ahorro Voluntario). Bijection con #10 alias xxi-banorte (siav).'),
    -- Banamex: 1 sub-variant. Bijection con #10.
    ('banamex av plus', (SELECT id FROM consar.afores WHERE codigo='banamex'), (SELECT id FROM consar.cat_siefore WHERE slug='siav2'), '#07', TRUE, 'bijection_with_10', 'Banamex AV Plus = SIAV2. Bijection con #10 alias banamex (siav2).'),
    -- Profuturo: 2 sub-variants. CONFIRMADO por título oficial de PDFs en portal CONSAR.
    ('profuturo cp', (SELECT id FROM consar.afores WHERE codigo='profuturo'), (SELECT id FROM consar.cat_siefore WHERE slug='siav'), '#07', TRUE, 'consar_prospecto', 'Profuturo CP (Corto Plazo) = SIAV. Confirmado: prospecto Profuturo (SIAV).pdf en portal CONSAR titulado oficialmente "Sociedad de Inversion CP".'),
    ('profuturo lp', (SELECT id FROM consar.afores WHERE codigo='profuturo'), (SELECT id FROM consar.cat_siefore WHERE slug='sac'),  '#07', TRUE, 'consar_prospecto', 'Profuturo LP (Largo Plazo) = SAC. Confirmado: prospecto Profuturo (SAC).pdf en portal CONSAR titulado oficialmente "Sociedad de Inversion LP".'),
    -- Sura: 3 sub-variants. AV1=SIAV1 confirmado por publicación CONSAR; av2 y av3 inferidos por orden lexicográfico + bijection (mapping_validated=FALSE).
    ('sura av1', (SELECT id FROM consar.afores WHERE codigo='sura'), (SELECT id FROM consar.cat_siefore WHERE slug='siav1'), '#07', TRUE,  'consar_publicacion',           'SURA AV1 = SIAV1. Confirmado: publicacion CONSAR de rendimientos AFORE cita "SURA (SIAV1)" como afore con rendimiento 1.6% a 1 ano.'),
    ('sura av2', (SELECT id FROM consar.afores WHERE codigo='sura'), (SELECT id FROM consar.cat_siefore WHERE slug='siav2'), '#07', FALSE, 'inferencia_orden_lexicografico', 'SURA AV2 -> SIAV2. Sin evidencia documental directa. Inferido por orden lexicografico (av1=siav1 confirmado, av2/av3 ordenados ascendente) + bijection 3:3 con #10. Revisar si emerge evidencia contradictoria.'),
    ('sura av3', (SELECT id FROM consar.afores WHERE codigo='sura'), (SELECT id FROM consar.cat_siefore WHERE slug='siav'),  '#07', FALSE, 'inferencia_orden_lexicografico', 'SURA AV3 -> SIAV (sin sufijo). Sin evidencia documental directa. Inferido como resto unico disponible tras asignar av1=siav1 y av2=siav2. Revisar si emerge evidencia contradictoria.');

-- ------------------------------------------------------------------
-- Seed: 17 entries de #10
-- ------------------------------------------------------------------
-- Notación parens en #10 es groundtruth canónico — el contenido del paren
-- coincide directamente con slug de cat_siefore. Mapping bijección directa.

INSERT INTO consar.afore_siefore_alias
    (alias_text, afore_id, siefore_id, fuente_csv, mapping_validated, validated_via, notas) VALUES
    -- XXI-Banorte: 10 SPS + 1 SIAV
    ('xxi-banorte (sps1)',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps1'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa: contenido del paren = slug atomico en #01/#11.'),
    ('xxi-banorte (sps2)',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps2'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    ('xxi-banorte (sps3)',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps3'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    ('xxi-banorte (sps4)',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps4'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    ('xxi-banorte (sps5)',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps5'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    ('xxi-banorte (sps6)',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps6'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    ('xxi-banorte (sps7)',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps7'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    ('xxi-banorte (sps8)',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps8'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    ('xxi-banorte (sps9)',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps9'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    ('xxi-banorte (sps10)', (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='sps10'), '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    ('xxi-banorte (siav)',  (SELECT id FROM consar.afores WHERE codigo='xxi_banorte'), (SELECT id FROM consar.cat_siefore WHERE slug='siav'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    -- Banamex: 1
    ('banamex (siav2)', (SELECT id FROM consar.afores WHERE codigo='banamex'), (SELECT id FROM consar.cat_siefore WHERE slug='siav2'), '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    -- Profuturo: 2
    ('profuturo (sac)',  (SELECT id FROM consar.afores WHERE codigo='profuturo'), (SELECT id FROM consar.cat_siefore WHERE slug='sac'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa: profuturo (sac) = (profuturo, sac). Coherente con confirmacion docs CONSAR de profuturo lp = SAC.'),
    ('profuturo (siav)', (SELECT id FROM consar.afores WHERE codigo='profuturo'), (SELECT id FROM consar.cat_siefore WHERE slug='siav'), '#10', TRUE, 'bijection_with_10', 'Notacion parens directa: profuturo (siav) = (profuturo, siav). Coherente con confirmacion docs CONSAR de profuturo cp = SIAV.'),
    -- Sura: 3
    ('sura (siav)',  (SELECT id FROM consar.afores WHERE codigo='sura'), (SELECT id FROM consar.cat_siefore WHERE slug='siav'),  '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    ('sura (siav1)', (SELECT id FROM consar.afores WHERE codigo='sura'), (SELECT id FROM consar.cat_siefore WHERE slug='siav1'), '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.'),
    ('sura (siav2)', (SELECT id FROM consar.afores WHERE codigo='sura'), (SELECT id FROM consar.cat_siefore WHERE slug='siav2'), '#10', TRUE, 'bijection_with_10', 'Notacion parens directa.');

COMMIT;

-- =============================================================================
-- Rollback: DROP TABLE consar.afore_siefore_alias CASCADE;
-- =============================================================================
