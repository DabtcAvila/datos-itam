import pytest


async def test_tipos_contratacion(client):
    r = await client.get("/api/v1/catalogos/tipos-contratacion")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "nombre" in data[0]
    assert "count" in data[0]


async def test_tipos_personal(client):
    r = await client.get("/api/v1/catalogos/tipos-personal")
    assert r.status_code == 200
    assert len(r.json()) > 0


async def test_tipos_nomina(client):
    r = await client.get("/api/v1/catalogos/tipos-nomina")
    assert r.status_code == 200
    assert len(r.json()) > 0


async def test_universos(client):
    r = await client.get("/api/v1/catalogos/universos")
    assert r.status_code == 200
    assert len(r.json()) > 0


async def test_sectores(client):
    r = await client.get("/api/v1/catalogos/sectores")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 70  # ~73 sectores


async def test_sexos(client):
    r = await client.get("/api/v1/catalogos/sexos")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "nombre" in data[0]
    assert "count" in data[0]


async def test_niveles_salariales(client):
    r = await client.get("/api/v1/catalogos/niveles-salariales")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "nombre" in data[0]
    assert "count" in data[0]


async def test_puestos_default(client):
    r = await client.get("/api/v1/catalogos/puestos")
    assert r.status_code == 200
    body = r.json()
    assert "data" in body
    assert "total" in body
    assert body["page"] == 1
    assert body["per_page"] == 50


async def test_puestos_search(client):
    r = await client.get("/api/v1/catalogos/puestos", params={"search": "SECRETARIO"})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] > 0
    for item in body["data"]:
        assert "SECRETARIO" in item["nombre"].upper()


async def test_puestos_pagination(client):
    r = await client.get("/api/v1/catalogos/puestos", params={"page": 2, "per_page": 10})
    assert r.status_code == 200
    body = r.json()
    assert body["page"] == 2
    assert body["per_page"] == 10
    assert len(body["data"]) <= 10
