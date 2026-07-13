def _first_product(client, headers):
    return client.get("/products", headers=headers).json()[0]


def test_cart_add_update_delete_flow(client, auth_headers):
    product = _first_product(client, auth_headers)

    add_res = client.post("/cart", json={"product_id": product["id"], "quantity": 1}, headers=auth_headers)
    assert add_res.status_code == 201
    cart_item = add_res.json()

    add_again = client.post("/cart", json={"product_id": product["id"], "quantity": 1}, headers=auth_headers)
    assert add_again.json()["quantity"] == 2

    update_res = client.patch(f"/cart/{cart_item['id']}", json={"quantity": 3}, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["quantity"] == 3

    bad_update = client.patch(f"/cart/{cart_item['id']}", json={"quantity": 0}, headers=auth_headers)
    assert bad_update.status_code == 400

    over_stock = client.patch(f"/cart/{cart_item['id']}", json={"quantity": product["stock"] + 1}, headers=auth_headers)
    assert over_stock.status_code == 400

    delete_res = client.delete(f"/cart/{cart_item['id']}", headers=auth_headers)
    assert delete_res.status_code == 204

    assert client.get("/cart", headers=auth_headers).json() == []


def test_cart_add_exceeding_stock_returns_400(client, auth_headers):
    product = _first_product(client, auth_headers)
    res = client.post(
        "/cart", json={"product_id": product["id"], "quantity": product["stock"] + 1}, headers=auth_headers
    )
    assert res.status_code == 400


def test_cart_add_unknown_product_returns_404(client, auth_headers):
    res = client.post("/cart", json={"product_id": 999999, "quantity": 1}, headers=auth_headers)
    assert res.status_code == 404


def test_cart_update_and_delete_missing_item_returns_404(client, auth_headers):
    assert client.patch("/cart/999999", json={"quantity": 1}, headers=auth_headers).status_code == 404
    assert client.delete("/cart/999999", headers=auth_headers).status_code == 404


def test_favorite_add_list_remove(client, auth_headers):
    product = _first_product(client, auth_headers)

    add_res = client.post(f"/favorites/{product['id']}", headers=auth_headers)
    assert add_res.status_code == 201

    add_again = client.post(f"/favorites/{product['id']}", headers=auth_headers)
    assert add_again.status_code == 201

    listed = client.get("/favorites", headers=auth_headers).json()
    assert len(listed) == 1

    del_res = client.delete(f"/favorites/{product['id']}", headers=auth_headers)
    assert del_res.status_code == 204
    assert client.get("/favorites", headers=auth_headers).json() == []


def test_favorite_unknown_product_returns_404(client, auth_headers):
    res = client.post("/favorites/999999", headers=auth_headers)
    assert res.status_code == 404


def test_review_create_and_list(client, auth_headers):
    product = _first_product(client, auth_headers)

    res = client.post(
        f"/products/{product['id']}/reviews", json={"rating": 5, "comment": "最高でした"}, headers=auth_headers
    )
    assert res.status_code == 201
    assert res.json()["user_email"] == "user@example.com"

    listed = client.get(f"/products/{product['id']}/reviews").json()
    assert len(listed) == 1


def test_review_duplicate_by_same_user_returns_400(client, auth_headers):
    product = _first_product(client, auth_headers)
    client.post(f"/products/{product['id']}/reviews", json={"rating": 4}, headers=auth_headers)
    res = client.post(f"/products/{product['id']}/reviews", json={"rating": 3}, headers=auth_headers)
    assert res.status_code == 400


def test_review_invalid_rating_returns_400(client, auth_headers):
    product = _first_product(client, auth_headers)
    res = client.post(f"/products/{product['id']}/reviews", json={"rating": 6}, headers=auth_headers)
    assert res.status_code == 400


def test_review_unknown_product_returns_404(client, auth_headers):
    res = client.post("/products/999999/reviews", json={"rating": 5}, headers=auth_headers)
    assert res.status_code == 404
