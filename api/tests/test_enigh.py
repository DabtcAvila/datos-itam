"""Tests para /api/v1/enigh/* — 10 endpoints (Grupos D + A + B).

Validación de:
- Status codes (200 success, 404 entidad inválida, 422 params inválidos)
- Shape del response (campos esperados presentes)
- Valores razonables contra bounds INEGI oficial (Comunicado 112/25)

Ejecutar contra Neon-pooler para validar byte-exact con producción:
    $ cp .env.neon .env
    $ TESTING=1 uv run pytest tests/test_enigh.py -v
    $ git checkout .env
"""
import pytest


# ---------------------------------------------------------------------
# Grupo D — utilidad
# ---------------------------------------------------------------------


async def test_metadata_shape(client):
    r = await client.get("/api/v1/enigh/metadata")
    assert r.status_code == 200
    b = r.json()
    for key in ("edition", "periodicity", "reference_date", "schema_version",
                "total_hogares_muestra", "total_hogares_expandido",
                "total_tablas_ingestadas", "total_catalogos", "sources",
                "methodology_notes"):
        assert key in b
    assert b["total_hogares_muestra"] == 91414
    assert b["total_hogares_expandido"] == 38830230
    assert b["total_tablas_ingestadas"] == 17
    assert b["total_catalogos"] == 111
    assert len(b["sources"]) >= 2
    assert len(b["methodology_notes"]) >= 3


async def test_validaciones_bounds_passing(client):
    r = await client.get("/api/v1/enigh/validaciones")
    assert r.status_code == 200
    b = r.json()
    assert b["count"] == 13
    assert b["passing"] == 13
    assert b["failing"] == 0
    # bound key ingreso_total debe existir con valor ~77864
    total = next(x for x in b["bounds"] if x["id"] == "ingreso_total")
    assert abs(total["calculado"] - 77864) / 77864 < 0.01
    # transf_gas es el bound con mayor delta (~0.08%), aún pasa ±0.5%
    tg = next(x for x in b["bounds"] if x["id"] == "gasto_transferencias_gasto")
    assert tg["passing"] is True
    assert abs(tg["delta_pct"]) < 0.5


# ---------------------------------------------------------------------
# Grupo A — descriptivos
# ---------------------------------------------------------------------


async def test_hogares_summary_values(client):
    r = await client.get("/api/v1/enigh/hogares/summary")
    assert r.status_code == 200
    b = r.json()
    # Validación al peso vs INEGI oficial 77,864 ±1%
    assert abs(b["mean_ing_cor_trim"] - 77864) / 77864 < 0.01
    # Mensual = trim / 3
    assert abs(b["mean_ing_cor_mensual"] - b["mean_ing_cor_trim"] / 3) < 0.5
    # gasto_mon mensual ≈ 15,891 (oficial) ±1%
    assert abs(b["mean_gasto_mon_mensual"] - 15891) / 15891 < 0.01
    assert b["n_hogares_muestra"] == 91414


async def test_hogares_by_decil_shape(client):
    r = await client.get("/api/v1/enigh/hogares/by-decil")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 10
    # deciles 1..10 en orden
    assert [x["decil"] for x in rows] == list(range(1, 11))
    # monotónico ascendente en ing_cor
    for i in range(9):
        assert rows[i]["mean_ing_cor_trim"] < rows[i + 1]["mean_ing_cor_trim"]
    # bounds d1 y d10 vs oficial
    assert abs(rows[0]["mean_ing_cor_trim"] - 16795) / 16795 < 0.02
    assert abs(rows[9]["mean_ing_cor_trim"] - 236095) / 236095 < 0.03
    # share_factor ≈ 10% cada uno
    for x in rows:
        assert 9.8 <= x["share_factor_pct"] <= 10.2


async def test_hogares_by_entidad_cdmx(client):
    r = await client.get("/api/v1/enigh/hogares/by-entidad?entidad=09")
    assert r.status_code == 200
    b = r.json()
    assert len(b) == 1
    assert b[0]["clave"] == "09"
    assert b[0]["nombre"] == "Ciudad de México"
    # CDMX hogar mean mensual ≈ 36,895 (±1%)
    assert abs(b[0]["mean_ing_cor_mensual"] - 36895) / 36895 < 0.01


async def test_hogares_by_entidad_sin_filtro_devuelve_32(client):
    r = await client.get("/api/v1/enigh/hogares/by-entidad")
    assert r.status_code == 200
    b = r.json()
    assert len(b) == 32
    # ordenado DESC por ing_cor
    for i in range(31):
        assert b[i]["mean_ing_cor_trim"] >= b[i + 1]["mean_ing_cor_trim"]


async def test_hogares_by_entidad_invalida_404(client):
    r = await client.get("/api/v1/enigh/hogares/by-entidad?entidad=99")
    assert r.status_code == 404


async def test_hogares_by_entidad_params_invalidos_422(client):
    # pattern r"^\d{2}$" — "abc" falla validación → 422
    r = await client.get("/api/v1/enigh/hogares/by-entidad?entidad=abc")
    assert r.status_code == 422


async def test_poblacion_demographics_values(client):
    r = await client.get("/api/v1/enigh/poblacion/demographics")
    assert r.status_code == 200
    b = r.json()
    # Suma hombres + mujeres ≈ expandido
    total_sexo = sum(s["n_expandido"] for s in b["sexo"])
    assert total_sexo == b["n_personas_expandido"]
    # 5 buckets etarios
    assert len(b["edad"]) == 5
    buckets = {x["bucket"] for x in b["edad"]}
    assert buckets == {"0-14", "15-29", "30-44", "45-64", "65+"}
    # Suma pct ≈ 100
    assert abs(sum(x["pct"] for x in b["edad"]) - 100) < 0.5
    # Expandido total ≈ 130M
    assert b["n_personas_expandido"] > 120_000_000


async def test_gastos_by_rubro_estructura(client):
    r = await client.get("/api/v1/enigh/gastos/by-rubro")
    assert r.status_code == 200
    b = r.json()
    assert len(b["rubros"]) == 9
    # Suma pct_del_monetario ≈ 100 (± tolerancia por redondeo)
    suma = sum(x["pct_del_monetario"] for x in b["rubros"])
    assert abs(suma - 100) < 0.5
    # Alimentos es el más grande (>30%)
    alim = next(x for x in b["rubros"] if x["slug"] == "alimentos")
    assert alim["pct_del_monetario"] > 30
    # oficial_mensual populated solo cuando decil is None (total nacional)
    for x in b["rubros"]:
        assert x["oficial_mensual"] is not None


async def test_gastos_by_rubro_decil10_sin_oficial(client):
    r = await client.get("/api/v1/enigh/gastos/by-rubro?decil=10")
    assert r.status_code == 200
    b = r.json()
    # d10 gasto_mon_trim ≈ 117,986 (verificado)
    assert abs(b["mean_gasto_mon_trim"] - 117986) / 117986 < 0.01
    # oficial_mensual None porque es decil específico
    for x in b["rubros"]:
        assert x["oficial_mensual"] is None


async def test_gastos_by_rubro_decil_invalido_422(client):
    r = await client.get("/api/v1/enigh/gastos/by-rubro?decil=11")
    assert r.status_code == 422
    r = await client.get("/api/v1/enigh/gastos/by-rubro?decil=0")
    assert r.status_code == 422


# ---------------------------------------------------------------------
# Grupo B — actividad económica
# ---------------------------------------------------------------------


async def test_actividad_agro_cobertura(client):
    r = await client.get("/api/v1/enigh/actividad/agro")
    assert r.status_code == 200
    b = r.json()
    # Cobertura DISTINCT hogares — documentada en memory S6
    assert b["n_hogares_muestra"] == 11853
    assert b["n_hogares_expandido"] == 3742158
    # ~9.64% ± 0.5pp
    assert 9.1 <= b["pct_del_universo"] <= 10.2
    # 10 deciles en distribución
    assert len(b["por_decil"]) == 10
    # Suma pct_share_actividad ≈ 100
    assert abs(sum(x["pct_share_actividad"] for x in b["por_decil"]) - 100) < 0.5
    # d1 es el más alto (regresivo)
    assert b["por_decil"][0]["pct_share_actividad"] > b["por_decil"][9]["pct_share_actividad"]
    # Top entidades: Chiapas primero (memory S6)
    top_claves = [x["clave"] for x in b["top_entidades"]]
    assert "07" in top_claves  # Chiapas


async def test_actividad_noagro_distribucion_uniforme(client):
    r = await client.get("/api/v1/enigh/actividad/noagro")
    assert r.status_code == 200
    b = r.json()
    assert b["n_hogares_muestra"] == 20134
    assert b["n_hogares_expandido"] == 8842438
    # Noagro es uniforme por decil (banda 8.4-10.5%)
    pcts = [x["pct_share_actividad"] for x in b["por_decil"]]
    assert min(pcts) > 8.0 and max(pcts) < 11.0
    # Top Edo.Mex primero (memory S6)
    top_claves = [x["clave"] for x in b["top_entidades"]]
    assert "15" in top_claves  # México


async def test_actividad_jcf_small_dataset(client):
    r = await client.get("/api/v1/enigh/actividad/jcf")
    assert r.status_code == 200
    b = r.json()
    # JCF n=327 en muestra (memory S4)
    assert b["n_beneficiarios_muestra"] == 327
    # Mean ingreso_tri positivo
    assert b["mean_ingreso_trim_por_beneficiario"] > 0
    # Al menos 20 entidades (cobertura amplia)
    assert len(b["por_entidad"]) >= 20
