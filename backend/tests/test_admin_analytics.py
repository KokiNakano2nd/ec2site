from tests.conftest import create_order_for_user


def test_analytics_summary_reflects_orders(client, auth_headers, admin_headers):
    product = client.get("/products", headers=auth_headers).json()[0]
    create_order_for_user(client, auth_headers, product["id"], quantity=1)

    res = client.get("/admin/analytics/summary", headers=admin_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["order_count"] >= 1
    assert body["total_revenue"] > 0
    assert body["product_count"] > 0
    assert body["user_count"] >= 1
    assert body["avg_order"] > 0


def test_analytics_summary_requires_admin(client, auth_headers):
    res = client.get("/admin/analytics/summary", headers=auth_headers)
    assert res.status_code == 403


def test_analytics_sales_by_date(client, auth_headers, admin_headers):
    product = client.get("/products", headers=auth_headers).json()[0]
    create_order_for_user(client, auth_headers, product["id"], quantity=1)

    res = client.get("/admin/analytics/sales-by-date", headers=admin_headers)
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) >= 1
    assert rows[0]["revenue"] > 0
    assert rows[0]["count"] >= 1


def test_analytics_top_products(client, auth_headers, admin_headers):
    product = client.get("/products", headers=auth_headers).json()[0]
    create_order_for_user(client, auth_headers, product["id"], quantity=2)

    res = client.get("/admin/analytics/top-products", headers=admin_headers)
    assert res.status_code == 200
    rows = res.json()
    assert any(r["name"] == product["name"] for r in rows)


def test_analytics_category_sales(client, auth_headers, admin_headers):
    product = client.get("/products", headers=auth_headers).json()[0]
    create_order_for_user(client, auth_headers, product["id"], quantity=1)

    res = client.get("/admin/analytics/category-sales", headers=admin_headers)
    assert res.status_code == 200
    rows = res.json()
    assert sum(r["revenue"] for r in rows) > 0
