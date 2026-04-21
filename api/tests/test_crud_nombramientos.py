async def test_create_nombramiento(client, auth_headers):
    # Create a persona first
    pr = await client.post("/api/v1/personas/", json={
        "nombre": "Nomb", "apellido_1": "Test"
    }, headers=auth_headers)
    persona_id = pr.json()["id"]

    r = await client.post("/api/v1/nombramientos/", json={
        "persona_id": persona_id,
        "sueldo_bruto": "15000.50",
        "sueldo_neto": "12000.00",
    }, headers=auth_headers)
    assert r.status_code == 201
    body = r.json()
    assert body["persona_id"] == persona_id
    assert float(body["sueldo_bruto"]) == 15000.50


async def test_create_nombramiento_invalid_persona(client, auth_headers):
    r = await client.post("/api/v1/nombramientos/", json={
        "persona_id": 99999999,
    }, headers=auth_headers)
    assert r.status_code == 422


async def test_list_nombramientos(client):
    r = await client.get("/api/v1/nombramientos/")
    assert r.status_code == 200
    body = r.json()
    assert "data" in body
    assert body["total"] > 0


async def test_get_nombramiento_detail(client):
    r = await client.get("/api/v1/nombramientos/1")
    assert r.status_code == 200
    assert r.json()["id"] == 1


async def test_update_nombramiento(client, auth_headers):
    # Create persona + nombramiento
    pr = await client.post("/api/v1/personas/", json={
        "nombre": "UpdNomb", "apellido_1": "Test"
    }, headers=auth_headers)
    persona_id = pr.json()["id"]

    nr = await client.post("/api/v1/nombramientos/", json={
        "persona_id": persona_id, "sueldo_bruto": "10000"
    }, headers=auth_headers)
    nid = nr.json()["id"]

    r = await client.put(f"/api/v1/nombramientos/{nid}", json={
        "sueldo_bruto": "20000"
    }, headers=auth_headers)
    assert r.status_code == 200
    assert float(r.json()["sueldo_bruto"]) == 20000


async def test_delete_nombramiento(client, auth_headers):
    # Create persona + nombramiento
    pr = await client.post("/api/v1/personas/", json={
        "nombre": "DelNomb", "apellido_1": "Test"
    }, headers=auth_headers)
    persona_id = pr.json()["id"]

    nr = await client.post("/api/v1/nombramientos/", json={
        "persona_id": persona_id
    }, headers=auth_headers)
    nid = nr.json()["id"]

    r = await client.delete(f"/api/v1/nombramientos/{nid}", headers=auth_headers)
    assert r.status_code == 204
