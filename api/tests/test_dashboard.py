async def test_dashboard_stats_shape(client):
    r = await client.get("/api/v1/dashboard/stats")
    assert r.status_code == 200
    body = r.json()
    required_keys = [
        "totalServidores", "totalSectors", "avgSalary", "medianSalary",
        "minSalary", "maxSalary", "p25", "p50", "p75", "p90",
        "genderGapPercent", "hombres", "mujeres", "avgSalaryMale", "avgSalaryFemale",
        "salaryDistribution", "ageDistribution", "contractTypes", "personalTypes",
        "salaryByAge", "top15Sectors", "allSectors", "genderGapBySector",
        "topPositions", "seniorityDistribution", "salaryBySeniority",
        "avgSeniority", "avgNetSalary", "avgDeduction", "avgDeductionPercent",
        "brutoNetoByRange",
    ]
    for key in required_keys:
        assert key in body, f"Missing key: {key}"


async def test_dashboard_stats_types(client):
    r = await client.get("/api/v1/dashboard/stats")
    body = r.json()
    assert isinstance(body["totalServidores"], int)
    assert body["totalServidores"] > 200000
    assert isinstance(body["avgSalary"], float)
    assert body["avgSalary"] > 0
    assert isinstance(body["salaryDistribution"], list)
    assert len(body["salaryDistribution"]) == 5
    for item in body["salaryDistribution"]:
        assert "label" in item
        assert "count" in item


async def test_dashboard_stats_consistency(client):
    r = await client.get("/api/v1/dashboard/stats")
    body = r.json()
    assert body["hombres"] + body["mujeres"] <= body["totalServidores"]
    assert body["minSalary"] <= body["p25"] <= body["medianSalary"] <= body["p75"] <= body["maxSalary"]
    assert len(body["top15Sectors"]) == 15
    assert len(body["allSectors"]) >= 70
    assert len(body["genderGapBySector"]) <= 10
