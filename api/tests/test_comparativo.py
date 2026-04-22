"""Tests para /api/v1/comparativo/* — 7 endpoints cross-schema CDMX↔ENIGH.

Grupo C (tesis central del observatorio multi-dataset).
"""


# ---------------------------------------------------------------------
# C1 — ingreso/cdmx-vs-nacional
# ---------------------------------------------------------------------


async def test_c1_ingreso_tres_unidades(client):
    r = await client.get("/api/v1/comparativo/ingreso/cdmx-vs-nacional")
    assert r.status_code == 200
    b = r.json()
    for key in ("cdmx_servidor", "enigh_hogar_nacional", "enigh_hogar_cdmx",
                "brecha_mean_servidor_vs_hogar_nacional",
                "ratio_hogar_cdmx_sobre_servidor", "note", "caveats"):
        assert key in b
    # CDMX servidor median ≈ 10,410
    assert abs(b["cdmx_servidor"]["median_sueldo_bruto_mensual"] - 10410) < 100
    # ENIGH nacional ~25,955 mensual (77,864/3)
    assert abs(b["enigh_hogar_nacional"]["mean_ing_cor_mensual"] - 25955) < 100
    # Ratio hogar CDMX > hogar nacional
    assert b["enigh_hogar_cdmx"]["mean_ing_cor_mensual"] > b["enigh_hogar_nacional"]["mean_ing_cor_mensual"]
    # Caveat CDMX snapshot presente
    assert any("snapshot" in c.lower() for c in b["caveats"])


# ---------------------------------------------------------------------
# C2 — decil-servidores-cdmx (TESIS CENTRAL)
# ---------------------------------------------------------------------


async def test_c2_decil_servidores_estructura(client):
    r = await client.get("/api/v1/comparativo/decil-servidores-cdmx")
    assert r.status_code == 200
    b = r.json()
    for key in ("cdmx_servidor", "enigh_deciles_mensuales", "escenarios",
                "narrative", "caveats", "caveats_interpretativos"):
        assert key in b
    assert len(b["enigh_deciles_mensuales"]) == 10
    assert len(b["escenarios"]) == 2


async def test_c2_decil_p50_en_frontera_d2_d3(client):
    """Aserción narrativa: mediana CDMX cae en decil 2 o 3 (frontera)."""
    r = await client.get("/api/v1/comparativo/decil-servidores-cdmx")
    b = r.json()
    esc_a = next(e for e in b["escenarios"] if e["nombre"].startswith("A"))
    p50_row = next(m for m in esc_a["mapeo"] if m["percentil"] == "p50")
    assert p50_row["decil_hogar_enigh"] in (2, 3), \
        f"p50 servidor debería estar en frontera d2/d3, está en d{p50_row['decil_hogar_enigh']}"


async def test_c2_caveats_interpretativos_presentes(client):
    r = await client.get("/api/v1/comparativo/decil-servidores-cdmx")
    b = r.json()
    ci = b["caveats_interpretativos"]
    for key in ("frontera_p50", "narrativa_correcta", "insight_principal",
                "implicacion_narrativa"):
        assert key in ci and ci[key]  # non-empty


async def test_c2_escenario_b_es_mas_alto_que_a(client):
    """Al sumar perceptor mediano, el decil debe ser >= al de escenario A."""
    r = await client.get("/api/v1/comparativo/decil-servidores-cdmx")
    b = r.json()
    esc_a = next(e for e in b["escenarios"] if e["nombre"].startswith("A"))
    esc_b = next(e for e in b["escenarios"] if e["nombre"].startswith("B"))
    for a_row, b_row in zip(esc_a["mapeo"], esc_b["mapeo"]):
        if a_row["decil_hogar_enigh"] and b_row["decil_hogar_enigh"]:
            assert b_row["decil_hogar_enigh"] >= a_row["decil_hogar_enigh"]


# ---------------------------------------------------------------------
# C3 — aportes-vs-jubilaciones-actuales
# ---------------------------------------------------------------------


async def test_c3_aportes_vs_jubilaciones_caveats_actuariales(client):
    r = await client.get("/api/v1/comparativo/aportes-vs-jubilaciones-actuales")
    assert r.status_code == 200
    b = r.json()
    # Caveat "NO es comparación actuarial" presente
    assert any("actuarial" in c.lower() for c in b["caveats"])
    # ENIGH: ~18.5% hogares con jubilación
    assert 18 <= b["enigh_jubilaciones_actuales"]["pct_hogares_con_jubilacion"] <= 19
    # CDMX deducción positiva
    assert b["cdmx_aportes_actuales"]["mean_deduccion_total"] > 0
    assert b["cdmx_aportes_actuales"]["pct_deduccion_sobre_bruto"] > 0


# ---------------------------------------------------------------------
# C4 — actividad-cdmx-vs-nacional
# ---------------------------------------------------------------------


async def test_c4_actividad_cdmx_menor_agro(client):
    r = await client.get("/api/v1/comparativo/actividad-cdmx-vs-nacional")
    assert r.status_code == 200
    b = r.json()
    # CDMX tiene mucho menos agro que nacional (ratio << 1)
    assert b["agro"]["ratio_cdmx_sobre_nacional"] < 0.1
    # Nacional agro ≈ 9.64%
    assert 9.1 <= b["agro"]["pct_nacional"] <= 10.2
    # Hipótesis marcada como tal
    assert "hipótesis" in b["nota_hipotesis"].lower() or "hipotesis" in b["nota_hipotesis"].lower()
    assert "NO se ha probado" in b["nota_hipotesis"]


# ---------------------------------------------------------------------
# C5 — gastos/cdmx-vs-nacional
# ---------------------------------------------------------------------


async def test_c5_gastos_cdmx_vs_nacional_9_rubros(client):
    r = await client.get("/api/v1/comparativo/gastos/cdmx-vs-nacional")
    assert r.status_code == 200
    b = r.json()
    assert len(b["rubros"]) == 9
    # CDMX gasta más en todos los rubros que nacional
    for rubro in b["rubros"]:
        assert rubro["mean_cdmx_mensual"] > rubro["mean_nacional_mensual"]
    # Vivienda es el delta más alto (esperable)
    viv = next(x for x in b["rubros"] if x["slug"] == "vivienda")
    assert viv["delta_pct"] > 50


# ---------------------------------------------------------------------
# C6 — bancarizacion
# ---------------------------------------------------------------------


async def test_c6_bancarizacion_cdmx_mayor(client):
    r = await client.get("/api/v1/comparativo/bancarizacion")
    assert r.status_code == 200
    b = r.json()
    # CDMX >> nacional en uso de tarjeta
    assert b["pct_cdmx"] > b["pct_nacional"]
    assert b["ratio_cdmx_sobre_nacional"] > 2.0
    # Definición operativa explícita
    assert "USO EFECTIVO" in b["definicion_operativa"] or "uso efectivo" in b["definicion_operativa"].lower()


# ---------------------------------------------------------------------
# C7 — top-vs-bottom
# ---------------------------------------------------------------------


async def test_c7_top_vs_bottom_estructura(client):
    r = await client.get("/api/v1/comparativo/top-vs-bottom")
    assert r.status_code == 200
    b = r.json()
    for key in ("top_bracket", "bottom_bracket", "narrative", "insights", "caveats"):
        assert key in b
    # CDMX p99 < mean d10 (hogar) — hallazgo narrativo central
    p99 = b["top_bracket"]["cdmx_servidor_percentiles"]["p99"]
    d10_mean = b["top_bracket"]["enigh_d10"]["mean_mensual"]
    assert p99 < d10_mean
    # Pero p99 > lower d10 (entra a d10 como perceptor único)
    assert p99 > b["top_bracket"]["enigh_d10"]["lower_mensual"]


async def test_c7_narrative_framing_sofisticado(client):
    """Verifica que el narrative use framing matizado, no el simple."""
    r = await client.get("/api/v1/comparativo/top-vs-bottom")
    b = r.json()
    narrative = b["narrative"]
    # Keywords del framing sofisticado aprobado
    assert "segmento inferior" in narrative or "composición" in narrative.lower()
    assert "múltiples perceptores" in narrative.lower() or "patrimonio" in narrative.lower()
