async def test_csv_basic(client):
    r = await client.get("/api/v1/export/csv", params={"per_page": 10})
    assert r.status_code == 200
    assert r.headers["content-type"] == "text/csv; charset=utf-8"
    assert "content-disposition" in r.headers
    assert "remuneraciones_cdmx.csv" in r.headers["content-disposition"]
    lines = r.text.strip().split("\n")
    assert len(lines) > 1  # header + at least 1 row
    header = lines[0]
    assert "id" in header
    assert "sueldo_bruto" in header


async def test_csv_filtered(client):
    r = await client.get("/api/v1/export/csv", params={"sexo": "FEMENINO"})
    assert r.status_code == 200
    lines = r.text.strip().split("\n")
    # Should have header + rows
    assert len(lines) > 1


async def test_csv_content_disposition(client):
    r = await client.get("/api/v1/export/csv")
    assert r.status_code == 200
    assert r.headers["content-disposition"] == "attachment; filename=remuneraciones_cdmx.csv"
