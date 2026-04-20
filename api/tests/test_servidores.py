import pytest


async def test_list_default(client):
    r = await client.get("/api/v1/servidores/")
    assert r.status_code == 200
    body = r.json()
    assert body["page"] == 1
    assert body["per_page"] == 50
    assert body["total"] > 200000
    assert len(body["data"]) == 50


async def test_list_pagination(client):
    r = await client.get("/api/v1/servidores/", params={"page": 3, "per_page": 10})
    assert r.status_code == 200
    body = r.json()
    assert body["page"] == 3
    assert len(body["data"]) == 10


async def test_list_filter_sexo(client):
    r = await client.get("/api/v1/servidores/", params={"sexo": "FEMENINO", "per_page": 5})
    assert r.status_code == 200
    body = r.json()
    for item in body["data"]:
        assert item["sexo"] == "FEMENINO"


async def test_list_filter_sector(client):
    r = await client.get("/api/v1/servidores/", params={"sector_id": 1, "per_page": 5})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] > 0


async def test_list_filter_edad(client):
    r = await client.get("/api/v1/servidores/", params={"edad_min": 30, "edad_max": 40, "per_page": 5})
    assert r.status_code == 200
    for item in r.json()["data"]:
        assert 30 <= item["edad"] <= 40


async def test_list_filter_sueldo(client):
    r = await client.get("/api/v1/servidores/", params={"sueldo_min": 50000, "per_page": 5})
    assert r.status_code == 200
    for item in r.json()["data"]:
        assert float(item["sueldo_bruto"]) >= 50000


async def test_list_order_desc(client):
    r = await client.get("/api/v1/servidores/", params={"order_by": "sueldo_bruto", "order": "desc", "per_page": 5})
    assert r.status_code == 200
    data = r.json()["data"]
    salaries = [float(d["sueldo_bruto"]) for d in data if d["sueldo_bruto"]]
    assert salaries == sorted(salaries, reverse=True)


async def test_stats(client):
    r = await client.get("/api/v1/servidores/stats")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] > 200000
    assert body["sueldo_bruto_avg"] > 0
    assert body["sueldo_bruto_median"] > 0
    assert body["count_hombres"] > 0
    assert body["count_mujeres"] > 0
    assert isinstance(body["distribucion_sueldo"], list)


async def test_stats_filtered(client):
    r = await client.get("/api/v1/servidores/stats", params={"sexo": "MASCULINO"})
    assert r.status_code == 200
    body = r.json()
    assert body["count_mujeres"] == 0
    assert body["count_hombres"] == body["total"]


async def test_detail_exists(client):
    r = await client.get("/api/v1/servidores/1")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == 1
    assert "nombre" in body
    assert "sector" in body
    assert "puesto" in body


async def test_detail_not_found(client):
    r = await client.get("/api/v1/servidores/99999999")
    assert r.status_code == 404


async def test_list_invalid_page(client):
    r = await client.get("/api/v1/servidores/", params={"page": 0})
    assert r.status_code == 422
