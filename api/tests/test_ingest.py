import io


async def test_ingest_csv_valid(client, auth_headers):
    csv_content = (
        "nombre,apellido_1,apellido_2,sexo,edad,n_puesto,tipo_contratacion,"
        "tipo_personal,fecha_ingreso,n_cabeza_sector,sueldo_tabular_bruto,sueldo_tabular_neto\n"
        "JUAN,PEREZ,LOPEZ,MASCULINO,35,ANALISTA,BASE,OPERATIVO,2020-01-15,01 - GOBIERNO,15000.00,12000.00\n"
        "MARIA,GARCIA,,FEMENINO,28,SECRETARIA,EVENTUAL,OPERATIVO,2021-06-01,02 - SALUD,10000.00,8000.00\n"
    )
    files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}
    r = await client.post("/api/v1/ingest/csv", files=files, headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["inserted"] == 2
    assert body["errors"] == 0
    assert body["duration_seconds"] >= 0


async def test_ingest_csv_with_errors(client, auth_headers):
    csv_content = (
        "nombre,apellido_1,apellido_2,sexo,edad,n_puesto,tipo_contratacion,"
        "tipo_personal,fecha_ingreso,n_cabeza_sector,sueldo_tabular_bruto,sueldo_tabular_neto\n"
        ",,,MASCULINO,35,ANALISTA,BASE,OPERATIVO,2020-01-15,01 - GOB,15000.00,12000.00\n"
        "PEDRO,SANCHEZ,,FEMENINO,40,DIRECTOR,BASE,MANDO,2019-03-10,01 - GOB,25000.00,20000.00\n"
    )
    files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}
    r = await client.post("/api/v1/ingest/csv", files=files, headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["errors"] == 1  # first row missing nombre/apellido_1
    assert body["inserted"] == 1


async def test_ingest_csv_no_auth(client):
    csv_content = "nombre,apellido_1\nTEST,TEST\n"
    files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}
    r = await client.post("/api/v1/ingest/csv", files=files)
    assert r.status_code == 401
