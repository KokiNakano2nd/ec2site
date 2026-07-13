from .conftest import TEST_PASSWORD, create_order_for_user

ADDRESS_PAYLOAD = {
    "name": "山田太郎",
    "postal_code": "100-0001",
    "prefecture": "東京都",
    "city": "千代田区",
    "address_line1": "1-1-1",
}


def _first_product(client, headers):
    return client.get("/products", headers=headers).json()[0]


def test_delete_account_success_anonymizes_user(client, auth_headers):
    res = client.request("DELETE", "/users/me", json={"password": TEST_PASSWORD}, headers=auth_headers)
    assert res.status_code == 204

    # Old token no longer authenticates (user is now inactive).
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 401

    # Original credentials can no longer log in.
    res = client.post("/auth/login", json={"email": "user@example.com", "password": TEST_PASSWORD})
    assert res.status_code == 401


def test_delete_account_wrong_password_returns_403(client, auth_headers):
    res = client.request("DELETE", "/users/me", json={"password": "wrong-password"}, headers=auth_headers)
    assert res.status_code == 403

    # Account is untouched: original credentials still work.
    res = client.post("/auth/login", json={"email": "user@example.com", "password": TEST_PASSWORD})
    assert res.status_code == 200


def test_delete_account_requires_auth(client):
    res = client.request("DELETE", "/users/me", json={"password": TEST_PASSWORD})
    assert res.status_code == 401


def test_delete_account_removes_addresses_and_favorites(client, auth_headers):
    from app import models
    from app.database import SessionLocal

    client.post("/addresses", json=ADDRESS_PAYLOAD, headers=auth_headers)
    product = _first_product(client, auth_headers)
    client.post(f"/favorites/{product['id']}", headers=auth_headers)

    res = client.request("DELETE", "/users/me", json={"password": TEST_PASSWORD}, headers=auth_headers)
    assert res.status_code == 204

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email.like("deleted-user-%")).first()
        assert user is not None
        assert user.is_active is False
        assert user.deleted_at is not None
        assert db.query(models.Address).filter(models.Address.user_id == user.id).count() == 0
        assert db.query(models.Favorite).filter(models.Favorite.user_id == user.id).count() == 0
    finally:
        db.close()


def test_delete_account_preserves_order_history(client, auth_headers, admin_headers):
    product = _first_product(client, auth_headers)
    create_order_for_user(client, auth_headers, product["id"])

    res = client.request("DELETE", "/users/me", json={"password": TEST_PASSWORD}, headers=auth_headers)
    assert res.status_code == 204

    orders = client.get("/admin/orders", headers=admin_headers).json()
    assert len(orders) == 1
    assert orders[0]["user_email"].startswith("deleted-user-")
