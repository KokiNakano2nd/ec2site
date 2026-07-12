def test_register_and_login_success(client):
    res = client.post("/auth/register", json={"email": "new@example.com", "password": "password123"})
    assert res.status_code == 201

    res = client.post("/auth/login", json={"email": "new@example.com", "password": "password123"})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_register_duplicate_email_returns_400(client):
    client.post("/auth/register", json={"email": "dup@example.com", "password": "password123"})
    res = client.post("/auth/register", json={"email": "dup@example.com", "password": "password123"})
    assert res.status_code == 400


def test_login_wrong_password_returns_401(client):
    client.post("/auth/register", json={"email": "wrongpw@example.com", "password": "password123"})
    res = client.post("/auth/login", json={"email": "wrongpw@example.com", "password": "incorrect"})
    assert res.status_code == 401


def test_me_requires_valid_token(client):
    res = client.get("/auth/me")
    assert res.status_code == 401

    res = client.get("/auth/me", headers={"Authorization": "Bearer invalid-token"})
    assert res.status_code == 401


def test_me_returns_current_user(client, auth_headers):
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "user@example.com"


def test_non_admin_cannot_access_admin_endpoint(client, auth_headers):
    res = client.get("/admin/orders", headers=auth_headers)
    assert res.status_code == 403


def test_admin_can_access_admin_endpoint(client, admin_headers):
    res = client.get("/admin/orders", headers=admin_headers)
    assert res.status_code == 200
