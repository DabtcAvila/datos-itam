import uuid


def _uid():
    return uuid.uuid4().hex[:8].upper()


async def test_create_catalog_nombre(client, auth_headers):
    """Create a new item in a nombre-type catalog (puestos)."""
    name = f"PUESTO_TEST_{_uid()}"
    r = await client.post("/api/v1/catalogos/puestos", json={
        "nombre": name
    }, headers=auth_headers)
    assert r.status_code == 201
    body = r.json()
    assert body["nombre"] == name
    assert "id" in body


async def test_create_catalog_clave(client, auth_headers):
    """Create a new item in a clave-type catalog (tipos-nomina)."""
    import random
    clave = random.randint(100000, 999999)
    r = await client.post("/api/v1/catalogos/tipos-nomina", json={
        "clave": clave
    }, headers=auth_headers)
    assert r.status_code == 201
    assert r.json()["clave"] == clave


async def test_create_catalog_clave_nombre(client, auth_headers):
    """Create a new item in a clave+nombre catalog (sectores)."""
    uid = _uid()
    r = await client.post("/api/v1/catalogos/sectores", json={
        "clave": f"ZT{uid}", "nombre": f"Sector Test {uid}"
    }, headers=auth_headers)
    assert r.status_code == 201
    assert r.json()["clave"] == f"ZT{uid}"


async def test_update_catalog_item(client, auth_headers):
    """Update a catalog item."""
    uid = _uid()
    cr = await client.post("/api/v1/catalogos/puestos", json={
        "nombre": f"PUESTO_ANTES_{uid}"
    }, headers=auth_headers)
    item_id = cr.json()["id"]

    r = await client.put(f"/api/v1/catalogos/puestos/{item_id}", json={
        "nombre": f"PUESTO_DESPUES_{uid}"
    }, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["nombre"] == f"PUESTO_DESPUES_{uid}"


async def test_delete_catalog_no_references(client, auth_headers):
    """Delete a catalog item with no references."""
    uid = _uid()
    cr = await client.post("/api/v1/catalogos/puestos", json={
        "nombre": f"PUESTO_BORRAR_{uid}"
    }, headers=auth_headers)
    item_id = cr.json()["id"]

    r = await client.delete(f"/api/v1/catalogos/puestos/{item_id}", headers=auth_headers)
    assert r.status_code == 204


async def test_delete_catalog_with_references(client, auth_headers):
    """Cannot delete a catalog item that has referencing records."""
    r = await client.delete("/api/v1/catalogos/sectores/1", headers=auth_headers)
    assert r.status_code == 409


async def test_create_catalog_no_auth(client):
    r = await client.post("/api/v1/catalogos/puestos", json={"nombre": "NO AUTH"})
    assert r.status_code == 401
