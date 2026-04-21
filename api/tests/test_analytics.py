async def test_puestos_ranking_ok(client):
    r = await client.get("/api/v1/analytics/puestos/ranking?limit=5")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert len(body) == 5
    first = body[0]
    assert first["rank"] == 1
    assert 0.0 <= first["percent_rank"] <= 1.0
    assert first["gap_vs_next"] is None  # LAG returns NULL for first row
    assert first["count"] >= 5


async def test_puestos_ranking_default_limit(client):
    r = await client.get("/api/v1/analytics/puestos/ranking")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 20


async def test_puestos_ranking_ordered_desc(client):
    r = await client.get("/api/v1/analytics/puestos/ranking?limit=10")
    body = r.json()
    avgs = [p["avg_sueldo"] for p in body]
    assert avgs == sorted(avgs, reverse=True)
    ranks = [p["rank"] for p in body]
    assert ranks == sorted(ranks)


async def test_sectores_ranking_shape(client):
    r = await client.get("/api/v1/analytics/sectores/ranking")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert len(body) >= 50
    for row in body:
        assert "rank" in row
        assert "avg_vs_global_pct" in row
    assert body[0]["rank"] == 1
    signs = [row["avg_vs_global_pct"] for row in body]
    assert max(signs) > 0 and min(signs) < 0


async def test_brecha_edad_buckets(client):
    r = await client.get("/api/v1/analytics/brecha-edad")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 5
    labels = [row["bucket_edad"] for row in body]
    assert labels == ["18-25", "26-35", "36-45", "46-55", "56+"]
    for row in body:
        if row["gap_pct"] is not None:
            assert row["avg_male"] is not None
            assert row["avg_female"] is not None
        assert row["running_avg_global"] > 0


async def test_analytics_cache_header(client):
    r = await client.get("/api/v1/analytics/puestos/ranking?limit=3")
    assert r.headers.get("cache-control") == "public, max-age=900"
