async def test_create_catalog_nombre(client, auth_headers):
    """Create a new item in a nombre-type catalog (puestos)."""
    r = await client.post("/api/v1/catalogos/puestos", json={
        "nombre": "PUESTO DE PRUEBA UNIQUE"
    }, headers=auth_headers)
    assert r.status_code == 201
    body = r.json()
    assert body["nombre"] == "PUESTO DE PRUEBA UNIQUE"
    assert "id" in body


async def test_create_catalog_clave(client, auth_headers):
    """Create a new item in a clave-type catalog (tipos-nomina)."""
    r = await client.post("/api/v1/catalogos/tipos-nomina", json={
        "clave": 99999
    }, headers=auth_headers)
    assert r.status_code == 201
    assert r.json()["clave"] == 99999


async def test_create_catalog_clave_nombre(client, auth_headers):
    """Create a new item in a clave+nombre catalog (sectores)."""
    r = await client.post("/api/v1/catalogos/sectores", json={
        "clave": "ZTEST", "nombre": "Sector de Prueba"
    }, headers=auth_headers)
    assert r.status_code == 201
    assert r.json()["clave"] == "ZTEST"
    assert r.json()["nombre"] == "Sector de Prueba"


async def test_update_catalog_item(client, auth_headers):
    """Update a catalog item."""
    # Create
    cr = await client.post("/api/v1/catalogos/puestos", json={
        "nombre": "PUESTO ANTES UPDATE"
    }, headers=auth_headers)
    item_id = cr.json()["id"]

    # Update
    r = await client.put(f"/api/v1/catalogos/puestos/{item_id}", json={
        "nombre": "PUESTO DESPUES UPDATE"
    }, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["nombre"] == "PUESTO DESPUES UPDATE"


async def test_delete_catalog_no_references(client, auth_headers):
    """Delete a catalog item with no references."""
    cr = await client.post("/api/v1/catalogos/puestos", json={
        "nombre": "PUESTO PARA BORRAR"
    }, headers=auth_headers)
    item_id = cr.json()["id"]

    r = await client.delete(f"/api/v1/catalogos/puestos/{item_id}", headers=auth_headers)
    assert r.status_code == 204


async def test_delete_catalog_with_references(client, auth_headers):
    """Cannot delete a catalog item that has referencing records."""
    # Sector id=1 should have many nombramientos
    r = await client.delete("/api/v1/catalogos/sectores/1", headers=auth_headers)
    assert r.status_code == 409


async def test_create_catalog_no_auth(client):
    r = await client.post("/api/v1/catalogos/puestos", json={"nombre": "NO AUTH"})
    assert r.status_code == 401
