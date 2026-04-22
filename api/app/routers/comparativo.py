"""Cross-schema comparativos CDMX ↔ ENIGH (tesis central del observatorio).

Todos los endpoints qualify schema explícitamente (cdmx.* y enigh.*) y
documentan unidades (persona/hogar, mensual/trimestral) en los responses.

Caveat heredado en todos los responses:
  - cdmx.nombramientos es snapshot sin fecha alta/baja; sin filtro temporal.

Caveats específicos:
  - C2/C7: deciles ENIGH = factor-weighted cumulative sum sobre ing_cor
    trimestral (reproducen tabulados INEGI, ±0.15% en 8/10 deciles, plan v2 §1.ter).
  - C3: NO es comparación actuarial. Yuxtapone aportes activos de CDMX vs
    pensiones recibidas hoy por hogares ENIGH.
"""
from fastapi import APIRouter, Request
from sqlalchemy import text

from app.database import engine
from app.rate_limit import limiter
from app.schemas.comparativo import (
    ActividadCdmxVsNacionalResponse,
    ActividadComparativa,
    AportesVsJubilacionesResponse,
    BancarizacionResponse,
    CaveatsInterpretativos,
    CdmxAportesActuales,
    DecilBound,
    DecilServidoresResponse,
    EnighJubilacionesActuales,
    EscenarioMapeoRow,
    EscenarioResponse,
    GastoRubroComparativo,
    GastosCdmxVsNacionalResponse,
    IngresoCdmxServidor,
    IngresoComparativoResponse,
    IngresoEnighHogar,
    PercentilRow,
    TopVsBottomResponse,
)

router = APIRouter(prefix="/api/v1/comparativo", tags=["comparativo"])


# Caveat heredado aplicado a TODOS los comparativos
CAVEAT_CDMX_SNAPSHOT = (
    "cdmx.nombramientos es snapshot sin fecha alta/baja. Incluye todos los "
    "registros disponibles sin filtro temporal (246,841 registros, 1 por persona)."
)

CAVEAT_ENIGH_UNIDADES = (
    "ENIGH mide ingreso total del hogar (salarios + transferencias + rentas + "
    "pensiones + actividad económica), no sueldo individual; mean 3.35 personas/hogar."
)

CAVEAT_DECILES_ENIGH = (
    "Deciles ENIGH son factor-weighted cumulative sum sobre ing_cor hogar "
    "trimestral; reproducen tabulados oficiales INEGI (±0.15% en 8/10 deciles, "
    "documentado en plan v2 §1.ter)."
)


# ---------------------------------------------------------------------
# C1 — /comparativo/ingreso/cdmx-vs-nacional
# ---------------------------------------------------------------------


SQL_C1_CDMX = """
SELECT
    AVG(sueldo_bruto)::float AS mean_bruto,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY sueldo_bruto)::float AS median_bruto,
    COUNT(*)::bigint AS n
FROM cdmx.nombramientos
WHERE sueldo_bruto IS NOT NULL
"""

SQL_C1_ENIGH_NAC = """
SELECT
    (SUM(ing_cor * factor) / SUM(factor) / 3.0)::float AS mean_mensual,
    SUM(factor)::bigint AS n_hogares_exp
FROM enigh.concentradohogar
"""

SQL_C1_ENIGH_CDMX = """
SELECT
    (SUM(c.ing_cor * c.factor) / SUM(c.factor) / 3.0)::float AS mean_mensual,
    SUM(c.factor)::bigint AS n_hogares_exp
FROM enigh.concentradohogar c
WHERE LEFT(c.ubica_geo, 2) = '09'
"""


@router.get("/ingreso/cdmx-vs-nacional", response_model=IngresoComparativoResponse)
@limiter.limit("30/minute")
async def ingreso_cdmx_vs_nacional(request: Request):
    """Compara ingreso mensual en las 3 referencias relevantes.

    - CDMX servidor (persona): mean/median de sueldo_bruto mensual
    - ENIGH hogar nacional: mean ing_cor trim/3 (ponderado factor)
    - ENIGH hogar CDMX (entidad 09): mean ing_cor trim/3 ponderado

    Las 3 cifras responden preguntas distintas. Brechas y ratios se calculan
    vs servidor mean (base común), pero son ilustrativos — las unidades no
    son directamente comparables (persona vs hogar).
    """
    async with engine.connect() as conn:
        cdmx = (await conn.execute(text(SQL_C1_CDMX))).mappings().one()
        nac = (await conn.execute(text(SQL_C1_ENIGH_NAC))).mappings().one()
        cdmx_enigh = (await conn.execute(text(SQL_C1_ENIGH_CDMX))).mappings().one()

    servidor_mean = cdmx["mean_bruto"]
    nac_mean = nac["mean_mensual"]
    cdmx_hog_mean = cdmx_enigh["mean_mensual"]

    return IngresoComparativoResponse(
        cdmx_servidor=IngresoCdmxServidor(
            unit="pesos mensuales por persona (servidor público CDMX)",
            n_servidores=cdmx["n"],
            mean_sueldo_bruto_mensual=round(servidor_mean, 2),
            median_sueldo_bruto_mensual=round(cdmx["median_bruto"], 2),
        ),
        enigh_hogar_nacional=IngresoEnighHogar(
            unit="pesos mensuales por hogar (ing_cor expandido)",
            scope="nacional",
            n_hogares_expandido=nac["n_hogares_exp"],
            mean_ing_cor_mensual=round(nac_mean, 2),
        ),
        enigh_hogar_cdmx=IngresoEnighHogar(
            unit="pesos mensuales por hogar (ing_cor expandido)",
            scope="entidad 09 — Ciudad de México",
            n_hogares_expandido=cdmx_enigh["n_hogares_exp"],
            mean_ing_cor_mensual=round(cdmx_hog_mean, 2),
        ),
        brecha_mean_servidor_vs_hogar_nacional=round(nac_mean - servidor_mean, 2),
        ratio_hogar_nacional_sobre_servidor=round(nac_mean / servidor_mean, 3),
        brecha_mean_servidor_vs_hogar_cdmx=round(cdmx_hog_mean - servidor_mean, 2),
        ratio_hogar_cdmx_sobre_servidor=round(cdmx_hog_mean / servidor_mean, 3),
        note=(
            "Brechas calculadas vs mean_servidor_bruto como base. Las unidades "
            "difieren (persona individual vs hogar con múltiples miembros), por "
            "lo que la 'brecha' no es equivalente a desigualdad entre personas. "
            "Un hogar ENIGH promedio tiene 3.35 personas y combina salarios + "
            "pensiones + transferencias + rentas + actividad económica."
        ),
        caveats=[
            CAVEAT_CDMX_SNAPSHOT,
            CAVEAT_ENIGH_UNIDADES,
            "Cifras ENIGH son trimestrales en microdato; se dividen entre 3 "
            "para reportar mensual. Las publicaciones oficiales INEGI reportan "
            "mensuales directamente.",
        ],
    )


# ---------------------------------------------------------------------
# C2 — /comparativo/decil-servidores-cdmx (tesis central)
# ---------------------------------------------------------------------


SQL_C2_CDMX_PCTS = """
SELECT
    percentile_cont(0.25) WITHIN GROUP (ORDER BY sueldo_bruto)::float AS p25,
    percentile_cont(0.50) WITHIN GROUP (ORDER BY sueldo_bruto)::float AS p50,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY sueldo_bruto)::float AS p75,
    percentile_cont(0.90) WITHIN GROUP (ORDER BY sueldo_bruto)::float AS p90
FROM cdmx.nombramientos WHERE sueldo_bruto IS NOT NULL
"""

SQL_C2_DECIL_BOUNDS = """
SELECT decil::int AS decil,
       (MIN(ing_cor) / 3.0)::float AS lower_mensual,
       (MAX(ing_cor) / 3.0)::float AS upper_mensual
FROM enigh.concentradohogar WHERE decil IS NOT NULL
GROUP BY decil ORDER BY decil
"""

# Mediana perceptor asalariado nacional (clave P001 = "Sueldos, salarios o jornal"
# en enigh.cat_ingresos_cat). n=106,397 perceptores; universal a nivel país.
SQL_C2_MEDIANA_ASALARIADO = """
SELECT (percentile_cont(0.5) WITHIN GROUP (ORDER BY ing_tri) / 3.0)::float AS median_mensual
FROM enigh.ingresos WHERE ing_tri > 0 AND clave = 'P001'
"""


def _map_ingreso_to_decil(ingreso: float, bounds: list[dict]) -> int | None:
    for b in bounds:
        if b["lower_mensual"] <= ingreso <= b["upper_mensual"]:
            return b["decil"]
    # si excede d10, devolver 10; si es menor a d1, devolver 1
    if ingreso > bounds[-1]["upper_mensual"]:
        return 10
    if ingreso < bounds[0]["lower_mensual"]:
        return 1
    return None


@router.get("/decil-servidores-cdmx", response_model=DecilServidoresResponse)
@limiter.limit("20/minute")
async def decil_servidores_cdmx(request: Request):
    """Mapea percentiles del sueldo servidor CDMX a deciles ENIGH bajo 2 escenarios.

    **Escenario A — Perceptor único**: el servidor es la única fuente de
    ingreso del hogar. Ingreso hogar ≈ sueldo_bruto servidor directo.

    **Escenario B — Servidor + perceptor mediano asalariado**: se asume el
    hogar con 2 perceptores: el servidor CDMX más una persona con ingreso
    equivalente a la mediana nacional de 'Sueldos, salarios o jornal'
    (enigh.ingresos.clave='P001'). Aproximación más defendible que
    '2× sueldo servidor' porque no asume que la pareja gana igual; ancla
    en una distribución empírica externa (n≈106k perceptores asalariados).

    Los deciles ENIGH se definen por bounds min/max de ing_cor trimestral
    dividido entre 3 para comparar mensual. Pueden haber huecos estrechos
    entre el upper de un decil y el lower del siguiente; el mapeo
    devuelve el decil más cercano en esos casos.

    TESIS CENTRAL del observatorio: cuantifica el posicionamiento del
    servidor público CDMX dentro de la distribución de ingresos hogar a
    nivel nacional, con supuestos explícitos y acotación por escenarios.
    """
    async with engine.connect() as conn:
        pct_row = (await conn.execute(text(SQL_C2_CDMX_PCTS))).mappings().one()
        bounds_rows = (await conn.execute(text(SQL_C2_DECIL_BOUNDS))).mappings().all()
        median_asal_row = (await conn.execute(text(SQL_C2_MEDIANA_ASALARIADO))).mappings().one()

    bounds = [{"decil": r["decil"], "lower_mensual": r["lower_mensual"],
               "upper_mensual": r["upper_mensual"]} for r in bounds_rows]

    median_asalariado = median_asal_row["median_mensual"]

    percentiles = [
        ("p25", pct_row["p25"]),
        ("p50", pct_row["p50"]),
        ("p75", pct_row["p75"]),
        ("p90", pct_row["p90"]),
    ]

    # Escenario A: servidor solo
    mapeo_a = [
        EscenarioMapeoRow(
            percentil=name,
            ingreso_hogar_supuesto_mensual=round(val, 2),
            decil_hogar_enigh=_map_ingreso_to_decil(val, bounds),
        )
        for name, val in percentiles
    ]

    # Escenario B: servidor + mediana asalariado nacional
    mapeo_b = [
        EscenarioMapeoRow(
            percentil=name,
            ingreso_hogar_supuesto_mensual=round(val + median_asalariado, 2),
            decil_hogar_enigh=_map_ingreso_to_decil(val + median_asalariado, bounds),
        )
        for name, val in percentiles
    ]

    decil_p50_a = mapeo_a[1].decil_hogar_enigh
    decil_p50_b = mapeo_b[1].decil_hogar_enigh

    narrative = (
        f"Bajo Escenario A (servidor CDMX como perceptor único), el servidor "
        f"mediano (sueldo ${pct_row['p50']:,.0f}/mes) cae en el decil {decil_p50_a} "
        f"de ingresos hogar nacional. Bajo Escenario B (servidor + perceptor "
        f"mediano asalariado ${median_asalariado:,.0f}/mes), el hogar total "
        f"${pct_row['p50'] + median_asalariado:,.0f}/mes cae en el decil "
        f"{decil_p50_b}. La diferencia entre escenarios refleja el peso relativo "
        f"del perceptor adicional; ambos escenarios son conservadores porque "
        f"omiten transferencias, rentas y otros componentes del ing_cor ENIGH."
    )

    # Distancia p50 al upper del decil donde cayó (para caveat interpretativo)
    bound_p50 = next(b for b in bounds if b["decil"] == decil_p50_a)
    frontera_distancia = round(bound_p50["upper_mensual"] - pct_row["p50"], 2)
    decil_siguiente = decil_p50_a + 1 if decil_p50_a < 10 else decil_p50_a
    salto_deciles_b = (decil_p50_b - decil_p50_a) if (decil_p50_b and decil_p50_a) else None

    return DecilServidoresResponse(
        cdmx_servidor={
            "unit": "pesos mensuales por persona (sueldo_bruto)",
            "percentiles": [
                PercentilRow(percentil=name, sueldo_mensual=round(val, 2)).model_dump()
                for name, val in percentiles
            ],
        },
        enigh_deciles_mensuales=[
            DecilBound(
                decil=b["decil"],
                lower_mensual=round(b["lower_mensual"], 2),
                upper_mensual=round(b["upper_mensual"], 2),
            ) for b in bounds
        ],
        escenarios=[
            EscenarioResponse(
                nombre="A: Perceptor único",
                supuesto="Servidor CDMX es la única fuente de ingreso del hogar",
                ingreso_adicional_mensual=0.0,
                mapeo=mapeo_a,
            ),
            EscenarioResponse(
                nombre="B: Servidor + perceptor mediano asalariado",
                supuesto=(
                    "Hogar con 2 perceptores: servidor CDMX + persona con "
                    "ingreso equivalente a la mediana nacional de 'Sueldos, "
                    "salarios o jornal' (enigh.ingresos.clave='P001', "
                    "n≈106k perceptores, mediana mensual documentada)"
                ),
                ingreso_adicional_mensual=round(median_asalariado, 2),
                mapeo=mapeo_b,
            ),
        ],
        narrative=narrative,
        caveats=[
            CAVEAT_CDMX_SNAPSHOT,
            CAVEAT_DECILES_ENIGH,
            "ENIGH.ing_cor incluye transferencias, rentas, pensiones y "
            "actividad económica además del salario. Los escenarios A y B "
            "acotan pero subestiman el decil real del hogar servidor CDMX si "
            "tiene esas fuentes adicionales.",
            "Escenario B usa mediana P001 como proxy del segundo perceptor; "
            "parejas con ingresos asimétricos (mayoría real) darían deciles "
            "intermedios entre A y B.",
            "Los bounds de decil son min/max de ing_cor dentro del decil. "
            "Un sueldo podría caer entre el upper de un decil y el lower del "
            "siguiente si el rango tiene microhuecos; en ese caso el decil "
            "inmediato superior o inferior aplica por cercanía.",
        ],
        caveats_interpretativos=CaveatsInterpretativos(
            frontera_p50=(
                f"Mediana CDMX ${pct_row['p50']:,.0f} cae a ${frontera_distancia:,.0f} "
                f"del boundary d{decil_p50_a}/d{decil_siguiente} "
                f"(upper d{decil_p50_a} = ${bound_p50['upper_mensual']:,.0f}). "
                f"Pequeña variación en distribución CDMX reclasificaría narrativa."
            ),
            narrativa_correcta=(
                f"Servidor mediano CDMX está EN FRONTERA d{decil_p50_a}/d{decil_siguiente} "
                f"nacional, no firmemente dentro de d{decil_p50_a}."
            ),
            insight_principal=(
                f"La posición socioeconómica del hogar depende más de COMPOSICIÓN "
                f"(número de perceptores) que del salario individual. Agregar un "
                f"perceptor mediano nacional al servidor mediano CDMX mueve el hogar "
                f"{salto_deciles_b} deciles arriba (d{decil_p50_a} → d{decil_p50_b})."
            ),
            implicacion_narrativa=(
                f"Afirmar 'servidor público CDMX = decil {decil_p50_a}' es técnicamente "
                f"correcto bajo supuesto específico (perceptor único) pero engañoso sin "
                f"contexto. La posición real depende de variables no visibles en "
                f"cdmx.nombramientos (¿hay cónyuge? ¿cuánto gana? ¿hay otros perceptores?)."
            ),
        ),
    )


# ---------------------------------------------------------------------
# C3 — /comparativo/aportes-vs-jubilaciones-actuales
# ---------------------------------------------------------------------


SQL_C3_CDMX = """
SELECT
    COUNT(*)::bigint AS n,
    AVG(sueldo_bruto)::float AS mean_bruto,
    AVG(sueldo_neto)::float AS mean_neto,
    AVG(sueldo_bruto - sueldo_neto)::float AS mean_deduc,
    (AVG(CASE WHEN sueldo_bruto > 0
              THEN (sueldo_bruto - sueldo_neto) / sueldo_bruto ELSE NULL END) * 100)::float AS pct_deduc
FROM cdmx.nombramientos
WHERE sueldo_bruto IS NOT NULL AND sueldo_neto IS NOT NULL
"""

SQL_C3_ENIGH_JUB = """
SELECT
    (SUM(jubilacion * factor) / SUM(factor))::float AS mean_jub_trim_todos,
    (100.0 * SUM(CASE WHEN jubilacion > 0 THEN factor ELSE 0 END) / SUM(factor))::float AS pct_con_jub,
    (SUM(CASE WHEN jubilacion > 0 THEN jubilacion * factor ELSE 0 END) /
     NULLIF(SUM(CASE WHEN jubilacion > 0 THEN factor ELSE 0 END), 0))::float AS mean_jub_trim_solo_jub,
    SUM(CASE WHEN jubilacion > 0 THEN factor ELSE 0 END)::bigint AS n_exp_con_jub
FROM enigh.concentradohogar
"""


@router.get("/aportes-vs-jubilaciones-actuales", response_model=AportesVsJubilacionesResponse)
@limiter.limit("20/minute")
async def aportes_vs_jubilaciones_actuales(request: Request):
    """Yuxtaposición descriptiva — NO proyección actuarial.

    - CDMX.deducciones (bruto - neto) es el agregado total: ISR + IMSS/ISSSTE
      + SAR + otras deducciones. NO es separable a nivel registro.
    - ENIGH.jubilaciones son pensiones CURRENTLY cobradas por hogares ENIGH 2024
      NS, no proyecciones de lo que recibirá un servidor CDMX al jubilarse.
    - Los sistemas y las generaciones tienen reglas distintas. La comparación
      útil es magnitud relativa, no equivalencia.
    """
    async with engine.connect() as conn:
        cdmx = (await conn.execute(text(SQL_C3_CDMX))).mappings().one()
        enigh_row = (await conn.execute(text(SQL_C3_ENIGH_JUB))).mappings().one()

    mean_jub_solo_trim = enigh_row["mean_jub_trim_solo_jub"] or 0
    interpretacion = (
        f"Mensualmente, un servidor CDMX activo aporta ~${cdmx['mean_deduc']:,.0f} "
        f"en deducciones totales (promedio) — este monto INCLUYE ISR + IMSS/ISSSTE "
        f"+ SAR + otras, sin separación a nivel registro. Simultáneamente, "
        f"{enigh_row['pct_con_jub']:.1f}% de los hogares nacionales reciben "
        f"jubilación, con promedio trimestral ${mean_jub_solo_trim:,.0f} "
        f"(${mean_jub_solo_trim/3:,.0f}/mes) solo para quienes la reciben. "
        f"Son dos realidades coexistentes del sistema de pensiones, no un gap "
        f"actuarial predictivo."
    )

    return AportesVsJubilacionesResponse(
        cdmx_aportes_actuales=CdmxAportesActuales(
            unit="pesos mensuales por servidor público CDMX",
            n_servidores=cdmx["n"],
            mean_sueldo_bruto=round(cdmx["mean_bruto"], 2),
            mean_sueldo_neto=round(cdmx["mean_neto"], 2),
            mean_deduccion_total=round(cdmx["mean_deduc"], 2),
            pct_deduccion_sobre_bruto=round(cdmx["pct_deduc"], 2),
        ),
        enigh_jubilaciones_actuales=EnighJubilacionesActuales(
            unit_trim="pesos trimestrales por hogar",
            unit_mes="pesos mensuales por hogar (trim / 3)",
            pct_hogares_con_jubilacion=round(enigh_row["pct_con_jub"], 2),
            mean_jubilacion_sobre_todos_trim=round(enigh_row["mean_jub_trim_todos"], 2),
            mean_jubilacion_solo_jubilados_trim=round(mean_jub_solo_trim, 2),
            mean_jubilacion_solo_jubilados_mensual=round(mean_jub_solo_trim / 3, 2),
            n_hogares_con_jubilacion_expandido=enigh_row["n_exp_con_jub"],
        ),
        interpretacion=interpretacion,
        caveats=[
            CAVEAT_CDMX_SNAPSHOT,
            "cdmx.nombramientos.deducciones (bruto - neto) es el agregado total: "
            "INCLUYE ISR + IMSS/ISSSTE + SAR + créditos personales + otras "
            "deducciones sin separación posible a nivel registro. Usarla como "
            "proxy de 'aporte a pensión' sobreestima el aporte real.",
            "ENIGH.jubilaciones son pensiones CURRENTLY cobradas por hogares "
            "del universo ENIGH 2024 NS (18.5% de hogares), no proyección de "
            "lo que recibirá un servidor CDMX al jubilarse.",
            "NO es comparación actuarial. El gap deducción CDMX hoy vs "
            "jubilación promedio ENIGH hoy NO predice el futuro del servidor "
            "CDMX. Sistemas (IMSS-1973, IMSS-1997, ISSSTE-2007, cuentas "
            "individuales SAR) y generaciones con reglas distintas.",
            "La comparación útil es magnitud relativa (¿qué fracción del "
            "ingreso activo se aporta vs qué fracción del hogar pensionado "
            "proviene de jubilación?), no equivalencia 1:1.",
        ],
    )


# ---------------------------------------------------------------------
# C4 — /comparativo/actividad-cdmx-vs-nacional
# ---------------------------------------------------------------------


SQL_C4 = """
WITH hog_agro AS (SELECT DISTINCT folioviv, foliohog FROM enigh.agro),
     hog_noagro AS (SELECT DISTINCT folioviv, foliohog FROM enigh.noagro)
SELECT
    (SELECT SUM(factor)::bigint FROM enigh.hogares) AS total_nac,
    (SELECT SUM(factor)::bigint FROM enigh.hogares WHERE entidad='09') AS total_cdmx,
    (SELECT COALESCE(SUM(h.factor), 0)::bigint
       FROM hog_agro ha JOIN enigh.hogares h USING (folioviv, foliohog)) AS agro_nac,
    (SELECT COALESCE(SUM(h.factor), 0)::bigint
       FROM hog_agro ha JOIN enigh.hogares h USING (folioviv, foliohog) WHERE h.entidad='09') AS agro_cdmx,
    (SELECT COALESCE(SUM(h.factor), 0)::bigint
       FROM hog_noagro ha JOIN enigh.hogares h USING (folioviv, foliohog)) AS noagro_nac,
    (SELECT COALESCE(SUM(h.factor), 0)::bigint
       FROM hog_noagro ha JOIN enigh.hogares h USING (folioviv, foliohog) WHERE h.entidad='09') AS noagro_cdmx
"""


@router.get("/actividad-cdmx-vs-nacional", response_model=ActividadCdmxVsNacionalResponse)
@limiter.limit("30/minute")
async def actividad_cdmx_vs_nacional(request: Request):
    """Contraste urbano/rural: % hogares con actividad agro y no-agro en CDMX vs nacional.

    Esperable: CDMX << nacional en agro (9.64% nacional, memory indica residuos
    periurbanos Milpa Alta/Tláhuac/Xochimilco en CDMX); CDMX >= nacional en noagro
    (22.77% nacional; CDMX es metrópoli comercial con mayor actividad
    no-agropecuaria por hogar).
    """
    async with engine.connect() as conn:
        r = (await conn.execute(text(SQL_C4))).mappings().one()

    total_nac = r["total_nac"]
    total_cdmx = r["total_cdmx"]
    pct_agro_nac = 100 * r["agro_nac"] / total_nac
    pct_agro_cdmx = 100 * r["agro_cdmx"] / total_cdmx
    pct_noagro_nac = 100 * r["noagro_nac"] / total_nac
    pct_noagro_cdmx = 100 * r["noagro_cdmx"] / total_cdmx

    return ActividadCdmxVsNacionalResponse(
        agro=ActividadComparativa(
            tipo="agropecuaria",
            hogares_expandido_nacional=r["agro_nac"],
            hogares_expandido_cdmx=r["agro_cdmx"],
            pct_nacional=round(pct_agro_nac, 2),
            pct_cdmx=round(pct_agro_cdmx, 2),
            ratio_cdmx_sobre_nacional=round(pct_agro_cdmx / pct_agro_nac, 3) if pct_agro_nac else 0,
        ),
        noagro=ActividadComparativa(
            tipo="no-agropecuaria",
            hogares_expandido_nacional=r["noagro_nac"],
            hogares_expandido_cdmx=r["noagro_cdmx"],
            pct_nacional=round(pct_noagro_nac, 2),
            pct_cdmx=round(pct_noagro_cdmx, 2),
            ratio_cdmx_sobre_nacional=round(pct_noagro_cdmx / pct_noagro_nac, 3) if pct_noagro_nac else 0,
        ),
        n_hogares_total_nacional=total_nac,
        n_hogares_total_cdmx=total_cdmx,
        note=(
            "CDMX tiene presencia residual de actividad agro (periurbana: "
            "Milpa Alta, Tláhuac, Xochimilco). Noagro es actividad "
            "persona-trabajo-tipoact (comercio, servicios, manufactura); "
            "el ratio captura concentración económica vs actividad agrícola."
        ),
        nota_hipotesis=(
            "Hipótesis a explorar: CDMX concentra empleo formal asalariado, "
            "reduciendo la necesidad/incentivo de auto-empleo no-agropecuario. "
            "Estados con menor formalización laboral pueden tener mayor % "
            "noagro por acceso limitado a empleo asalariado. Esta hipótesis "
            "NO se ha probado con los datos cargados."
        ),
        caveats=[
            "Cobertura hogares usa DISTINCT (folioviv, foliohog) sobre agro/"
            "noagro porque son tablas persona-trabajo-tipoact, no hogar-raíz.",
            "Un hogar con múltiples miembros con actividades distintas cuenta "
            "UNA VEZ en cobertura (pero múltiples veces en sumas de ventas).",
        ],
    )


# ---------------------------------------------------------------------
# C5 — /comparativo/gastos/cdmx-vs-nacional
# ---------------------------------------------------------------------


# Los 9 rubros INEGI (mismos que en enigh.py, sin gasto_mon)
_RUBROS_C5 = [
    ("alimentos",  "alimentos",              "Alimentos, bebidas y tabaco"),
    ("transporte", "transporte",             "Transporte y comunicaciones"),
    ("educa_espa", "educacion_esparcimiento","Educación y esparcimiento"),
    ("vivienda",   "vivienda",               "Vivienda y servicios"),
    ("personales", "cuidados_personales",    "Cuidados personales"),
    ("limpieza",   "limpieza_hogar",         "Enseres / limpieza del hogar"),
    ("vesti_calz", "vestido_calzado",        "Vestido y calzado"),
    ("salud",      "salud",                  "Salud"),
    ("transf_gas", "transferencias_gasto",   "Transferencias y otros gastos"),
]


def _build_c5_sql() -> str:
    # construye una query única con 18 agregados (9 rubros × 2 scopes)
    parts_nac = [
        f"(SUM(c.{col} * c.factor) / SUM(c.factor) / 3.0)::float AS {col}_nac"
        for col, *_ in _RUBROS_C5
    ]
    parts_cdmx = [
        f"(SUM(c.{col} * c.factor) FILTER (WHERE h.entidad='09') / "
        f" NULLIF(SUM(c.factor) FILTER (WHERE h.entidad='09'), 0) / 3.0)::float AS {col}_cdmx"
        for col, *_ in _RUBROS_C5
    ]
    return f"""
    SELECT
        (SUM(c.gasto_mon * c.factor) / SUM(c.factor) / 3.0)::float AS gmon_nac,
        (SUM(c.gasto_mon * c.factor) FILTER (WHERE h.entidad='09') /
         NULLIF(SUM(c.factor) FILTER (WHERE h.entidad='09'), 0) / 3.0)::float AS gmon_cdmx,
        {', '.join(parts_nac)},
        {', '.join(parts_cdmx)}
    FROM enigh.concentradohogar c
    JOIN enigh.hogares h USING (folioviv, foliohog)
    """


SQL_C5 = _build_c5_sql()


@router.get("/gastos/cdmx-vs-nacional", response_model=GastosCdmxVsNacionalResponse)
@limiter.limit("20/minute")
async def gastos_cdmx_vs_nacional(request: Request):
    """Gasto mensual por rubro — los 9 rubros INEGI oficiales — CDMX vs nacional.

    Devuelve mean mensual por rubro en ambos scopes y delta absoluto + relativo,
    más estructura de gasto (%) de cada rubro sobre el gasto monetario total.
    """
    async with engine.connect() as conn:
        r = (await conn.execute(text(SQL_C5))).mappings().one()

    gmon_nac = r["gmon_nac"]
    gmon_cdmx = r["gmon_cdmx"]

    rubros = []
    for col, slug, nombre in _RUBROS_C5:
        nac = r[f"{col}_nac"]
        cdmx = r[f"{col}_cdmx"]
        rubros.append(GastoRubroComparativo(
            slug=slug,
            nombre=nombre,
            mean_cdmx_mensual=round(cdmx, 2),
            mean_nacional_mensual=round(nac, 2),
            delta_absoluto=round(cdmx - nac, 2),
            delta_pct=round((cdmx - nac) / nac * 100, 2) if nac else 0.0,
            pct_del_monetario_cdmx=round(100 * cdmx / gmon_cdmx, 2) if gmon_cdmx else 0.0,
            pct_del_monetario_nacional=round(100 * nac / gmon_nac, 2) if gmon_nac else 0.0,
        ))

    return GastosCdmxVsNacionalResponse(
        mean_gasto_mon_mensual_nacional=round(gmon_nac, 2),
        mean_gasto_mon_mensual_cdmx=round(gmon_cdmx, 2),
        rubros=rubros,
        note=(
            "Valores desde enigh.concentradohogar (tabla summary oficial). "
            "Todos los agregados ponderados por factor. Delta positivo = CDMX "
            "gasta más que el promedio nacional en ese rubro; negativo = menos."
        ),
        caveats=[
            "Los valores son nacional / CDMX (entidad 09). No se desagrega por "
            "decil dentro de CDMX. Un hogar CDMX decil 1 y uno decil 10 pueden "
            "tener estructuras de gasto muy distintas.",
            "Las publicaciones INEGI oficiales cubren total nacional. El corte "
            "CDMX es analítico propio y no tiene bound directo del Comunicado 112/25.",
        ],
    )


# ---------------------------------------------------------------------
# C6 — /comparativo/bancarizacion
# ---------------------------------------------------------------------


SQL_C6 = """
WITH hog_tarj AS (SELECT DISTINCT folioviv, foliohog FROM enigh.gastotarjetas)
SELECT
    (SELECT SUM(factor)::bigint FROM enigh.hogares) AS total_nac,
    (SELECT SUM(factor)::bigint FROM enigh.hogares WHERE entidad='09') AS total_cdmx,
    COALESCE((SELECT SUM(h.factor)::bigint
              FROM hog_tarj ht JOIN enigh.hogares h USING (folioviv, foliohog)), 0) AS con_tarj_nac,
    COALESCE((SELECT SUM(h.factor)::bigint
              FROM hog_tarj ht JOIN enigh.hogares h USING (folioviv, foliohog)
              WHERE h.entidad='09'), 0) AS con_tarj_cdmx
"""


@router.get("/bancarizacion", response_model=BancarizacionResponse)
@limiter.limit("30/minute")
async def bancarizacion(request: Request):
    """Uso de tarjeta (crédito o débito) en trimestre — CDMX vs nacional.

    Definición operativa: "hogar con ≥1 registro en enigh.gastotarjetas en
    el trimestre de referencia". NO mide posesión de tarjeta, solo uso
    efectivo en trimestre; captura débito + crédito indistintamente.
    """
    async with engine.connect() as conn:
        r = (await conn.execute(text(SQL_C6))).mappings().one()

    pct_nac = 100 * r["con_tarj_nac"] / r["total_nac"]
    pct_cdmx = 100 * r["con_tarj_cdmx"] / r["total_cdmx"]

    return BancarizacionResponse(
        definicion_operativa=(
            "Hogar con ≥1 registro en enigh.gastotarjetas en el trimestre de "
            "referencia. NO mide posesión de tarjeta; mide USO EFECTIVO en "
            "trimestre. Captura débito + crédito sin distinción."
        ),
        n_hogares_expandido_nacional=r["total_nac"],
        n_hogares_expandido_cdmx=r["total_cdmx"],
        hogares_con_uso_tarjeta_nacional=r["con_tarj_nac"],
        hogares_con_uso_tarjeta_cdmx=r["con_tarj_cdmx"],
        pct_nacional=round(pct_nac, 2),
        pct_cdmx=round(pct_cdmx, 2),
        delta_pp=round(pct_cdmx - pct_nac, 2),
        ratio_cdmx_sobre_nacional=round(pct_cdmx / pct_nac, 3) if pct_nac else 0,
        caveats=[
            "Definición mide USO, no POSESIÓN. Un hogar con tarjeta que no la "
            "usó en trimestre NO está contado. Un hogar sin tarjeta pero que "
            "usó una prestada o un pago con tarjeta de tercero SÍ está contado "
            "(los casos reales son marginales pero existen).",
            "gastotarjetas captura débito + crédito sin distinguir. Si se "
            "quisiera solo crédito, requiere filtro adicional por clave.",
            "La cifra nacional (~8.87%) parece baja en términos absolutos porque "
            "la definición es trimestral, no anual. Un hogar que use tarjeta "
            "semestralmente tiene 50% probabilidad de aparecer en un trimestre.",
        ],
    )


# ---------------------------------------------------------------------
# C7 — /comparativo/top-vs-bottom (narrative-heavy)
# ---------------------------------------------------------------------


SQL_C7_CDMX = """
SELECT
    percentile_cont(0.01) WITHIN GROUP (ORDER BY sueldo_bruto)::float AS p01,
    percentile_cont(0.05) WITHIN GROUP (ORDER BY sueldo_bruto)::float AS p05,
    percentile_cont(0.10) WITHIN GROUP (ORDER BY sueldo_bruto)::float AS p10,
    percentile_cont(0.90) WITHIN GROUP (ORDER BY sueldo_bruto)::float AS p90,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY sueldo_bruto)::float AS p95,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY sueldo_bruto)::float AS p99,
    COUNT(*)::bigint AS n
FROM cdmx.nombramientos WHERE sueldo_bruto IS NOT NULL
"""

SQL_C7_ENIGH_EXTREMOS = """
SELECT
    (SUM(ing_cor * factor) FILTER (WHERE decil=1) /
     NULLIF(SUM(factor) FILTER (WHERE decil=1), 0) / 3.0)::float AS d1_mean_mensual,
    (SUM(ing_cor * factor) FILTER (WHERE decil=10) /
     NULLIF(SUM(factor) FILTER (WHERE decil=10), 0) / 3.0)::float AS d10_mean_mensual,
    (MIN(ing_cor) FILTER (WHERE decil=1) / 3.0)::float AS d1_lower,
    (MAX(ing_cor) FILTER (WHERE decil=1) / 3.0)::float AS d1_upper,
    (MIN(ing_cor) FILTER (WHERE decil=10) / 3.0)::float AS d10_lower,
    (MAX(ing_cor) FILTER (WHERE decil=10) / 3.0)::float AS d10_upper
FROM enigh.concentradohogar
"""


@router.get("/top-vs-bottom", response_model=TopVsBottomResponse)
@limiter.limit("20/minute")
async def top_vs_bottom(request: Request):
    """Extremos CDMX (p1/p5/p10 vs p90/p95/p99) mapeados contra ENIGH d1 y d10.

    Muestra el rango completo de la brecha entre servidores públicos CDMX y la
    distribución nacional de ingresos hogar. Insight central esperable:
    incluso el p99 CDMX (top 1% servidores) está debajo del mean mensual d10
    nacional — la distribución CDMX está comprimida respecto a la distribución
    nacional hogar (última incluye transferencias + rentas + múltiples perceptores).
    """
    async with engine.connect() as conn:
        cdmx = (await conn.execute(text(SQL_C7_CDMX))).mappings().one()
        ext = (await conn.execute(text(SQL_C7_ENIGH_EXTREMOS))).mappings().one()

    # bottom bracket: p01-p10 CDMX vs d1 ENIGH
    p01, p05, p10 = cdmx["p01"], cdmx["p05"], cdmx["p10"]
    d1_mean = ext["d1_mean_mensual"]
    d1_upper = ext["d1_upper"]

    # top bracket: p90-p99 CDMX vs d10 ENIGH
    p90, p95, p99 = cdmx["p90"], cdmx["p95"], cdmx["p99"]
    d10_mean = ext["d10_mean_mensual"]
    d10_lower = ext["d10_lower"]

    insight_p99 = (
        f"CDMX p99 (${p99:,.0f}/mes) está por DEBAJO del mean d10 nacional "
        f"(${d10_mean:,.0f}/mes hogar) por ${d10_mean - p99:,.0f}/mes. "
        f"El top 1% de servidores CDMX, a nivel individual, no alcanza el "
        f"promedio de ingreso hogar del decil 10 nacional."
    )

    insight_p99_vs_d10_lower = (
        f"Para caer en d10 nacional (lower d10 ${d10_lower:,.0f}), un servidor "
        f"necesitaría ganar ~${d10_lower:,.0f}/mes individualmente — superior "
        f"al p99 CDMX ($" f"{p99:,.0f})." if p99 < d10_lower else
        f"El p99 CDMX (${p99:,.0f}) supera el lower d10 nacional "
        f"(${d10_lower:,.0f}), es decir, solo el top 1% de servidores entra "
        f"individualmente en d10 hogar."
    )

    insight_p01 = (
        f"CDMX p01 (${p01:,.0f}/mes) vs d1 mean nacional (${d1_mean:,.0f}/mes "
        f"hogar). Brecha p01 vs d1_mean = ${p01 - d1_mean:,.0f}. Un servidor "
        f"en el bottom 1% gana {'más' if p01 > d1_mean else 'menos'} que un "
        f"hogar promedio d1 (que incluye múltiples perceptores o transferencias)."
    )

    narrative = (
        f"El top 1% de servidores CDMX (${p99:,.0f}/mes individual) entra al "
        f"decil 10 nacional como perceptor único (lower d10 = ${d10_lower:,.0f}), "
        f"pero se posiciona en el segmento inferior de ese decil. El mean del "
        f"decil 10 nacional es ${d10_mean:,.0f}/mes como hogar, lo que típicamente "
        f"representa hogares con múltiples perceptores altos o patrimonio generador "
        f"de ingresos adicionales. La distancia p99_servidor vs mean_d10_hogar no "
        f"es evidencia de 'servidores top CDMX debajo del decil 10' sino de que el "
        f"decil 10 nacional está dominado por hogares con composición de ingreso "
        f"más rica que un solo salario."
    )

    return TopVsBottomResponse(
        top_bracket={
            "unit": "pesos mensuales",
            "cdmx_servidor_percentiles": {
                "p90": round(p90, 2), "p95": round(p95, 2), "p99": round(p99, 2),
            },
            "enigh_d10": {
                "mean_mensual": round(d10_mean, 2),
                "lower_mensual": round(d10_lower, 2),
                "upper_mensual": round(ext["d10_upper"], 2),
            },
            "brecha_p99_vs_d10_mean": round(d10_mean - p99, 2),
            "ratio_d10_mean_sobre_p99": round(d10_mean / p99, 3) if p99 else 0,
        },
        bottom_bracket={
            "unit": "pesos mensuales",
            "cdmx_servidor_percentiles": {
                "p01": round(p01, 2), "p05": round(p05, 2), "p10": round(p10, 2),
            },
            "enigh_d1": {
                "mean_mensual": round(d1_mean, 2),
                "lower_mensual": round(ext["d1_lower"], 2),
                "upper_mensual": round(d1_upper, 2),
            },
            "brecha_p01_vs_d1_mean": round(p01 - d1_mean, 2),
        },
        narrative=narrative,
        insights=[insight_p99, insight_p99_vs_d10_lower, insight_p01],
        caveats=[
            CAVEAT_CDMX_SNAPSHOT,
            CAVEAT_DECILES_ENIGH,
            CAVEAT_ENIGH_UNIDADES,
            "ENIGH d10 incluye outliers muy altos (upper ~$5.8M/mes) que "
            "elevan el mean de d10. El mean d10 no es el tope del decil; es "
            "el promedio. El upper d10 representa el ingreso máximo observado.",
            "La distribución CDMX servidor está inherentemente acotada por "
            "regulaciones salariales del sector público; la distribución "
            "ENIGH hogar refleja el rango completo de ingresos de la economía.",
        ],
    )
