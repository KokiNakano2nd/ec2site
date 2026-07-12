ADDRESS_PAYLOAD = {
    "name": "山田太郎",
    "postal_code": "100-0001",
    "prefecture": "東京都",
    "city": "千代田区",
    "address_line1": "1-1-1",
}


def test_admin_product_crud(client, admin_headers):
    create_res = client.post(
        "/admin/products",
        json={"name": "テスト商品", "price": 1000, "stock": 5},
        headers=admin_headers,
    )
    assert create_res.status_code == 201
    product = create_res.json()

    update_res = client.patch(
        f"/admin/products/{product['id']}", json={"price": 2000}, headers=admin_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["price"] == 2000

    delete_res = client.delete(f"/admin/products/{product['id']}", headers=admin_headers)
    assert delete_res.status_code == 204

    assert client.get(f"/products/{product['id']}").status_code == 404


def test_admin_product_update_and_delete_missing_returns_404(client, admin_headers):
    assert client.patch("/admin/products/999999", json={"price": 1}, headers=admin_headers).status_code == 404
    assert client.delete("/admin/products/999999", headers=admin_headers).status_code == 404


def test_non_admin_cannot_manage_products(client, auth_headers):
    res = client.post("/admin/products", json={"name": "不正商品", "price": 1, "stock": 1}, headers=auth_headers)
    assert res.status_code == 403


def test_admin_coupon_crud(client, admin_headers):
    create_res = client.post(
        "/admin/coupons",
        json={"code": "TESTCOUPON", "discount_type": "fixed", "discount_value": 500},
        headers=admin_headers,
    )
    assert create_res.status_code == 201
    coupon = create_res.json()

    update_res = client.patch(
        f"/admin/coupons/{coupon['id']}", json={"is_active": False}, headers=admin_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["is_active"] is False

    delete_res = client.delete(f"/admin/coupons/{coupon['id']}", headers=admin_headers)
    assert delete_res.status_code == 204


def test_admin_coupon_invalid_discount_type_returns_400(client, admin_headers):
    res = client.post(
        "/admin/coupons",
        json={"code": "BADTYPE", "discount_type": "invalid", "discount_value": 1},
        headers=admin_headers,
    )
    assert res.status_code == 400


def test_admin_coupon_duplicate_code_returns_400(client, admin_headers):
    client.post(
        "/admin/coupons",
        json={"code": "DUPCODE", "discount_type": "fixed", "discount_value": 100},
        headers=admin_headers,
    )
    res = client.post(
        "/admin/coupons",
        json={"code": "DUPCODE", "discount_type": "fixed", "discount_value": 100},
        headers=admin_headers,
    )
    assert res.status_code == 400


def test_admin_update_order_status_and_list(client, auth_headers, admin_headers):
    product = client.get("/products", headers=auth_headers).json()[0]
    client.post("/cart", json={"product_id": product["id"], "quantity": 1}, headers=auth_headers)
    order = client.post("/orders", headers=auth_headers).json()

    res = client.patch(
        f"/admin/orders/{order['id']}/status", json={"status": "processing"}, headers=admin_headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "processing"

    listed = client.get("/admin/orders", headers=admin_headers).json()
    assert len(listed) == 1


def test_admin_update_order_status_missing_order_returns_404(client, admin_headers):
    res = client.patch("/admin/orders/999999/status", json={"status": "processing"}, headers=admin_headers)
    assert res.status_code == 404


def test_address_crud_and_default(client, auth_headers):
    create_res = client.post("/addresses", json=ADDRESS_PAYLOAD, headers=auth_headers)
    assert create_res.status_code == 201
    address = create_res.json()
    assert address["is_default"] is False

    second = client.post(
        "/addresses", json={**ADDRESS_PAYLOAD, "name": "鈴木花子", "is_default": True}, headers=auth_headers
    ).json()

    listed = client.get("/addresses", headers=auth_headers).json()
    assert len(listed) == 2

    set_default_res = client.post(f"/addresses/{address['id']}/default", headers=auth_headers)
    assert set_default_res.status_code == 200
    assert set_default_res.json()["is_default"] is True

    update_res = client.patch(f"/addresses/{second['id']}", json={"city": "港区"}, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["city"] == "港区"

    delete_res = client.delete(f"/addresses/{second['id']}", headers=auth_headers)
    assert delete_res.status_code == 204


def test_address_update_delete_default_missing_returns_404(client, auth_headers):
    assert client.patch("/addresses/999999", json={"city": "x"}, headers=auth_headers).status_code == 404
    assert client.delete("/addresses/999999", headers=auth_headers).status_code == 404
    assert client.post("/addresses/999999/default", headers=auth_headers).status_code == 404
