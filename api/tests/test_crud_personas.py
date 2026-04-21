async def test_create_persona(client, auth_headers):
    r = await client.post("/api/v1/personas/", json={
        "nombre": "Test", "apellido_1": "Persona", "edad": 30
    }, headers=auth_headers)
    assert r.status_code == 201
    body = r.json()
    assert body["nombre"] == "Test"
    assert body["apellido_1"] == "Persona"
    assert body["edad"] == 30
    assert "id" in body


async def test_create_persona_no_auth(client):
    r = await client.post("/api/v1/personas/", json={
        "nombre": "NoAuth", "apellido_1": "User"
    })
    assert r.status_code == 401


async def test_list_personas(client):
    r = await client.get("/api/v1/personas/")
    assert r.status_code == 200
    body = r.json()
    assert "data" in body
    assert "total" in body
    assert body["page"] == 1


async def test_get_persona_detail(client):
    r = await client.get("/api/v1/personas/1")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == 1
    assert "nombre" in body


async def test_update_persona(client, auth_headers):
    # Create first
    create_r = await client.post("/api/v1/personas/", json={
        "nombre": "Update", "apellido_1": "Me", "edad": 25
    }, headers=auth_headers)
    pid = create_r.json()["id"]

    # Update
    r = await client.put(f"/api/v1/personas/{pid}", json={
        "nombre": "Updated", "edad": 26
    }, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["nombre"] == "Updated"
    assert r.json()["edad"] == 26
    assert r.json()["apellido_1"] == "Me"  # unchanged


async def test_delete_persona_no_nombramientos(client, auth_headers):
    # Create persona with no nombramientos
    create_r = await client.post("/api/v1/personas/", json={
        "nombre": "Delete", "apellido_1": "Me"
    }, headers=auth_headers)
    pid = create_r.json()["id"]

    r = await client.delete(f"/api/v1/personas/{pid}", headers=auth_headers)
    assert r.status_code == 204

    # Verify deleted
    r2 = await client.get(f"/api/v1/personas/{pid}")
    assert r2.status_code == 404


async def test_delete_persona_with_nombramientos(client, auth_headers):
    # Persona 1 should have nombramientos in the existing dataset
    r = await client.delete("/api/v1/personas/1", headers=auth_headers)
    assert r.status_code == 409
