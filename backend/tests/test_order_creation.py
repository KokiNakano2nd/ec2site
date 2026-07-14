def _first_product(client, headers):
    return client.get("/products", headers=headers).json()[0]


def test_create_order_decrements_stock_and_clears_cart(client, auth_headers):
    product = _first_product(client, auth_headers)
    client.post("/cart", json={"product_id": product["id"], "quantity": 2}, headers=auth_headers)

    res = client.post("/orders", headers=auth_headers)
    assert res.status_code == 201
    order = res.json()
    assert order["status"] == "pending"

    product_after = client.get(f"/products/{product['id']}", headers=auth_headers).json()
    assert product_after["stock"] == product["stock"] - 2

    cart_after = client.get("/cart", headers=auth_headers).json()
    assert cart_after == []


def test_create_order_with_empty_cart_returns_400(client, auth_headers):
    res = client.post("/orders", headers=auth_headers)
    assert res.status_code == 400


def test_create_order_exceeding_stock_returns_400(client, auth_headers):
    product = _first_product(client, auth_headers)
    res = client.post(
        "/cart", json={"product_id": product["id"], "quantity": product["stock"] + 1}, headers=auth_headers
    )
    assert res.status_code == 400


def test_create_order_with_valid_coupon_applies_discount(client, auth_headers, admin_headers):
    coupon_res = client.post(
        "/admin/coupons",
        json={"code": "SAVE10", "discount_type": "percentage", "discount_value": 10, "max_uses": 5},
        headers=admin_headers,
    )
    assert coupon_res.status_code == 201

    product = _first_product(client, auth_headers)
    client.post("/cart", json={"product_id": product["id"], "quantity": 1}, headers=auth_headers)

    res = client.post("/orders", json={"coupon_code": "SAVE10"}, headers=auth_headers)
    assert res.status_code == 201
    order = res.json()
    assert order["discount_amount"] > 0
    assert order["coupon_code"] == "SAVE10"


def test_create_order_with_invalid_coupon_returns_400(client, auth_headers):
    product = _first_product(client, auth_headers)
    client.post("/cart", json={"product_id": product["id"], "quantity": 1}, headers=auth_headers)

    res = client.post("/orders", json={"coupon_code": "NOTREAL"}, headers=auth_headers)
    assert res.status_code == 400


def test_create_order_with_invalid_coupon_leaves_checkout_state_unchanged(client, auth_headers):
    product = _first_product(client, auth_headers)
    add_res = client.post(
        "/cart",
        json={"product_id": product["id"], "quantity": 2},
        headers=auth_headers,
    )
    assert add_res.status_code == 201

    res = client.post("/orders", json={"coupon_code": "NOTREAL"}, headers=auth_headers)
    assert res.status_code == 400

    product_after = client.get(f"/products/{product['id']}", headers=auth_headers).json()
    assert product_after["stock"] == product["stock"]

    cart_after = client.get("/cart", headers=auth_headers).json()
    assert len(cart_after) == 1
    assert cart_after[0]["quantity"] == 2

    orders_after = client.get("/orders", headers=auth_headers).json()
    assert orders_after == []


def test_create_order_with_exhausted_coupon_returns_400(client, auth_headers, other_user_headers, admin_headers):
    client.post(
        "/admin/coupons",
        json={"code": "ONEUSE", "discount_type": "fixed", "discount_value": 100, "max_uses": 1},
        headers=admin_headers,
    )

    product = _first_product(client, auth_headers)
    client.post("/cart", json={"product_id": product["id"], "quantity": 1}, headers=auth_headers)
    first = client.post("/orders", json={"coupon_code": "ONEUSE"}, headers=auth_headers)
    assert first.status_code == 201

    client.post("/cart", json={"product_id": product["id"], "quantity": 1}, headers=other_user_headers)
    second = client.post("/orders", json={"coupon_code": "ONEUSE"}, headers=other_user_headers)
    assert second.status_code == 400

    coupons = client.get("/admin/coupons", headers=admin_headers).json()
    coupon = next(coupon for coupon in coupons if coupon["code"] == "ONEUSE")
    assert coupon["used_count"] == 1


def test_list_orders_returns_only_own_orders(client, auth_headers, other_user_headers):
    product = _first_product(client, auth_headers)
    client.post("/cart", json={"product_id": product["id"], "quantity": 1}, headers=auth_headers)
    client.post("/orders", headers=auth_headers)

    res = client.get("/orders", headers=other_user_headers)
    assert res.status_code == 200
    assert res.json() == []

    res = client.get("/orders", headers=auth_headers)
    assert len(res.json()) == 1


def test_get_order_not_found_returns_404(client, auth_headers):
    res = client.get("/orders/9999", headers=auth_headers)
    assert res.status_code == 404
