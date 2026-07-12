def _create_product(client, admin_headers):
    res = client.post(
        "/admin/products",
        json={"name": "画像テスト商品", "price": 500, "stock": 10},
        headers=admin_headers,
    )
    return res.json()


def test_product_image_crud(client, admin_headers, auth_headers):
    product = _create_product(client, admin_headers)

    create_res = client.post(
        f"/admin/products/{product['id']}/images",
        json={"image_url": "https://example.com/a.png", "display_order": 1},
        headers=admin_headers,
    )
    assert create_res.status_code == 201
    image = create_res.json()

    listed = client.get(f"/products/{product['id']}/images", headers=auth_headers).json()
    assert len(listed) == 1
    assert listed[0]["image_url"] == "https://example.com/a.png"

    update_res = client.patch(
        f"/admin/product-images/{image['id']}",
        json={"image_url": "https://example.com/b.png", "display_order": 2},
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["image_url"] == "https://example.com/b.png"

    delete_res = client.delete(f"/admin/product-images/{image['id']}", headers=admin_headers)
    assert delete_res.status_code == 204

    assert client.get(f"/products/{product['id']}/images", headers=auth_headers).json() == []


def test_list_images_of_missing_product_returns_404(client, auth_headers):
    res = client.get("/products/999999/images", headers=auth_headers)
    assert res.status_code == 404


def test_add_image_to_missing_product_returns_404(client, admin_headers):
    res = client.post(
        "/admin/products/999999/images",
        json={"image_url": "https://example.com/a.png"},
        headers=admin_headers,
    )
    assert res.status_code == 404


def test_update_and_delete_missing_image_returns_404(client, admin_headers):
    assert (
        client.patch(
            "/admin/product-images/999999",
            json={"image_url": "https://example.com/a.png"},
            headers=admin_headers,
        ).status_code
        == 404
    )
    assert client.delete("/admin/product-images/999999", headers=admin_headers).status_code == 404
