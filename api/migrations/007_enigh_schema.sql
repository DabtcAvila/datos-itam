-- =============================================================================
-- Migration 007: ENIGH 2024 (Nueva Serie) schema — FULL INGEST (v2)
-- =============================================================================
--
-- Creates the `enigh` namespace for INEGI's ENIGH 2024 Nueva Serie dataset.
-- This migration supersedes 006_enigh_schema.sql (never applied, see
-- enigh-schema-plan-v2.md §1 for the 4 bugs it contained).
--
-- Scope (per api/docs/enigh-schema-plan-v2.md):
--   * 111 catalog tables (enigh.cat_<name>), populated from INEGI's
--     catalogos/*.csv at ingest time.
--   * 17 data tables (enigh.<dataset>), covering all 957 columns across
--     the official diccionarios — no column dropping.
--   * 1 computed column: enigh.concentradohogar.decil SMALLINT NULL with
--     CHECK (decil IS NULL OR decil BETWEEN 1 AND 10). Populated in S3
--     via UPDATE + NTILE(10) OVER (ORDER BY ing_cor * factor).
--
-- Primary keys:
--   15 data tables use the natural tuple from INEGI's survey design.
--   2 tables (gastoshogar, gastospersona) use a surrogate
--   `id BIGSERIAL PRIMARY KEY`: the natural tuple has duplicates in the
--   real CSV because INEGI records each expense event as a separate row
--   (not an aggregate per hogar). A plain B-tree index is created over
--   the natural tuple for join/agg performance, but no UNIQUE constraint
--   (would document a falsehood). See COMMENT ON TABLE on each.
--
-- Foreign keys:
--   Declared as COMMENT ON COLUMN annotations rather than hard FK
--   constraints. INEGI does not publish referential guarantees and we
--   prefer documentation-only FKs over ingest brittleness.
--
-- Generator: api/scripts/generate_enigh_migration_007.py (stdlib-only,
-- deterministic, idempotent). DO NOT hand-edit this file — re-run the
-- generator if anything needs to change.
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS enigh;

-- ------------------------------------------------------------------
-- Catalogs (111 tables)
-- ------------------------------------------------------------------

CREATE TABLE enigh.cat_ab_agua (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_acc_alim18 (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_act_pnea (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(99) NOT NULL
);

CREATE TABLE enigh.cat_agua_ent (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_agua_noe (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_antec_esc (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_cantidades (
    clave        VARCHAR(16) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_causa_no_cosecha (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_cicloagr (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_clas_emp (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_clase_hog (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_combus (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_ct_futuro (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_destino (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_disc (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_disp_elect (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_dotac_agua (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_drenaje (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_edo_conyug (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_edu_ini (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(91) NOT NULL
);

CREATE TABLE enigh.cat_educa_jefe (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_eli_basura (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_entidad (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_escrituras (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_est_socio (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_excusado (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_fecha (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_fenomeno (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_fogon_chi (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_forma_b (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_forma_c (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_forma_pag (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_fpago (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_frec_dicon (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_frec_rem (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_frecuencia (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_gastonegocioagro (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(70) NOT NULL
);

CREATE TABLE enigh.cat_gastos (
    clave        VARCHAR(6) PRIMARY KEY,
    descripcion  VARCHAR(163) NOT NULL
);

CREATE TABLE enigh.cat_gastoscontarjeta (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(108) NOT NULL
);

CREATE TABLE enigh.cat_grado (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_gradoaprob (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_habito (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_id_trabajo (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_ingresos_cat (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(115) NOT NULL
);

CREATE TABLE enigh.cat_inscr (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_inst (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(77) NOT NULL
);

CREATE TABLE enigh.cat_inst_salud (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_lenguaind (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_lts_licon (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_lugact (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_lugar_coc (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_lugar_comp (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_mat_pared (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_mat_pisos (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_mat_techos (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_medtrab (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_mes (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_mes_dia (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_motivo_aus (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_nivel (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(88) NOT NULL
);

CREATE TABLE enigh.cat_nivelaprob (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_no_asis (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(77) NOT NULL
);

CREATE TABLE enigh.cat_no_asisb (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(89) NOT NULL
);

CREATE TABLE enigh.cat_no_ing (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(98) NOT NULL
);

CREATE TABLE enigh.cat_noagro_y_gastos (
    clave        VARCHAR(6) PRIMARY KEY,
    descripcion  VARCHAR(163) NOT NULL
);

CREATE TABLE enigh.cat_noatenc (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_nofpago (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_norecib (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_num_trabaj (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_numesta (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_nvo_act (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_nvo_prog (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_orga_inst (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_otorg_b (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_otorg_c (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_pago (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_pago_dicon (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_pagoaten (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_pais_nac (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_parentesco (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(75) NOT NULL
);

CREATE TABLE enigh.cat_peract (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_prestacion (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_procaptar (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_producto (
    clave        VARCHAR(6) PRIMARY KEY,
    descripcion  VARCHAR(111) NOT NULL
);

CREATE TABLE enigh.cat_productoagricola (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(223) NOT NULL
);

CREATE TABLE enigh.cat_razon (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(70) NOT NULL
);

CREATE TABLE enigh.cat_redsoc (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_reg_cont (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(68) NOT NULL
);

CREATE TABLE enigh.cat_residencia (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_sanit_agua (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_scian (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(209) NOT NULL
);

CREATE TABLE enigh.cat_segvol (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_servmed (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_sexo (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_si_no (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_si_no_noaplica (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_si_no_nosabe (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_sinco (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(174) NOT NULL
);

CREATE TABLE enigh.cat_tam_emp (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_tam_loc (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_tenencia (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_tipo_adqui (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_tipo_finan (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_tipo_gasto (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(68) NOT NULL
);

CREATE TABLE enigh.cat_tipo_viv (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_tipoact (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_tipocontr (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_tipoesc (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_trabajo_mp (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);

CREATE TABLE enigh.cat_ubica_geo (
    clave        VARCHAR(5) PRIMARY KEY,
    descripcion  VARCHAR(70) NOT NULL
);

CREATE TABLE enigh.cat_usotiempo (
    clave        VARCHAR(4) PRIMARY KEY,
    descripcion  VARCHAR(64) NOT NULL
);


-- ------------------------------------------------------------------
-- Data tables (17 tables, 957 columns + decil on concentradohogar)
-- ------------------------------------------------------------------

-- --- agro (66 columns, PK=('folioviv', 'foliohog', 'numren', 'id_trabajo', 'tipoact')) ---
CREATE TABLE enigh.agro (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    numren          VARCHAR(2) NOT NULL,
    id_trabajo      VARCHAR(1) NOT NULL,
    tipoact         VARCHAR(1) NOT NULL,
    cose_cria       VARCHAR(1),
    prep_deriv      VARCHAR(1),
    otro_pago       VARCHAR(1),
    fpago_1         VARCHAR(1),
    fpago_2         VARCHAR(1),
    fpago_3         VARCHAR(1),
    fpago_4         VARCHAR(1),
    fpago_5         VARCHAR(1),
    fpago_6         VARCHAR(1),
    fpago_7         VARCHAR(1),
    fpago_8         VARCHAR(1),
    nofpago         VARCHAR(1),
    t_emp           SMALLINT,
    h_emp           SMALLINT,
    m_emp           SMALLINT,
    t_cpago         SMALLINT,
    h_cpago         SMALLINT,
    m_cpago         SMALLINT,
    t_ispago        SMALLINT,
    h_ispago        SMALLINT,
    m_ispago        SMALLINT,
    t_nispago       SMALLINT,
    h_nispago       SMALLINT,
    m_nispago       SMALLINT,
    valrema         INTEGER,
    valproc         INTEGER,
    apoyo           VARCHAR(1),
    apoyo_1         INTEGER,
    apoyo_2         INTEGER,
    apoyo_3         INTEGER,
    apoyo_4         INTEGER,
    apoyo_5         INTEGER,
    apoyo_6         INTEGER,
    apoyo_7         INTEGER,
    apoyo_8         INTEGER,
    proagro         INTEGER,
    mesproc         VARCHAR(2),
    progan          INTEGER,
    mesprogan       VARCHAR(2),
    nvo_apoyo       VARCHAR(1),
    nvo_prog1       VARCHAR(4),
    nvo_act1        VARCHAR(1),
    nvo_cant1       INTEGER,
    nvo_prog2       VARCHAR(4),
    nvo_act2        VARCHAR(1),
    nvo_cant2       INTEGER,
    nvo_prog3       VARCHAR(4),
    nvo_act3        VARCHAR(1),
    nvo_cant3       INTEGER,
    reg_not         VARCHAR(1),
    reg_cont        VARCHAR(1),
    ventas          BIGINT,
    autocons        BIGINT,
    otrosnom        BIGINT,
    gasneg          BIGINT,
    ventas_tri      NUMERIC(12, 2),
    auto_tri        NUMERIC(12, 2),
    otros_tri       NUMERIC(12, 2),
    gasto_tri       NUMERIC(12, 2),
    ing_tri         NUMERIC(12, 2),
    ero_tri         NUMERIC(12, 2),
    PRIMARY KEY (folioviv, foliohog, numren, id_trabajo, tipoact)
);

-- --- agroconsumo (11 columns, PK=('folioviv', 'foliohog', 'numren', 'id_trabajo', 'tipoact', 'numprod', 'destino')) ---
CREATE TABLE enigh.agroconsumo (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    numren          VARCHAR(2) NOT NULL,
    id_trabajo      VARCHAR(1) NOT NULL,
    tipoact         VARCHAR(1) NOT NULL,
    numprod         VARCHAR(2) NOT NULL,
    codigo          VARCHAR(3),
    cosecha         VARCHAR(1),
    destino         VARCHAR(1) NOT NULL,
    cantidad        INTEGER,
    valestim        INTEGER,
    PRIMARY KEY (folioviv, foliohog, numren, id_trabajo, tipoact, numprod, destino)
);

-- --- agrogasto (7 columns, PK=('folioviv', 'foliohog', 'numren', 'id_trabajo', 'tipoact', 'clave')) ---
CREATE TABLE enigh.agrogasto (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    numren          VARCHAR(2) NOT NULL,
    id_trabajo      VARCHAR(1) NOT NULL,
    tipoact         VARCHAR(1) NOT NULL,
    clave           VARCHAR(3) NOT NULL,
    gasto           INTEGER,
    PRIMARY KEY (folioviv, foliohog, numren, id_trabajo, tipoact, clave)
);

-- --- agroproductos (25 columns, PK=('folioviv', 'foliohog', 'numren', 'id_trabajo', 'tipoact', 'numprod')) ---
CREATE TABLE enigh.agroproductos (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    numren          VARCHAR(2) NOT NULL,
    id_trabajo      VARCHAR(1) NOT NULL,
    tipoact         VARCHAR(1) NOT NULL,
    numprod         VARCHAR(2) NOT NULL,
    codigo          VARCHAR(3),
    cosecha         VARCHAR(1),
    aparce          VARCHAR(1),
    nocos           VARCHAR(1),
    vendio          VARCHAR(1),
    uso_hog         VARCHAR(1),
    uso_prod        VARCHAR(1),
    deu_hog         VARCHAR(1),
    deu_neg         VARCHAR(1),
    pag_trab        VARCHAR(1),
    uso_reg         VARCHAR(1),
    uso_int         VARCHAR(1),
    cicloagr        VARCHAR(1),
    cantidad        INTEGER,
    cant_venta      INTEGER,
    vtapie          INTEGER,
    valor           BIGINT,
    preciokg        NUMERIC(9, 2),
    val_venta       BIGINT,
    PRIMARY KEY (folioviv, foliohog, numren, id_trabajo, tipoact, numprod)
);

-- --- concentradohogar (126 columns, PK=('folioviv', 'foliohog')) ---
CREATE TABLE enigh.concentradohogar (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    ubica_geo       VARCHAR(5),
    tam_loc         VARCHAR(1),
    est_socio       VARCHAR(1),
    est_dis         VARCHAR(3),
    upm             VARCHAR(7),
    factor          INTEGER,
    clase_hog       VARCHAR(1),
    sexo_jefe       VARCHAR(1),
    edad_jefe       SMALLINT,
    educa_jefe      VARCHAR(2),
    tot_integ       SMALLINT,
    hombres         SMALLINT,
    mujeres         SMALLINT,
    mayores         SMALLINT,
    menores         SMALLINT,
    p12_64          SMALLINT,
    p65mas          SMALLINT,
    ocupados        SMALLINT,
    percep_ing      SMALLINT,
    perc_ocupa      SMALLINT,
    ing_cor         NUMERIC(12, 2),
    ingtrab         NUMERIC(12, 2),
    trabajo         NUMERIC(12, 2),
    sueldos         NUMERIC(12, 2),
    horas_extr      NUMERIC(12, 2),
    comisiones      NUMERIC(12, 2),
    aguinaldo       NUMERIC(12, 2),
    indemtrab       NUMERIC(12, 2),
    otra_rem        NUMERIC(12, 2),
    remu_espec      NUMERIC(12, 2),
    negocio         NUMERIC(12, 2),
    noagrop         NUMERIC(12, 2),
    industria       NUMERIC(12, 2),
    comercio        NUMERIC(12, 2),
    servicios       NUMERIC(12, 2),
    agrope          NUMERIC(12, 2),
    agricolas       NUMERIC(12, 2),
    pecuarios       NUMERIC(12, 2),
    reproducc       NUMERIC(12, 2),
    pesca           NUMERIC(12, 2),
    otros_trab      NUMERIC(12, 2),
    rentas          NUMERIC(12, 2),
    utilidad        NUMERIC(12, 2),
    arrenda         NUMERIC(12, 2),
    transfer        NUMERIC(12, 2),
    jubilacion      NUMERIC(12, 2),
    becas           NUMERIC(12, 2),
    donativos       NUMERIC(12, 2),
    remesas         NUMERIC(12, 2),
    bene_gob        NUMERIC(12, 2),
    transf_hog      NUMERIC(12, 2),
    trans_inst      NUMERIC(12, 2),
    estim_alqu      NUMERIC(12, 2),
    otros_ing       NUMERIC(12, 2),
    gasto_mon       NUMERIC(12, 2),
    alimentos       NUMERIC(12, 2),
    ali_dentro      NUMERIC(12, 2),
    cereales        NUMERIC(12, 2),
    carnes          NUMERIC(12, 2),
    pescado         NUMERIC(12, 2),
    leche           NUMERIC(12, 2),
    huevo           NUMERIC(12, 2),
    aceites         NUMERIC(12, 2),
    tuberculo       NUMERIC(12, 2),
    verduras        NUMERIC(12, 2),
    frutas          NUMERIC(12, 2),
    azucar          NUMERIC(12, 2),
    cafe            NUMERIC(12, 2),
    especias        NUMERIC(12, 2),
    otros_alim      NUMERIC(12, 2),
    bebidas         NUMERIC(12, 2),
    ali_fuera       NUMERIC(12, 2),
    tabaco          NUMERIC(12, 2),
    vesti_calz      NUMERIC(12, 2),
    vestido         NUMERIC(12, 2),
    calzado         NUMERIC(12, 2),
    vivienda        NUMERIC(12, 2),
    alquiler        NUMERIC(12, 2),
    pred_cons       NUMERIC(12, 2),
    agua            NUMERIC(12, 2),
    energia         NUMERIC(12, 2),
    limpieza        NUMERIC(12, 2),
    cuidados        NUMERIC(12, 2),
    utensilios      NUMERIC(12, 2),
    enseres         NUMERIC(12, 2),
    salud           NUMERIC(12, 2),
    ambul_serv      NUMERIC(12, 2),
    aten_hosp       NUMERIC(12, 2),
    medic_prod      NUMERIC(12, 2),
    transporte      NUMERIC(12, 2),
    publico         NUMERIC(12, 2),
    foraneo         NUMERIC(12, 2),
    adqui_vehi      NUMERIC(12, 2),
    mantenim        NUMERIC(12, 2),
    refaccion       NUMERIC(12, 2),
    combus          NUMERIC(12, 2),
    comunica        NUMERIC(12, 2),
    educa_espa      NUMERIC(12, 2),
    educacion       NUMERIC(12, 2),
    esparci         NUMERIC(12, 2),
    paq_turist      NUMERIC(12, 2),
    personales      NUMERIC(12, 2),
    cuida_pers      NUMERIC(12, 2),
    acces_pers      NUMERIC(12, 2),
    otros_gas       NUMERIC(12, 2),
    transf_gas      NUMERIC(12, 2),
    percep_tot      NUMERIC(12, 2),
    retiro_inv      NUMERIC(12, 2),
    prestamos       NUMERIC(12, 2),
    otras_perc      NUMERIC(12, 2),
    ero_nm_viv      NUMERIC(12, 2),
    ero_nm_hog      NUMERIC(12, 2),
    erogac_tot      NUMERIC(12, 2),
    cuota_viv       NUMERIC(12, 2),
    mater_serv      NUMERIC(12, 2),
    material        NUMERIC(12, 2),
    servicio        NUMERIC(12, 2),
    deposito        NUMERIC(12, 2),
    prest_terc      NUMERIC(12, 2),
    pago_tarje      NUMERIC(12, 2),
    deudas          NUMERIC(12, 2),
    balance         NUMERIC(12, 2),
    otras_erog      NUMERIC(12, 2),
    smg             NUMERIC(8, 2),
    decil           SMALLINT NULL,
    PRIMARY KEY (folioviv, foliohog)
);
ALTER TABLE enigh.concentradohogar
    ADD CONSTRAINT concentradohogar_decil_check
    CHECK (decil IS NULL OR decil BETWEEN 1 AND 10);

-- --- erogaciones (16 columns, PK=('folioviv', 'foliohog', 'clave')) ---
CREATE TABLE enigh.erogaciones (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    clave           VARCHAR(6) NOT NULL,
    mes_1           VARCHAR(2),
    mes_2           VARCHAR(2),
    mes_3           VARCHAR(2),
    mes_4           VARCHAR(2),
    mes_5           VARCHAR(2),
    mes_6           VARCHAR(2),
    ero_1           INTEGER,
    ero_2           INTEGER,
    ero_3           INTEGER,
    ero_4           INTEGER,
    ero_5           INTEGER,
    ero_6           INTEGER,
    ero_tri         NUMERIC(12, 2),
    PRIMARY KEY (folioviv, foliohog, clave)
);

-- --- gastoshogar (31 columns, PK=('folioviv', 'foliohog', 'clave')) ---
CREATE TABLE enigh.gastoshogar (
    id              BIGSERIAL PRIMARY KEY,
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    clave           VARCHAR(6) NOT NULL,
    tipo_gasto      VARCHAR(2),
    mes_dia         VARCHAR(4),
    forma_pag1      VARCHAR(2),
    forma_pag2      VARCHAR(2),
    forma_pag3      VARCHAR(2),
    lugar_comp      VARCHAR(2),
    orga_inst       VARCHAR(2),
    frecuencia      VARCHAR(1),
    fecha_adqu      VARCHAR(4),
    fecha_pago      VARCHAR(4),
    cantidad        NUMERIC(10, 3),
    gasto           NUMERIC(10, 2),
    pago_mp         NUMERIC(10, 2),
    costo           NUMERIC(10, 2),
    inmujer         NUMERIC(10, 2),
    inst_1          VARCHAR(2),
    inst_2          VARCHAR(2),
    num_meses       SMALLINT,
    num_pagos       SMALLINT,
    ultim_pago      VARCHAR(4),
    gasto_tri       NUMERIC(12, 2),
    gasto_nm        NUMERIC(10, 2),
    gas_nm_tri      NUMERIC(12, 2),
    imujer_tri      NUMERIC(12, 2),
    entidad         VARCHAR(2),
    est_dis         VARCHAR(3),
    upm             VARCHAR(7),
    factor          INTEGER
);
CREATE INDEX idx_gastoshogar_nk ON enigh.gastoshogar (folioviv, foliohog, clave);
COMMENT ON TABLE enigh.gastoshogar IS
    'Cada fila representa un evento individual de gasto del hogar. Múltiples filas pueden compartir (folioviv, foliohog, clave): INEGI registra cada ocurrencia del gasto por hogar en el periodo. Para agregar por hogar usar GROUP BY (folioviv, foliohog[, clave]). PK surrogate id BIGSERIAL; no hay UNIQUE sobre la tupla natural porque no es única por diseño del cuestionario.';

-- --- gastospersona (23 columns, PK=('folioviv', 'foliohog', 'numren', 'clave')) ---
CREATE TABLE enigh.gastospersona (
    id              BIGSERIAL PRIMARY KEY,
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    numren          VARCHAR(2) NOT NULL,
    clave           VARCHAR(6) NOT NULL,
    tipo_gasto      VARCHAR(2),
    mes_dia         VARCHAR(4),
    frec_rem        VARCHAR(1),
    inst            VARCHAR(2),
    forma_pag1      VARCHAR(2),
    forma_pag2      VARCHAR(2),
    forma_pag3      VARCHAR(2),
    inscrip         INTEGER,
    colegia         INTEGER,
    cantidad        NUMERIC(10, 3),
    gasto           NUMERIC(10, 2),
    costo           NUMERIC(10, 2),
    gasto_tri       NUMERIC(12, 2),
    gasto_nm        NUMERIC(10, 2),
    gas_nm_tri      NUMERIC(12, 2),
    entidad         VARCHAR(2),
    est_dis         VARCHAR(3),
    upm             VARCHAR(7),
    factor          INTEGER
);
CREATE INDEX idx_gastospersona_nk ON enigh.gastospersona (folioviv, foliohog, numren, clave);
COMMENT ON TABLE enigh.gastospersona IS
    'Cada fila representa un evento individual de gasto atribuido a una persona. Múltiples filas pueden compartir (folioviv, foliohog, numren, clave): INEGI registra cada ocurrencia del gasto en el periodo. Para agregar por persona usar GROUP BY (folioviv, foliohog, numren[, clave]). PK surrogate id BIGSERIAL; no hay UNIQUE sobre la tupla natural porque no es única por diseño del cuestionario.';

-- --- gastotarjetas (6 columns, PK=('folioviv', 'foliohog', 'clave')) ---
CREATE TABLE enigh.gastotarjetas (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    clave           VARCHAR(4) NOT NULL,
    gasto           INTEGER,
    pago_mp         INTEGER,
    gasto_tri       NUMERIC(12, 2),
    PRIMARY KEY (folioviv, foliohog, clave)
);

-- --- hogares (148 columns, PK=('folioviv', 'foliohog')) ---
CREATE TABLE enigh.hogares (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    huespedes       SMALLINT,
    huesp_come      SMALLINT,
    num_trab_d      SMALLINT,
    trab_come       SMALLINT,
    acc_alim1       VARCHAR(1),
    acc_alim2       VARCHAR(1),
    acc_alim3       VARCHAR(1),
    acc_alim4       VARCHAR(1),
    acc_alim5       VARCHAR(1),
    acc_alim6       VARCHAR(1),
    acc_alim7       VARCHAR(1),
    acc_alim8       VARCHAR(1),
    acc_alim9       VARCHAR(1),
    acc_alim10      VARCHAR(1),
    acc_alim11      VARCHAR(1),
    acc_alim12      VARCHAR(1),
    acc_alim13      VARCHAR(1),
    acc_alim14      VARCHAR(1),
    acc_alim15      VARCHAR(1),
    acc_alim16      VARCHAR(1),
    alim17_1        SMALLINT,
    alim17_2        SMALLINT,
    alim17_3        SMALLINT,
    alim17_4        SMALLINT,
    alim17_5        SMALLINT,
    alim17_6        SMALLINT,
    alim17_7        SMALLINT,
    alim17_8        SMALLINT,
    alim17_9        SMALLINT,
    alim17_10       SMALLINT,
    alim17_11       SMALLINT,
    alim17_12       SMALLINT,
    acc_alim18      VARCHAR(1),
    telefono        VARCHAR(1),
    celular         VARCHAR(1),
    conex_inte      VARCHAR(1),
    tv_paga         VARCHAR(1),
    peliculas       VARCHAR(1),
    num_auto        SMALLINT,
    anio_auto       VARCHAR(2),
    num_van         SMALLINT,
    anio_van        VARCHAR(2),
    num_pick        SMALLINT,
    anio_pick       VARCHAR(2),
    num_moto        SMALLINT,
    anio_moto       VARCHAR(2),
    num_bici        SMALLINT,
    anio_bici       VARCHAR(2),
    num_trici       SMALLINT,
    anio_trici      VARCHAR(2),
    num_carre       SMALLINT,
    anio_carre      VARCHAR(2),
    num_canoa       SMALLINT,
    anio_canoa      VARCHAR(2),
    num_otro        SMALLINT,
    anio_otro       VARCHAR(2),
    num_ester       SMALLINT,
    anio_ester      VARCHAR(2),
    num_radio       SMALLINT,
    anio_radio      VARCHAR(2),
    num_tva         SMALLINT,
    anio_tva        VARCHAR(2),
    num_tvd         SMALLINT,
    anio_tvd        VARCHAR(2),
    num_dvd         SMALLINT,
    anio_dvd        VARCHAR(2),
    num_licua       SMALLINT,
    anio_licua      VARCHAR(2),
    num_tosta       SMALLINT,
    anio_tosta      VARCHAR(2),
    num_micro       SMALLINT,
    anio_micro      VARCHAR(2),
    num_refri       SMALLINT,
    anio_refri      VARCHAR(2),
    num_estuf       SMALLINT,
    anio_estuf      VARCHAR(2),
    num_lavad       SMALLINT,
    anio_lavad      VARCHAR(2),
    num_planc       SMALLINT,
    anio_planc      VARCHAR(2),
    num_maqui       SMALLINT,
    anio_maqui      VARCHAR(2),
    num_venti       SMALLINT,
    anio_venti      VARCHAR(2),
    num_aspir       SMALLINT,
    anio_aspir      VARCHAR(2),
    num_compu       SMALLINT,
    anio_compu      VARCHAR(2),
    num_lap         SMALLINT,
    anio_lap        VARCHAR(2),
    num_table       SMALLINT,
    anio_table      VARCHAR(2),
    num_impre       SMALLINT,
    anio_impre      VARCHAR(2),
    num_juego       SMALLINT,
    anio_juego      VARCHAR(2),
    tsalud1_h       SMALLINT,
    tsalud1_m       SMALLINT,
    camb_clim       VARCHAR(1),
    f_sequia        VARCHAR(1),
    f_inunda        VARCHAR(1),
    f_helada        VARCHAR(1),
    f_incendio      VARCHAR(1),
    f_huracan       VARCHAR(1),
    f_desliza       VARCHAR(1),
    f_otro          VARCHAR(1),
    af_viv          VARCHAR(1),
    af_empleo       VARCHAR(1),
    af_negocio      VARCHAR(1),
    af_cultivo      VARCHAR(1),
    af_trabajo      VARCHAR(1),
    af_salud        VARCHAR(1),
    af_otro         VARCHAR(1),
    habito_1        VARCHAR(1),
    habito_2        VARCHAR(1),
    habito_3        VARCHAR(1),
    habito_4        VARCHAR(1),
    habito_5        VARCHAR(1),
    habito_6        VARCHAR(1),
    consumo         VARCHAR(1),
    nr_viv          VARCHAR(2),
    tarjeta         VARCHAR(1),
    pagotarjet      VARCHAR(1),
    regalotar       VARCHAR(1),
    regalodado      VARCHAR(1),
    autocons        VARCHAR(1),
    regalos         VARCHAR(1),
    remunera        VARCHAR(1),
    transferen      VARCHAR(1),
    parto_g         VARCHAR(1),
    negcua          VARCHAR(1),
    est_alim        INTEGER,
    est_trans       INTEGER,
    bene_licon      VARCHAR(1),
    cond_licon      VARCHAR(1),
    lts_licon       VARCHAR(1),
    otros_lts       SMALLINT,
    diconsa         VARCHAR(1),
    frec_dicon      VARCHAR(1),
    cond_dicon      VARCHAR(1),
    pago_dicon      VARCHAR(1),
    otro_pago       SMALLINT,
    entidad         VARCHAR(2),
    est_dis         VARCHAR(3),
    upm             VARCHAR(7),
    factor          INTEGER,
    PRIMARY KEY (folioviv, foliohog)
);

-- --- ingresos (21 columns, PK=('folioviv', 'foliohog', 'numren', 'clave')) ---
CREATE TABLE enigh.ingresos (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    numren          VARCHAR(2) NOT NULL,
    clave           VARCHAR(4) NOT NULL,
    mes_1           VARCHAR(2),
    mes_2           VARCHAR(2),
    mes_3           VARCHAR(2),
    mes_4           VARCHAR(2),
    mes_5           VARCHAR(2),
    mes_6           VARCHAR(2),
    ing_1           INTEGER,
    ing_2           INTEGER,
    ing_3           INTEGER,
    ing_4           INTEGER,
    ing_5           INTEGER,
    ing_6           INTEGER,
    ing_tri         NUMERIC(12, 2),
    entidad         VARCHAR(2),
    est_dis         VARCHAR(3),
    upm             VARCHAR(7),
    factor          INTEGER,
    PRIMARY KEY (folioviv, foliohog, numren, clave)
);

-- --- ingresos_jcf (18 columns, PK=('folioviv', 'foliohog', 'numren', 'clave')) ---
CREATE TABLE enigh.ingresos_jcf (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    numren          VARCHAR(2) NOT NULL,
    clave           VARCHAR(4) NOT NULL,
    mes_1           VARCHAR(2),
    mes_2           VARCHAR(2),
    mes_3           VARCHAR(2),
    mes_4           VARCHAR(2),
    mes_5           VARCHAR(2),
    mes_6           VARCHAR(2),
    ing_1           INTEGER,
    ing_2           INTEGER,
    ing_3           INTEGER,
    ing_4           INTEGER,
    ing_5           INTEGER,
    ing_6           INTEGER,
    ing_tri         NUMERIC(12, 2),
    ct_futuro       VARCHAR(1),
    PRIMARY KEY (folioviv, foliohog, numren, clave)
);

-- --- noagro (115 columns, PK=('folioviv', 'foliohog', 'numren', 'id_trabajo', 'tipoact')) ---
CREATE TABLE enigh.noagro (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    numren          VARCHAR(2) NOT NULL,
    id_trabajo      VARCHAR(1) NOT NULL,
    tipoact         VARCHAR(1) NOT NULL,
    numesta         VARCHAR(1),
    totesta         SMALLINT,
    lugact          VARCHAR(1),
    socios          VARCHAR(1),
    numsocio        SMALLINT,
    phogar1         SMALLINT,
    mismop          VARCHAR(1),
    mes_2           VARCHAR(2),
    mes_3           VARCHAR(2),
    mes_4           VARCHAR(2),
    mes_5           VARCHAR(2),
    mes_6           VARCHAR(2),
    phogar2         SMALLINT,
    phogar3         SMALLINT,
    phogar4         SMALLINT,
    phogar5         SMALLINT,
    phogar6         SMALLINT,
    otro_pago       VARCHAR(1),
    fpago_1         VARCHAR(1),
    fpago_2         VARCHAR(1),
    fpago_3         VARCHAR(1),
    fpago_4         VARCHAR(1),
    fpago_5         VARCHAR(1),
    fpago_6         VARCHAR(1),
    fpago_7         VARCHAR(1),
    fpago_8         VARCHAR(1),
    nofpago         VARCHAR(1),
    t_emp           SMALLINT,
    h_emp           SMALLINT,
    m_emp           SMALLINT,
    t_cpago         SMALLINT,
    h_cpago         SMALLINT,
    m_cpago         SMALLINT,
    t_ispago        SMALLINT,
    h_ispago        SMALLINT,
    m_ispago        SMALLINT,
    t_nispago       SMALLINT,
    h_nispago       SMALLINT,
    m_nispago       SMALLINT,
    autocons        VARCHAR(1),
    enproduc        INTEGER,
    novend          INTEGER,
    consinter       INTEGER,
    peract          VARCHAR(1),
    mesact_1        VARCHAR(2),
    mesact_2        VARCHAR(2),
    mesact_3        VARCHAR(2),
    mesact_4        VARCHAR(2),
    mesact_5        VARCHAR(2),
    mesact_6        VARCHAR(2),
    mesact_7        VARCHAR(2),
    mesact_8        VARCHAR(2),
    mesact_9        VARCHAR(2),
    mesact_10       VARCHAR(2),
    mesact_11       VARCHAR(2),
    mesact_12       VARCHAR(2),
    nvo_apoyo       VARCHAR(1),
    nvo_prog1       VARCHAR(4),
    nvo_act1        VARCHAR(1),
    nvo_cant1       INTEGER,
    nvo_prog2       VARCHAR(4),
    nvo_act2        VARCHAR(1),
    nvo_cant2       INTEGER,
    nvo_prog3       VARCHAR(4),
    nvo_act3        VARCHAR(1),
    nvo_cant3       INTEGER,
    reg_not         VARCHAR(1),
    reg_cont        VARCHAR(1),
    ventas1         NUMERIC(13, 2),
    ventas2         NUMERIC(13, 2),
    ventas3         NUMERIC(13, 2),
    ventas4         NUMERIC(13, 2),
    ventas5         NUMERIC(13, 2),
    ventas6         NUMERIC(13, 2),
    autocons1       NUMERIC(13, 2),
    autocons2       NUMERIC(13, 2),
    autocons3       NUMERIC(13, 2),
    autocons4       NUMERIC(13, 2),
    autocons5       NUMERIC(13, 2),
    autocons6       NUMERIC(13, 2),
    otrosnom1       NUMERIC(13, 2),
    otrosnom2       NUMERIC(13, 2),
    otrosnom3       NUMERIC(13, 2),
    otrosnom4       NUMERIC(13, 2),
    otrosnom5       NUMERIC(13, 2),
    otrosnom6       NUMERIC(13, 2),
    gasneg1         NUMERIC(13, 2),
    gasneg2         NUMERIC(13, 2),
    gasneg3         NUMERIC(13, 2),
    gasneg4         NUMERIC(13, 2),
    gasneg5         NUMERIC(13, 2),
    gasneg6         NUMERIC(13, 2),
    ing1            NUMERIC(13, 2),
    ing2            NUMERIC(13, 2),
    ing3            NUMERIC(13, 2),
    ing4            NUMERIC(13, 2),
    ing5            NUMERIC(13, 2),
    ing6            NUMERIC(13, 2),
    ero1            NUMERIC(13, 2),
    ero2            NUMERIC(13, 2),
    ero3            NUMERIC(13, 2),
    ero4            NUMERIC(13, 2),
    ero5            NUMERIC(13, 2),
    ero6            NUMERIC(13, 2),
    ing_tri         NUMERIC(15, 2),
    ero_tri         NUMERIC(15, 2),
    ventas_tri      NUMERIC(15, 2),
    auto_tri        NUMERIC(15, 2),
    otros_tri       NUMERIC(15, 2),
    gasto_tri       NUMERIC(15, 2),
    PRIMARY KEY (folioviv, foliohog, numren, id_trabajo, tipoact)
);

-- --- noagroimportes (17 columns, PK=('folioviv', 'foliohog', 'numren', 'id_trabajo', 'clave')) ---
CREATE TABLE enigh.noagroimportes (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    numren          VARCHAR(2) NOT NULL,
    id_trabajo      VARCHAR(1) NOT NULL,
    clave           VARCHAR(6) NOT NULL,
    mes_1           VARCHAR(2),
    mes_2           VARCHAR(2),
    mes_3           VARCHAR(2),
    mes_4           VARCHAR(2),
    mes_5           VARCHAR(2),
    mes_6           VARCHAR(2),
    importe_1       INTEGER,
    importe_2       INTEGER,
    importe_3       INTEGER,
    importe_4       INTEGER,
    importe_5       INTEGER,
    importe_6       INTEGER,
    PRIMARY KEY (folioviv, foliohog, numren, id_trabajo, clave)
);

-- --- poblacion (185 columns, PK=('folioviv', 'foliohog', 'numren')) ---
CREATE TABLE enigh.poblacion (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    numren          VARCHAR(2) NOT NULL,
    parentesco      VARCHAR(3),
    sexo            VARCHAR(1),
    edad            SMALLINT,
    madre_hog       VARCHAR(1),
    madre_id        VARCHAR(2),
    padre_hog       VARCHAR(1),
    padre_id        VARCHAR(2),
    pais_nac        VARCHAR(1),
    afrod           VARCHAR(1),
    disc_ver        VARCHAR(1),
    disc_oir        VARCHAR(1),
    disc_brazo      VARCHAR(1),
    disc_camin      VARCHAR(1),
    disc_apren      VARCHAR(1),
    disc_vest       VARCHAR(1),
    disc_habla      VARCHAR(1),
    disc_acti       VARCHAR(1),
    edu_ini         VARCHAR(1),
    no_asis         VARCHAR(1),
    hablaind        VARCHAR(1),
    lenguaind       VARCHAR(4),
    hablaesp        VARCHAR(1),
    comprenind      VARCHAR(1),
    etnia           VARCHAR(1),
    alfabetism      VARCHAR(1),
    asis_esc        VARCHAR(1),
    no_asisb        VARCHAR(2),
    nivel           VARCHAR(2),
    grado           VARCHAR(1),
    tipoesc         VARCHAR(1),
    tiene_b         VARCHAR(1),
    otorg_b         VARCHAR(1),
    forma_b         VARCHAR(1),
    tiene_c         VARCHAR(1),
    otorg_c         VARCHAR(1),
    forma_c         VARCHAR(1),
    nivelaprob      VARCHAR(2),
    gradoaprob      VARCHAR(1),
    antec_esc       VARCHAR(1),
    residencia      VARCHAR(2),
    edo_conyug      VARCHAR(1),
    pareja_hog      VARCHAR(1),
    conyuge_id      VARCHAR(2),
    segsoc          VARCHAR(1),
    ss_aa           SMALLINT,
    ss_mm           SMALLINT,
    redsoc_1        VARCHAR(1),
    redsoc_2        VARCHAR(1),
    redsoc_3        VARCHAR(1),
    redsoc_4        VARCHAR(1),
    redsoc_5        VARCHAR(1),
    redsoc_6        VARCHAR(1),
    hor_1           SMALLINT,
    min_1           SMALLINT,
    usotiempo1      VARCHAR(1),
    hor_2           SMALLINT,
    min_2           SMALLINT,
    usotiempo2      VARCHAR(1),
    hor_3           SMALLINT,
    min_3           SMALLINT,
    usotiempo3      VARCHAR(1),
    hor_4           SMALLINT,
    min_4           SMALLINT,
    usotiempo4      VARCHAR(1),
    hor_5           SMALLINT,
    min_5           SMALLINT,
    usotiempo5      VARCHAR(1),
    hor_6           SMALLINT,
    min_6           SMALLINT,
    usotiempo6      VARCHAR(1),
    hor_7           SMALLINT,
    min_7           SMALLINT,
    usotiempo7      VARCHAR(1),
    hor_8           SMALLINT,
    min_8           SMALLINT,
    usotiempo8      VARCHAR(1),
    inst_1          VARCHAR(1),
    inst_2          VARCHAR(1),
    inst_3          VARCHAR(1),
    inst_4          VARCHAR(1),
    inst_5          VARCHAR(1),
    inst_6          VARCHAR(1),
    inst_7          VARCHAR(1),
    inst_8          VARCHAR(1),
    inst_9          VARCHAR(1),
    atemed          VARCHAR(1),
    inscr_1         VARCHAR(1),
    inscr_2         VARCHAR(1),
    inscr_3         VARCHAR(1),
    inscr_4         VARCHAR(1),
    inscr_5         VARCHAR(1),
    inscr_6         VARCHAR(1),
    inscr_7         VARCHAR(1),
    inscr_8         VARCHAR(1),
    prob_anio       VARCHAR(4),
    prob_mes        VARCHAR(2),
    prob_sal        VARCHAR(1),
    aten_sal        VARCHAR(1),
    servmed_1       VARCHAR(2),
    servmed_2       VARCHAR(2),
    servmed_3       VARCHAR(2),
    servmed_4       VARCHAR(2),
    servmed_5       VARCHAR(2),
    servmed_6       VARCHAR(2),
    servmed_7       VARCHAR(2),
    servmed_8       VARCHAR(2),
    servmed_9       VARCHAR(2),
    servmed_10      VARCHAR(2),
    servmed_11      VARCHAR(2),
    hh_lug          SMALLINT,
    mm_lug          SMALLINT,
    hh_esp          SMALLINT,
    mm_esp          SMALLINT,
    pagoaten_1      VARCHAR(1),
    pagoaten_2      VARCHAR(1),
    pagoaten_3      VARCHAR(1),
    pagoaten_4      VARCHAR(1),
    pagoaten_5      VARCHAR(1),
    pagoaten_6      VARCHAR(1),
    pagoaten_7      VARCHAR(1),
    noatenc_1       VARCHAR(2),
    noatenc_2       VARCHAR(2),
    noatenc_3       VARCHAR(2),
    noatenc_4       VARCHAR(2),
    noatenc_5       VARCHAR(2),
    noatenc_6       VARCHAR(2),
    noatenc_7       VARCHAR(2),
    noatenc_8       VARCHAR(2),
    noatenc_9       VARCHAR(2),
    noatenc_10      VARCHAR(2),
    noatenc_11      VARCHAR(2),
    noatenc_12      VARCHAR(2),
    noatenc_13      VARCHAR(2),
    noatenc_14      VARCHAR(2),
    noatenc_15      VARCHAR(2),
    noatenc_16      VARCHAR(2),
    norecib_1       VARCHAR(2),
    norecib_2       VARCHAR(2),
    norecib_3       VARCHAR(2),
    norecib_4       VARCHAR(2),
    norecib_5       VARCHAR(2),
    norecib_6       VARCHAR(2),
    norecib_7       VARCHAR(2),
    norecib_8       VARCHAR(2),
    norecib_9       VARCHAR(2),
    norecib_10      VARCHAR(2),
    norecib_11      VARCHAR(2),
    razon_1         VARCHAR(2),
    razon_2         VARCHAR(2),
    razon_3         VARCHAR(2),
    razon_4         VARCHAR(2),
    razon_5         VARCHAR(2),
    razon_6         VARCHAR(2),
    razon_7         VARCHAR(2),
    razon_8         VARCHAR(2),
    razon_9         VARCHAR(2),
    razon_10        VARCHAR(2),
    razon_11        VARCHAR(2),
    diabetes        VARCHAR(1),
    pres_alta       VARCHAR(1),
    peso            VARCHAR(1),
    segvol_1        VARCHAR(1),
    segvol_2        VARCHAR(1),
    segvol_3        VARCHAR(1),
    segvol_4        VARCHAR(1),
    segvol_5        VARCHAR(1),
    segvol_6        VARCHAR(1),
    segvol_7        VARCHAR(1),
    hijos_viv       SMALLINT,
    hijos_mue       SMALLINT,
    hijos_sob       SMALLINT,
    trabajo_mp      VARCHAR(1),
    motivo_aus      VARCHAR(2),
    act_pnea1       VARCHAR(1),
    act_pnea2       VARCHAR(1),
    num_trabaj      VARCHAR(1),
    c_futuro        VARCHAR(1),
    ct_futuro       VARCHAR(1),
    entidad         VARCHAR(2),
    est_dis         VARCHAR(3),
    upm             VARCHAR(7),
    factor          INTEGER,
    PRIMARY KEY (folioviv, foliohog, numren)
);

-- --- trabajos (60 columns, PK=('folioviv', 'foliohog', 'numren', 'id_trabajo')) ---
CREATE TABLE enigh.trabajos (
    folioviv        VARCHAR(10) NOT NULL,
    foliohog        VARCHAR(1) NOT NULL,
    numren          VARCHAR(2) NOT NULL,
    id_trabajo      VARCHAR(1) NOT NULL,
    trapais         VARCHAR(1),
    subor           VARCHAR(1),
    indep           VARCHAR(1),
    personal        VARCHAR(1),
    pago            VARCHAR(1),
    contrato        VARCHAR(1),
    tipocontr       VARCHAR(1),
    pres_1          VARCHAR(2),
    pres_2          VARCHAR(2),
    pres_3          VARCHAR(2),
    pres_4          VARCHAR(2),
    pres_5          VARCHAR(2),
    pres_6          VARCHAR(2),
    pres_7          VARCHAR(2),
    pres_8          VARCHAR(2),
    pres_9          VARCHAR(2),
    pres_10         VARCHAR(2),
    pres_11         VARCHAR(2),
    pres_12         VARCHAR(2),
    pres_13         VARCHAR(2),
    pres_14         VARCHAR(2),
    pres_15         VARCHAR(2),
    pres_16         VARCHAR(2),
    pres_17         VARCHAR(2),
    pres_18         VARCHAR(2),
    pres_19         VARCHAR(2),
    pres_20         VARCHAR(2),
    htrab           SMALLINT,
    sinco           VARCHAR(4),
    scian           VARCHAR(4),
    clas_emp        VARCHAR(1),
    tam_emp         VARCHAR(2),
    no_ing          VARCHAR(2),
    tiene_suel      VARCHAR(1),
    tipoact         VARCHAR(1),
    socios          VARCHAR(1),
    soc_nr1         VARCHAR(2),
    soc_nr2         VARCHAR(2),
    soc_resp        VARCHAR(2),
    otra_act        VARCHAR(1),
    tipoact2        VARCHAR(1),
    tipoact3        VARCHAR(1),
    tipoact4        VARCHAR(1),
    lugar           VARCHAR(1),
    conf_pers       VARCHAR(1),
    medtrab_1       VARCHAR(1),
    medtrab_2       VARCHAR(1),
    medtrab_3       VARCHAR(1),
    medtrab_4       VARCHAR(1),
    medtrab_5       VARCHAR(1),
    medtrab_6       VARCHAR(1),
    medtrab_7       VARCHAR(1),
    entidad         VARCHAR(2),
    est_dis         VARCHAR(3),
    upm             VARCHAR(7),
    factor          INTEGER,
    PRIMARY KEY (folioviv, foliohog, numren, id_trabajo)
);

-- --- viviendas (82 columns, PK=('folioviv',)) ---
CREATE TABLE enigh.viviendas (
    folioviv        VARCHAR(10) NOT NULL,
    tipo_viv        VARCHAR(1),
    mat_pared       VARCHAR(1),
    mat_techos      VARCHAR(2),
    mat_pisos       VARCHAR(1),
    antiguedad      SMALLINT,
    antigua_ne      VARCHAR(1),
    cocina          VARCHAR(1),
    cocina_dor      VARCHAR(1),
    cuart_dorm      SMALLINT,
    num_cuarto      SMALLINT,
    lugar_coc       VARCHAR(1),
    agua_ent        VARCHAR(1),
    ab_agua         VARCHAR(1),
    agua_noe        VARCHAR(1),
    dotac_agua      VARCHAR(1),
    excusado        VARCHAR(1),
    uso_compar      VARCHAR(1),
    sanit_agua      VARCHAR(1),
    biodigest       VARCHAR(1),
    bano_comp       SMALLINT,
    bano_excus      SMALLINT,
    bano_regad      SMALLINT,
    drenaje         VARCHAR(1),
    disp_elect      VARCHAR(1),
    focos           SMALLINT,
    focos_ahor      SMALLINT,
    combus          VARCHAR(1),
    fogon_chi       VARCHAR(1),
    eli_basura      VARCHAR(1),
    tenencia        VARCHAR(1),
    renta           INTEGER,
    estim_pago      INTEGER,
    pago_viv        INTEGER,
    pago_mesp       VARCHAR(1),
    tipo_adqui      VARCHAR(1),
    viv_usada       VARCHAR(1),
    finan_1         VARCHAR(1),
    finan_2         VARCHAR(1),
    finan_3         VARCHAR(1),
    finan_4         VARCHAR(1),
    finan_5         VARCHAR(1),
    finan_6         VARCHAR(1),
    finan_7         VARCHAR(1),
    finan_8         VARCHAR(1),
    num_dueno1      VARCHAR(2),
    hog_dueno1      VARCHAR(1),
    num_dueno2      VARCHAR(2),
    hog_dueno2      VARCHAR(1),
    escrituras      VARCHAR(1),
    lavadero        VARCHAR(1),
    fregadero       VARCHAR(1),
    regadera        VARCHAR(1),
    tinaco_azo      VARCHAR(1),
    cisterna        VARCHAR(1),
    pileta          VARCHAR(1),
    calent_sol      VARCHAR(1),
    calent_gas      VARCHAR(1),
    calen_lena      VARCHAR(1),
    medid_luz       VARCHAR(1),
    bomba_agua      VARCHAR(1),
    tanque_gas      VARCHAR(1),
    aire_acond      VARCHAR(1),
    calefacc        VARCHAR(1),
    p_grietas       VARCHAR(1),
    p_pandeos       VARCHAR(1),
    p_levanta       VARCHAR(1),
    p_humedad       VARCHAR(1),
    p_fractura      VARCHAR(1),
    p_electric      VARCHAR(1),
    p_tuberias      VARCHAR(1),
    tot_resid       SMALLINT,
    tot_hom         SMALLINT,
    tot_muj         SMALLINT,
    tot_hog         SMALLINT,
    ubica_geo       VARCHAR(5),
    tam_loc         VARCHAR(1),
    est_socio       VARCHAR(1),
    est_dis         VARCHAR(3),
    upm             VARCHAR(7),
    factor          INTEGER,
    procaptar       VARCHAR(1),
    PRIMARY KEY (folioviv)
);


-- ------------------------------------------------------------------
-- FK documentation (COMMENT ON COLUMN, no hard constraints)
-- ------------------------------------------------------------------

-- FK comments for enigh.agro
COMMENT ON COLUMN enigh.agro.id_trabajo IS 'FK -> enigh.cat_id_trabajo.clave';
COMMENT ON COLUMN enigh.agro.tipoact IS 'FK -> enigh.cat_tipoact.clave';
COMMENT ON COLUMN enigh.agro.cose_cria IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agro.prep_deriv IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agro.otro_pago IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agro.fpago_1 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.agro.fpago_2 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.agro.fpago_3 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.agro.fpago_4 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.agro.fpago_5 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.agro.fpago_6 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.agro.fpago_7 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.agro.fpago_8 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.agro.nofpago IS 'FK -> enigh.cat_nofpago.clave';
COMMENT ON COLUMN enigh.agro.apoyo IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agro.mesproc IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.agro.mesprogan IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.agro.nvo_apoyo IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agro.nvo_prog1 IS 'FK -> enigh.cat_nvo_prog.clave';
COMMENT ON COLUMN enigh.agro.nvo_act1 IS 'FK -> enigh.cat_nvo_act.clave';
COMMENT ON COLUMN enigh.agro.nvo_prog2 IS 'FK -> enigh.cat_nvo_prog.clave';
COMMENT ON COLUMN enigh.agro.nvo_act2 IS 'FK -> enigh.cat_nvo_act.clave';
COMMENT ON COLUMN enigh.agro.nvo_prog3 IS 'FK -> enigh.cat_nvo_prog.clave';
COMMENT ON COLUMN enigh.agro.nvo_act3 IS 'FK -> enigh.cat_nvo_act.clave';
COMMENT ON COLUMN enigh.agro.reg_not IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agro.reg_cont IS 'FK -> enigh.cat_reg_cont.clave';
-- FK comments for enigh.agroconsumo
COMMENT ON COLUMN enigh.agroconsumo.id_trabajo IS 'FK -> enigh.cat_id_trabajo.clave';
COMMENT ON COLUMN enigh.agroconsumo.tipoact IS 'FK -> enigh.cat_tipoact.clave';
COMMENT ON COLUMN enigh.agroconsumo.codigo IS 'FK -> enigh.cat_productoagricola.clave';
COMMENT ON COLUMN enigh.agroconsumo.cosecha IS 'FK -> enigh.cat_si_no_noaplica.clave';
COMMENT ON COLUMN enigh.agroconsumo.destino IS 'FK -> enigh.cat_destino.clave';
-- FK comments for enigh.agrogasto
COMMENT ON COLUMN enigh.agrogasto.id_trabajo IS 'FK -> enigh.cat_id_trabajo.clave';
COMMENT ON COLUMN enigh.agrogasto.tipoact IS 'FK -> enigh.cat_tipoact.clave';
COMMENT ON COLUMN enigh.agrogasto.clave IS 'FK -> enigh.cat_gastonegocioagro.clave';
-- FK comments for enigh.agroproductos
COMMENT ON COLUMN enigh.agroproductos.id_trabajo IS 'FK -> enigh.cat_id_trabajo.clave';
COMMENT ON COLUMN enigh.agroproductos.tipoact IS 'FK -> enigh.cat_tipoact.clave';
COMMENT ON COLUMN enigh.agroproductos.codigo IS 'FK -> enigh.cat_productoagricola.clave';
COMMENT ON COLUMN enigh.agroproductos.cosecha IS 'FK -> enigh.cat_si_no_noaplica.clave';
COMMENT ON COLUMN enigh.agroproductos.aparce IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agroproductos.nocos IS 'FK -> enigh.cat_causa_no_cosecha.clave';
COMMENT ON COLUMN enigh.agroproductos.vendio IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agroproductos.uso_hog IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agroproductos.uso_prod IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agroproductos.deu_hog IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agroproductos.deu_neg IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agroproductos.pag_trab IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agroproductos.uso_reg IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agroproductos.uso_int IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.agroproductos.cicloagr IS 'FK -> enigh.cat_cicloagr.clave';
-- FK comments for enigh.concentradohogar
COMMENT ON COLUMN enigh.concentradohogar.ubica_geo IS 'FK -> enigh.cat_ubica_geo.clave';
COMMENT ON COLUMN enigh.concentradohogar.tam_loc IS 'FK -> enigh.cat_tam_loc.clave';
COMMENT ON COLUMN enigh.concentradohogar.est_socio IS 'FK -> enigh.cat_est_socio.clave';
COMMENT ON COLUMN enigh.concentradohogar.clase_hog IS 'FK -> enigh.cat_clase_hog.clave';
COMMENT ON COLUMN enigh.concentradohogar.sexo_jefe IS 'FK -> enigh.cat_sexo.clave';
COMMENT ON COLUMN enigh.concentradohogar.educa_jefe IS 'FK -> enigh.cat_educa_jefe.clave';
COMMENT ON COLUMN enigh.concentradohogar.decil IS 'Decil nacional de ingreso corriente per cápita (1-10). Populated in S3 via UPDATE ... SET decil = NTILE(10) OVER (ORDER BY ing_cor * factor). Nullable until ingest S3 runs.';
-- FK comments for enigh.erogaciones
COMMENT ON COLUMN enigh.erogaciones.clave IS 'FK -> enigh.cat_producto.clave';
COMMENT ON COLUMN enigh.erogaciones.mes_1 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.erogaciones.mes_2 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.erogaciones.mes_3 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.erogaciones.mes_4 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.erogaciones.mes_5 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.erogaciones.mes_6 IS 'FK -> enigh.cat_mes.clave';
-- FK comments for enigh.gastoshogar
COMMENT ON COLUMN enigh.gastoshogar.clave IS 'FK -> enigh.cat_gastos.clave';
COMMENT ON COLUMN enigh.gastoshogar.tipo_gasto IS 'FK -> enigh.cat_tipo_gasto.clave';
COMMENT ON COLUMN enigh.gastoshogar.mes_dia IS 'FK -> enigh.cat_mes_dia.clave';
COMMENT ON COLUMN enigh.gastoshogar.forma_pag1 IS 'FK -> enigh.cat_forma_pag.clave';
COMMENT ON COLUMN enigh.gastoshogar.forma_pag2 IS 'FK -> enigh.cat_forma_pag.clave';
COMMENT ON COLUMN enigh.gastoshogar.forma_pag3 IS 'FK -> enigh.cat_forma_pag.clave';
COMMENT ON COLUMN enigh.gastoshogar.lugar_comp IS 'FK -> enigh.cat_lugar_comp.clave';
COMMENT ON COLUMN enigh.gastoshogar.orga_inst IS 'FK -> enigh.cat_orga_inst.clave';
COMMENT ON COLUMN enigh.gastoshogar.frecuencia IS 'FK -> enigh.cat_frecuencia.clave';
COMMENT ON COLUMN enigh.gastoshogar.fecha_adqu IS 'FK -> enigh.cat_fecha.clave';
COMMENT ON COLUMN enigh.gastoshogar.fecha_pago IS 'FK -> enigh.cat_fecha.clave';
COMMENT ON COLUMN enigh.gastoshogar.cantidad IS 'FK -> enigh.cat_cantidades.clave';
COMMENT ON COLUMN enigh.gastoshogar.inst_1 IS 'FK -> enigh.cat_inst_salud.clave';
COMMENT ON COLUMN enigh.gastoshogar.inst_2 IS 'FK -> enigh.cat_inst_salud.clave';
COMMENT ON COLUMN enigh.gastoshogar.ultim_pago IS 'FK -> enigh.cat_fecha.clave';
COMMENT ON COLUMN enigh.gastoshogar.entidad IS 'FK -> enigh.cat_entidad.clave';
-- FK comments for enigh.gastospersona
COMMENT ON COLUMN enigh.gastospersona.clave IS 'FK -> enigh.cat_gastos.clave';
COMMENT ON COLUMN enigh.gastospersona.tipo_gasto IS 'FK -> enigh.cat_tipo_gasto.clave';
COMMENT ON COLUMN enigh.gastospersona.mes_dia IS 'FK -> enigh.cat_mes_dia.clave';
COMMENT ON COLUMN enigh.gastospersona.frec_rem IS 'FK -> enigh.cat_frec_rem.clave';
COMMENT ON COLUMN enigh.gastospersona.inst IS 'FK -> enigh.cat_inst_salud.clave';
COMMENT ON COLUMN enigh.gastospersona.forma_pag1 IS 'FK -> enigh.cat_forma_pag.clave';
COMMENT ON COLUMN enigh.gastospersona.forma_pag2 IS 'FK -> enigh.cat_forma_pag.clave';
COMMENT ON COLUMN enigh.gastospersona.forma_pag3 IS 'FK -> enigh.cat_forma_pag.clave';
COMMENT ON COLUMN enigh.gastospersona.cantidad IS 'FK -> enigh.cat_cantidades.clave';
COMMENT ON COLUMN enigh.gastospersona.entidad IS 'FK -> enigh.cat_entidad.clave';
-- FK comments for enigh.gastotarjetas
COMMENT ON COLUMN enigh.gastotarjetas.clave IS 'FK -> enigh.cat_gastoscontarjeta.clave';
-- FK comments for enigh.hogares
COMMENT ON COLUMN enigh.hogares.acc_alim1 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim2 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim3 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim4 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim5 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim6 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim7 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim8 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim9 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim10 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim11 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim12 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim13 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim14 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim15 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim16 IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.acc_alim18 IS 'FK -> enigh.cat_acc_alim18.clave';
COMMENT ON COLUMN enigh.hogares.telefono IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.celular IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.conex_inte IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.tv_paga IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.peliculas IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.camb_clim IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.f_sequia IS 'FK -> enigh.cat_fenomeno.clave';
COMMENT ON COLUMN enigh.hogares.f_inunda IS 'FK -> enigh.cat_fenomeno.clave';
COMMENT ON COLUMN enigh.hogares.f_helada IS 'FK -> enigh.cat_fenomeno.clave';
COMMENT ON COLUMN enigh.hogares.f_incendio IS 'FK -> enigh.cat_fenomeno.clave';
COMMENT ON COLUMN enigh.hogares.f_huracan IS 'FK -> enigh.cat_fenomeno.clave';
COMMENT ON COLUMN enigh.hogares.f_desliza IS 'FK -> enigh.cat_fenomeno.clave';
COMMENT ON COLUMN enigh.hogares.f_otro IS 'FK -> enigh.cat_fenomeno.clave';
COMMENT ON COLUMN enigh.hogares.af_viv IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.af_empleo IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.af_negocio IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.af_cultivo IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.af_trabajo IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.af_salud IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.af_otro IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.habito_1 IS 'FK -> enigh.cat_habito.clave';
COMMENT ON COLUMN enigh.hogares.habito_2 IS 'FK -> enigh.cat_habito.clave';
COMMENT ON COLUMN enigh.hogares.habito_3 IS 'FK -> enigh.cat_habito.clave';
COMMENT ON COLUMN enigh.hogares.habito_4 IS 'FK -> enigh.cat_habito.clave';
COMMENT ON COLUMN enigh.hogares.habito_5 IS 'FK -> enigh.cat_habito.clave';
COMMENT ON COLUMN enigh.hogares.habito_6 IS 'FK -> enigh.cat_habito.clave';
COMMENT ON COLUMN enigh.hogares.consumo IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.tarjeta IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.pagotarjet IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.regalotar IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.regalodado IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.autocons IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.regalos IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.remunera IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.transferen IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.parto_g IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.negcua IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.bene_licon IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.cond_licon IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.lts_licon IS 'FK -> enigh.cat_lts_licon.clave';
COMMENT ON COLUMN enigh.hogares.diconsa IS 'FK -> enigh.cat_si_no_nosabe.clave';
COMMENT ON COLUMN enigh.hogares.frec_dicon IS 'FK -> enigh.cat_frec_dicon.clave';
COMMENT ON COLUMN enigh.hogares.cond_dicon IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.hogares.pago_dicon IS 'FK -> enigh.cat_pago_dicon.clave';
COMMENT ON COLUMN enigh.hogares.entidad IS 'FK -> enigh.cat_entidad.clave';
-- FK comments for enigh.ingresos
COMMENT ON COLUMN enigh.ingresos.clave IS 'FK -> enigh.cat_ingresos_cat.clave';
COMMENT ON COLUMN enigh.ingresos.mes_1 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos.mes_2 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos.mes_3 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos.mes_4 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos.mes_5 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos.mes_6 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos.entidad IS 'FK -> enigh.cat_entidad.clave';
-- FK comments for enigh.ingresos_jcf
COMMENT ON COLUMN enigh.ingresos_jcf.clave IS 'FK -> enigh.cat_ingresos_cat.clave';
COMMENT ON COLUMN enigh.ingresos_jcf.mes_1 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos_jcf.mes_2 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos_jcf.mes_3 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos_jcf.mes_4 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos_jcf.mes_5 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos_jcf.mes_6 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.ingresos_jcf.ct_futuro IS 'FK -> enigh.cat_ct_futuro.clave';
-- FK comments for enigh.noagro
COMMENT ON COLUMN enigh.noagro.id_trabajo IS 'FK -> enigh.cat_id_trabajo.clave';
COMMENT ON COLUMN enigh.noagro.tipoact IS 'FK -> enigh.cat_tipoact.clave';
COMMENT ON COLUMN enigh.noagro.numesta IS 'FK -> enigh.cat_numesta.clave';
COMMENT ON COLUMN enigh.noagro.lugact IS 'FK -> enigh.cat_lugact.clave';
COMMENT ON COLUMN enigh.noagro.socios IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.noagro.mismop IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.noagro.mes_2 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mes_3 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mes_4 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mes_5 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mes_6 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.otro_pago IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.noagro.fpago_1 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.noagro.fpago_2 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.noagro.fpago_3 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.noagro.fpago_4 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.noagro.fpago_5 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.noagro.fpago_6 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.noagro.fpago_7 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.noagro.fpago_8 IS 'FK -> enigh.cat_fpago.clave';
COMMENT ON COLUMN enigh.noagro.nofpago IS 'FK -> enigh.cat_nofpago.clave';
COMMENT ON COLUMN enigh.noagro.autocons IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.noagro.peract IS 'FK -> enigh.cat_peract.clave';
COMMENT ON COLUMN enigh.noagro.mesact_1 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mesact_2 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mesact_3 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mesact_4 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mesact_5 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mesact_6 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mesact_7 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mesact_8 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mesact_9 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mesact_10 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mesact_11 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.mesact_12 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagro.nvo_apoyo IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.noagro.nvo_prog1 IS 'FK -> enigh.cat_nvo_prog.clave';
COMMENT ON COLUMN enigh.noagro.nvo_act1 IS 'FK -> enigh.cat_nvo_act.clave';
COMMENT ON COLUMN enigh.noagro.nvo_prog2 IS 'FK -> enigh.cat_nvo_prog.clave';
COMMENT ON COLUMN enigh.noagro.nvo_act2 IS 'FK -> enigh.cat_nvo_act.clave';
COMMENT ON COLUMN enigh.noagro.nvo_prog3 IS 'FK -> enigh.cat_nvo_prog.clave';
COMMENT ON COLUMN enigh.noagro.nvo_act3 IS 'FK -> enigh.cat_nvo_act.clave';
COMMENT ON COLUMN enigh.noagro.reg_not IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.noagro.reg_cont IS 'FK -> enigh.cat_reg_cont.clave';
-- FK comments for enigh.noagroimportes
COMMENT ON COLUMN enigh.noagroimportes.id_trabajo IS 'FK -> enigh.cat_id_trabajo.clave';
COMMENT ON COLUMN enigh.noagroimportes.clave IS 'FK -> enigh.cat_noagro_y_gastos.clave';
COMMENT ON COLUMN enigh.noagroimportes.mes_1 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagroimportes.mes_2 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagroimportes.mes_3 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagroimportes.mes_4 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagroimportes.mes_5 IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.noagroimportes.mes_6 IS 'FK -> enigh.cat_mes.clave';
-- FK comments for enigh.poblacion
COMMENT ON COLUMN enigh.poblacion.parentesco IS 'FK -> enigh.cat_parentesco.clave';
COMMENT ON COLUMN enigh.poblacion.sexo IS 'FK -> enigh.cat_sexo.clave';
COMMENT ON COLUMN enigh.poblacion.madre_hog IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.padre_hog IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.pais_nac IS 'FK -> enigh.cat_pais_nac.clave';
COMMENT ON COLUMN enigh.poblacion.afrod IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.disc_ver IS 'FK -> enigh.cat_disc.clave';
COMMENT ON COLUMN enigh.poblacion.disc_oir IS 'FK -> enigh.cat_disc.clave';
COMMENT ON COLUMN enigh.poblacion.disc_brazo IS 'FK -> enigh.cat_disc.clave';
COMMENT ON COLUMN enigh.poblacion.disc_camin IS 'FK -> enigh.cat_disc.clave';
COMMENT ON COLUMN enigh.poblacion.disc_apren IS 'FK -> enigh.cat_disc.clave';
COMMENT ON COLUMN enigh.poblacion.disc_vest IS 'FK -> enigh.cat_disc.clave';
COMMENT ON COLUMN enigh.poblacion.disc_habla IS 'FK -> enigh.cat_disc.clave';
COMMENT ON COLUMN enigh.poblacion.disc_acti IS 'FK -> enigh.cat_disc.clave';
COMMENT ON COLUMN enigh.poblacion.edu_ini IS 'FK -> enigh.cat_edu_ini.clave';
COMMENT ON COLUMN enigh.poblacion.no_asis IS 'FK -> enigh.cat_no_asis.clave';
COMMENT ON COLUMN enigh.poblacion.hablaind IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.lenguaind IS 'FK -> enigh.cat_lenguaind.clave';
COMMENT ON COLUMN enigh.poblacion.hablaesp IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.comprenind IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.etnia IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.alfabetism IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.asis_esc IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.no_asisb IS 'FK -> enigh.cat_no_asisb.clave';
COMMENT ON COLUMN enigh.poblacion.nivel IS 'FK -> enigh.cat_nivel.clave';
COMMENT ON COLUMN enigh.poblacion.grado IS 'FK -> enigh.cat_grado.clave';
COMMENT ON COLUMN enigh.poblacion.tipoesc IS 'FK -> enigh.cat_tipoesc.clave';
COMMENT ON COLUMN enigh.poblacion.tiene_b IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.otorg_b IS 'FK -> enigh.cat_otorg_b.clave';
COMMENT ON COLUMN enigh.poblacion.forma_b IS 'FK -> enigh.cat_forma_b.clave';
COMMENT ON COLUMN enigh.poblacion.tiene_c IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.otorg_c IS 'FK -> enigh.cat_otorg_c.clave';
COMMENT ON COLUMN enigh.poblacion.forma_c IS 'FK -> enigh.cat_forma_c.clave';
COMMENT ON COLUMN enigh.poblacion.nivelaprob IS 'FK -> enigh.cat_nivelaprob.clave';
COMMENT ON COLUMN enigh.poblacion.gradoaprob IS 'FK -> enigh.cat_gradoaprob.clave';
COMMENT ON COLUMN enigh.poblacion.antec_esc IS 'FK -> enigh.cat_antec_esc.clave';
COMMENT ON COLUMN enigh.poblacion.residencia IS 'FK -> enigh.cat_residencia.clave';
COMMENT ON COLUMN enigh.poblacion.edo_conyug IS 'FK -> enigh.cat_edo_conyug.clave';
COMMENT ON COLUMN enigh.poblacion.pareja_hog IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.segsoc IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.redsoc_1 IS 'FK -> enigh.cat_redsoc.clave';
COMMENT ON COLUMN enigh.poblacion.redsoc_2 IS 'FK -> enigh.cat_redsoc.clave';
COMMENT ON COLUMN enigh.poblacion.redsoc_3 IS 'FK -> enigh.cat_redsoc.clave';
COMMENT ON COLUMN enigh.poblacion.redsoc_4 IS 'FK -> enigh.cat_redsoc.clave';
COMMENT ON COLUMN enigh.poblacion.redsoc_5 IS 'FK -> enigh.cat_redsoc.clave';
COMMENT ON COLUMN enigh.poblacion.redsoc_6 IS 'FK -> enigh.cat_redsoc.clave';
COMMENT ON COLUMN enigh.poblacion.usotiempo1 IS 'FK -> enigh.cat_usotiempo.clave';
COMMENT ON COLUMN enigh.poblacion.usotiempo2 IS 'FK -> enigh.cat_usotiempo.clave';
COMMENT ON COLUMN enigh.poblacion.usotiempo3 IS 'FK -> enigh.cat_usotiempo.clave';
COMMENT ON COLUMN enigh.poblacion.usotiempo4 IS 'FK -> enigh.cat_usotiempo.clave';
COMMENT ON COLUMN enigh.poblacion.usotiempo5 IS 'FK -> enigh.cat_usotiempo.clave';
COMMENT ON COLUMN enigh.poblacion.usotiempo6 IS 'FK -> enigh.cat_usotiempo.clave';
COMMENT ON COLUMN enigh.poblacion.usotiempo7 IS 'FK -> enigh.cat_usotiempo.clave';
COMMENT ON COLUMN enigh.poblacion.usotiempo8 IS 'FK -> enigh.cat_usotiempo.clave';
COMMENT ON COLUMN enigh.poblacion.inst_1 IS 'FK -> enigh.cat_inst.clave';
COMMENT ON COLUMN enigh.poblacion.inst_2 IS 'FK -> enigh.cat_inst.clave';
COMMENT ON COLUMN enigh.poblacion.inst_3 IS 'FK -> enigh.cat_inst.clave';
COMMENT ON COLUMN enigh.poblacion.inst_4 IS 'FK -> enigh.cat_inst.clave';
COMMENT ON COLUMN enigh.poblacion.inst_5 IS 'FK -> enigh.cat_inst.clave';
COMMENT ON COLUMN enigh.poblacion.inst_6 IS 'FK -> enigh.cat_inst.clave';
COMMENT ON COLUMN enigh.poblacion.inst_7 IS 'FK -> enigh.cat_inst.clave';
COMMENT ON COLUMN enigh.poblacion.inst_8 IS 'FK -> enigh.cat_inst.clave';
COMMENT ON COLUMN enigh.poblacion.inst_9 IS 'FK -> enigh.cat_inst.clave';
COMMENT ON COLUMN enigh.poblacion.atemed IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.inscr_1 IS 'FK -> enigh.cat_inscr.clave';
COMMENT ON COLUMN enigh.poblacion.inscr_2 IS 'FK -> enigh.cat_inscr.clave';
COMMENT ON COLUMN enigh.poblacion.inscr_3 IS 'FK -> enigh.cat_inscr.clave';
COMMENT ON COLUMN enigh.poblacion.inscr_4 IS 'FK -> enigh.cat_inscr.clave';
COMMENT ON COLUMN enigh.poblacion.inscr_5 IS 'FK -> enigh.cat_inscr.clave';
COMMENT ON COLUMN enigh.poblacion.inscr_6 IS 'FK -> enigh.cat_inscr.clave';
COMMENT ON COLUMN enigh.poblacion.inscr_7 IS 'FK -> enigh.cat_inscr.clave';
COMMENT ON COLUMN enigh.poblacion.inscr_8 IS 'FK -> enigh.cat_inscr.clave';
COMMENT ON COLUMN enigh.poblacion.prob_mes IS 'FK -> enigh.cat_mes.clave';
COMMENT ON COLUMN enigh.poblacion.prob_sal IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.aten_sal IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.servmed_1 IS 'FK -> enigh.cat_servmed.clave';
COMMENT ON COLUMN enigh.poblacion.servmed_2 IS 'FK -> enigh.cat_servmed.clave';
COMMENT ON COLUMN enigh.poblacion.servmed_3 IS 'FK -> enigh.cat_servmed.clave';
COMMENT ON COLUMN enigh.poblacion.servmed_4 IS 'FK -> enigh.cat_servmed.clave';
COMMENT ON COLUMN enigh.poblacion.servmed_5 IS 'FK -> enigh.cat_servmed.clave';
COMMENT ON COLUMN enigh.poblacion.servmed_6 IS 'FK -> enigh.cat_servmed.clave';
COMMENT ON COLUMN enigh.poblacion.servmed_7 IS 'FK -> enigh.cat_servmed.clave';
COMMENT ON COLUMN enigh.poblacion.servmed_8 IS 'FK -> enigh.cat_servmed.clave';
COMMENT ON COLUMN enigh.poblacion.servmed_9 IS 'FK -> enigh.cat_servmed.clave';
COMMENT ON COLUMN enigh.poblacion.servmed_10 IS 'FK -> enigh.cat_servmed.clave';
COMMENT ON COLUMN enigh.poblacion.servmed_11 IS 'FK -> enigh.cat_servmed.clave';
COMMENT ON COLUMN enigh.poblacion.pagoaten_1 IS 'FK -> enigh.cat_pagoaten.clave';
COMMENT ON COLUMN enigh.poblacion.pagoaten_2 IS 'FK -> enigh.cat_pagoaten.clave';
COMMENT ON COLUMN enigh.poblacion.pagoaten_3 IS 'FK -> enigh.cat_pagoaten.clave';
COMMENT ON COLUMN enigh.poblacion.pagoaten_4 IS 'FK -> enigh.cat_pagoaten.clave';
COMMENT ON COLUMN enigh.poblacion.pagoaten_5 IS 'FK -> enigh.cat_pagoaten.clave';
COMMENT ON COLUMN enigh.poblacion.pagoaten_6 IS 'FK -> enigh.cat_pagoaten.clave';
COMMENT ON COLUMN enigh.poblacion.pagoaten_7 IS 'FK -> enigh.cat_pagoaten.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_1 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_2 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_3 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_4 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_5 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_6 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_7 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_8 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_9 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_10 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_11 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_12 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_13 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_14 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_15 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.noatenc_16 IS 'FK -> enigh.cat_noatenc.clave';
COMMENT ON COLUMN enigh.poblacion.norecib_1 IS 'FK -> enigh.cat_norecib.clave';
COMMENT ON COLUMN enigh.poblacion.norecib_2 IS 'FK -> enigh.cat_norecib.clave';
COMMENT ON COLUMN enigh.poblacion.norecib_3 IS 'FK -> enigh.cat_norecib.clave';
COMMENT ON COLUMN enigh.poblacion.norecib_4 IS 'FK -> enigh.cat_norecib.clave';
COMMENT ON COLUMN enigh.poblacion.norecib_5 IS 'FK -> enigh.cat_norecib.clave';
COMMENT ON COLUMN enigh.poblacion.norecib_6 IS 'FK -> enigh.cat_norecib.clave';
COMMENT ON COLUMN enigh.poblacion.norecib_7 IS 'FK -> enigh.cat_norecib.clave';
COMMENT ON COLUMN enigh.poblacion.norecib_8 IS 'FK -> enigh.cat_norecib.clave';
COMMENT ON COLUMN enigh.poblacion.norecib_9 IS 'FK -> enigh.cat_norecib.clave';
COMMENT ON COLUMN enigh.poblacion.norecib_10 IS 'FK -> enigh.cat_norecib.clave';
COMMENT ON COLUMN enigh.poblacion.norecib_11 IS 'FK -> enigh.cat_norecib.clave';
COMMENT ON COLUMN enigh.poblacion.razon_1 IS 'FK -> enigh.cat_razon.clave';
COMMENT ON COLUMN enigh.poblacion.razon_2 IS 'FK -> enigh.cat_razon.clave';
COMMENT ON COLUMN enigh.poblacion.razon_3 IS 'FK -> enigh.cat_razon.clave';
COMMENT ON COLUMN enigh.poblacion.razon_4 IS 'FK -> enigh.cat_razon.clave';
COMMENT ON COLUMN enigh.poblacion.razon_5 IS 'FK -> enigh.cat_razon.clave';
COMMENT ON COLUMN enigh.poblacion.razon_6 IS 'FK -> enigh.cat_razon.clave';
COMMENT ON COLUMN enigh.poblacion.razon_7 IS 'FK -> enigh.cat_razon.clave';
COMMENT ON COLUMN enigh.poblacion.razon_8 IS 'FK -> enigh.cat_razon.clave';
COMMENT ON COLUMN enigh.poblacion.razon_9 IS 'FK -> enigh.cat_razon.clave';
COMMENT ON COLUMN enigh.poblacion.razon_10 IS 'FK -> enigh.cat_razon.clave';
COMMENT ON COLUMN enigh.poblacion.razon_11 IS 'FK -> enigh.cat_razon.clave';
COMMENT ON COLUMN enigh.poblacion.diabetes IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.pres_alta IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.peso IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.segvol_1 IS 'FK -> enigh.cat_segvol.clave';
COMMENT ON COLUMN enigh.poblacion.segvol_2 IS 'FK -> enigh.cat_segvol.clave';
COMMENT ON COLUMN enigh.poblacion.segvol_3 IS 'FK -> enigh.cat_segvol.clave';
COMMENT ON COLUMN enigh.poblacion.segvol_4 IS 'FK -> enigh.cat_segvol.clave';
COMMENT ON COLUMN enigh.poblacion.segvol_5 IS 'FK -> enigh.cat_segvol.clave';
COMMENT ON COLUMN enigh.poblacion.segvol_6 IS 'FK -> enigh.cat_segvol.clave';
COMMENT ON COLUMN enigh.poblacion.segvol_7 IS 'FK -> enigh.cat_segvol.clave';
COMMENT ON COLUMN enigh.poblacion.trabajo_mp IS 'FK -> enigh.cat_trabajo_mp.clave';
COMMENT ON COLUMN enigh.poblacion.motivo_aus IS 'FK -> enigh.cat_motivo_aus.clave';
COMMENT ON COLUMN enigh.poblacion.act_pnea1 IS 'FK -> enigh.cat_act_pnea.clave';
COMMENT ON COLUMN enigh.poblacion.act_pnea2 IS 'FK -> enigh.cat_act_pnea.clave';
COMMENT ON COLUMN enigh.poblacion.num_trabaj IS 'FK -> enigh.cat_num_trabaj.clave';
COMMENT ON COLUMN enigh.poblacion.c_futuro IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.poblacion.ct_futuro IS 'FK -> enigh.cat_ct_futuro.clave';
COMMENT ON COLUMN enigh.poblacion.entidad IS 'FK -> enigh.cat_entidad.clave';
-- FK comments for enigh.trabajos
COMMENT ON COLUMN enigh.trabajos.id_trabajo IS 'FK -> enigh.cat_id_trabajo.clave';
COMMENT ON COLUMN enigh.trabajos.trapais IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.trabajos.subor IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.trabajos.indep IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.trabajos.personal IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.trabajos.pago IS 'FK -> enigh.cat_pago.clave';
COMMENT ON COLUMN enigh.trabajos.contrato IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.trabajos.tipocontr IS 'FK -> enigh.cat_tipocontr.clave';
COMMENT ON COLUMN enigh.trabajos.pres_1 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_2 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_3 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_4 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_5 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_6 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_7 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_8 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_9 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_10 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_11 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_12 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_13 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_14 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_15 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_16 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_17 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_18 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_19 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.pres_20 IS 'FK -> enigh.cat_prestacion.clave';
COMMENT ON COLUMN enigh.trabajos.sinco IS 'FK -> enigh.cat_sinco.clave';
COMMENT ON COLUMN enigh.trabajos.scian IS 'FK -> enigh.cat_scian.clave';
COMMENT ON COLUMN enigh.trabajos.clas_emp IS 'FK -> enigh.cat_clas_emp.clave';
COMMENT ON COLUMN enigh.trabajos.tam_emp IS 'FK -> enigh.cat_tam_emp.clave';
COMMENT ON COLUMN enigh.trabajos.no_ing IS 'FK -> enigh.cat_no_ing.clave';
COMMENT ON COLUMN enigh.trabajos.tiene_suel IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.trabajos.tipoact IS 'FK -> enigh.cat_tipoact.clave';
COMMENT ON COLUMN enigh.trabajos.socios IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.trabajos.otra_act IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.trabajos.tipoact2 IS 'FK -> enigh.cat_tipoact.clave';
COMMENT ON COLUMN enigh.trabajos.tipoact3 IS 'FK -> enigh.cat_tipoact.clave';
COMMENT ON COLUMN enigh.trabajos.tipoact4 IS 'FK -> enigh.cat_tipoact.clave';
COMMENT ON COLUMN enigh.trabajos.lugar IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.trabajos.conf_pers IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.trabajos.medtrab_1 IS 'FK -> enigh.cat_medtrab.clave';
COMMENT ON COLUMN enigh.trabajos.medtrab_2 IS 'FK -> enigh.cat_medtrab.clave';
COMMENT ON COLUMN enigh.trabajos.medtrab_3 IS 'FK -> enigh.cat_medtrab.clave';
COMMENT ON COLUMN enigh.trabajos.medtrab_4 IS 'FK -> enigh.cat_medtrab.clave';
COMMENT ON COLUMN enigh.trabajos.medtrab_5 IS 'FK -> enigh.cat_medtrab.clave';
COMMENT ON COLUMN enigh.trabajos.medtrab_6 IS 'FK -> enigh.cat_medtrab.clave';
COMMENT ON COLUMN enigh.trabajos.medtrab_7 IS 'FK -> enigh.cat_medtrab.clave';
COMMENT ON COLUMN enigh.trabajos.entidad IS 'FK -> enigh.cat_entidad.clave';
-- FK comments for enigh.viviendas
COMMENT ON COLUMN enigh.viviendas.tipo_viv IS 'FK -> enigh.cat_tipo_viv.clave';
COMMENT ON COLUMN enigh.viviendas.mat_pared IS 'FK -> enigh.cat_mat_pared.clave';
COMMENT ON COLUMN enigh.viviendas.mat_techos IS 'FK -> enigh.cat_mat_techos.clave';
COMMENT ON COLUMN enigh.viviendas.mat_pisos IS 'FK -> enigh.cat_mat_pisos.clave';
COMMENT ON COLUMN enigh.viviendas.cocina IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.cocina_dor IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.lugar_coc IS 'FK -> enigh.cat_lugar_coc.clave';
COMMENT ON COLUMN enigh.viviendas.agua_ent IS 'FK -> enigh.cat_agua_ent.clave';
COMMENT ON COLUMN enigh.viviendas.ab_agua IS 'FK -> enigh.cat_ab_agua.clave';
COMMENT ON COLUMN enigh.viviendas.agua_noe IS 'FK -> enigh.cat_agua_noe.clave';
COMMENT ON COLUMN enigh.viviendas.dotac_agua IS 'FK -> enigh.cat_dotac_agua.clave';
COMMENT ON COLUMN enigh.viviendas.excusado IS 'FK -> enigh.cat_excusado.clave';
COMMENT ON COLUMN enigh.viviendas.uso_compar IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.sanit_agua IS 'FK -> enigh.cat_sanit_agua.clave';
COMMENT ON COLUMN enigh.viviendas.biodigest IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.drenaje IS 'FK -> enigh.cat_drenaje.clave';
COMMENT ON COLUMN enigh.viviendas.disp_elect IS 'FK -> enigh.cat_disp_elect.clave';
COMMENT ON COLUMN enigh.viviendas.combus IS 'FK -> enigh.cat_combus.clave';
COMMENT ON COLUMN enigh.viviendas.fogon_chi IS 'FK -> enigh.cat_fogon_chi.clave';
COMMENT ON COLUMN enigh.viviendas.eli_basura IS 'FK -> enigh.cat_eli_basura.clave';
COMMENT ON COLUMN enigh.viviendas.tenencia IS 'FK -> enigh.cat_tenencia.clave';
COMMENT ON COLUMN enigh.viviendas.pago_mesp IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.tipo_adqui IS 'FK -> enigh.cat_tipo_adqui.clave';
COMMENT ON COLUMN enigh.viviendas.viv_usada IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.finan_1 IS 'FK -> enigh.cat_tipo_finan.clave';
COMMENT ON COLUMN enigh.viviendas.finan_2 IS 'FK -> enigh.cat_tipo_finan.clave';
COMMENT ON COLUMN enigh.viviendas.finan_3 IS 'FK -> enigh.cat_tipo_finan.clave';
COMMENT ON COLUMN enigh.viviendas.finan_4 IS 'FK -> enigh.cat_tipo_finan.clave';
COMMENT ON COLUMN enigh.viviendas.finan_5 IS 'FK -> enigh.cat_tipo_finan.clave';
COMMENT ON COLUMN enigh.viviendas.finan_6 IS 'FK -> enigh.cat_tipo_finan.clave';
COMMENT ON COLUMN enigh.viviendas.finan_7 IS 'FK -> enigh.cat_tipo_finan.clave';
COMMENT ON COLUMN enigh.viviendas.finan_8 IS 'FK -> enigh.cat_tipo_finan.clave';
COMMENT ON COLUMN enigh.viviendas.escrituras IS 'FK -> enigh.cat_escrituras.clave';
COMMENT ON COLUMN enigh.viviendas.lavadero IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.fregadero IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.regadera IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.tinaco_azo IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.cisterna IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.pileta IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.calent_sol IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.calent_gas IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.calen_lena IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.medid_luz IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.bomba_agua IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.tanque_gas IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.aire_acond IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.calefacc IS 'FK -> enigh.cat_si_no.clave';
COMMENT ON COLUMN enigh.viviendas.p_grietas IS 'FK -> enigh.cat_si_no_nosabe.clave';
COMMENT ON COLUMN enigh.viviendas.p_pandeos IS 'FK -> enigh.cat_si_no_nosabe.clave';
COMMENT ON COLUMN enigh.viviendas.p_levanta IS 'FK -> enigh.cat_si_no_nosabe.clave';
COMMENT ON COLUMN enigh.viviendas.p_humedad IS 'FK -> enigh.cat_si_no_nosabe.clave';
COMMENT ON COLUMN enigh.viviendas.p_fractura IS 'FK -> enigh.cat_si_no_nosabe.clave';
COMMENT ON COLUMN enigh.viviendas.p_electric IS 'FK -> enigh.cat_si_no_nosabe.clave';
COMMENT ON COLUMN enigh.viviendas.p_tuberias IS 'FK -> enigh.cat_si_no_nosabe.clave';
COMMENT ON COLUMN enigh.viviendas.ubica_geo IS 'FK -> enigh.cat_ubica_geo.clave';
COMMENT ON COLUMN enigh.viviendas.tam_loc IS 'FK -> enigh.cat_tam_loc.clave';
COMMENT ON COLUMN enigh.viviendas.est_socio IS 'FK -> enigh.cat_est_socio.clave';
COMMENT ON COLUMN enigh.viviendas.procaptar IS 'FK -> enigh.cat_procaptar.clave';

COMMIT;
