async def test_list_sectores(client):
    r = await client.get("/api/v1/sectores/")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 70


async def test_sector_stats(client):
    r = await client.get("/api/v1/sectores/1/stats")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == 1
    assert body["total_servidores"] > 0
    assert body["sueldo_bruto_avg"] > 0
    assert isinstance(body["top_puestos"], list)


async def test_sector_not_found(client):
    r = await client.get("/api/v1/sectores/99999/stats")
    assert r.status_code == 404


async def test_compare(client):
    r = await client.get("/api/v1/sectores/compare", params={"a": 1, "b": 2})
    assert r.status_code == 200
    body = r.json()
    assert "sector_a" in body
    assert "sector_b" in body
    assert body["sector_a"]["id"] == 1
    assert body["sector_b"]["id"] == 2


async def test_compare_missing_param(client):
    r = await client.get("/api/v1/sectores/compare", params={"a": 1})
    assert r.status_code == 422
