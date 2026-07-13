import bcrypt
from argon2 import PasswordHasher
from sqlalchemy import select

from app import auth, models
from app.database import SessionLocal


def test_register_and_login_success(client):
    res = client.post("/auth/register", json={"email": "new@example.com", "password": "password123"})
    assert res.status_code == 201

    with SessionLocal() as db:
        user = db.execute(select(models.User).where(models.User.email == "new@example.com")).scalar_one()
        assert user.hashed_password.startswith("$argon2id$")

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


def test_login_with_legacy_bcrypt_hash_migrates_to_argon2id(client):
    password = "legacy-password123"
    client.post("/auth/register", json={"email": "legacy@example.com", "password": password})

    legacy_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    with SessionLocal() as db:
        user = db.execute(select(models.User).where(models.User.email == "legacy@example.com")).scalar_one()
        user.hashed_password = legacy_hash
        db.commit()

    res = client.post("/auth/login", json={"email": "legacy@example.com", "password": password})
    assert res.status_code == 200

    with SessionLocal() as db:
        user = db.execute(select(models.User).where(models.User.email == "legacy@example.com")).scalar_one()
        assert user.hashed_password.startswith("$argon2id$")
        assert user.hashed_password != legacy_hash
        assert auth.verify_password(password, user.hashed_password)


def test_wrong_password_does_not_migrate_legacy_bcrypt_hash(client):
    password = "legacy-password123"
    client.post("/auth/register", json={"email": "legacy-wrong@example.com", "password": password})

    legacy_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    with SessionLocal() as db:
        user = db.execute(select(models.User).where(models.User.email == "legacy-wrong@example.com")).scalar_one()
        user.hashed_password = legacy_hash
        db.commit()

    res = client.post("/auth/login", json={"email": "legacy-wrong@example.com", "password": "x" * 73})
    assert res.status_code == 401

    with SessionLocal() as db:
        user = db.execute(select(models.User).where(models.User.email == "legacy-wrong@example.com")).scalar_one()
        assert user.hashed_password == legacy_hash


def test_login_rehashes_argon2id_hash_with_outdated_parameters(client):
    password = "outdated-argon2-password"
    client.post("/auth/register", json={"email": "argon2-rehash@example.com", "password": password})

    outdated_hash = PasswordHasher(time_cost=1, memory_cost=8192, parallelism=1).hash(password)
    assert auth.password_needs_rehash(outdated_hash)

    with SessionLocal() as db:
        user = db.execute(select(models.User).where(models.User.email == "argon2-rehash@example.com")).scalar_one()
        user.hashed_password = outdated_hash
        db.commit()

    res = client.post("/auth/login", json={"email": "argon2-rehash@example.com", "password": password})
    assert res.status_code == 200

    with SessionLocal() as db:
        user = db.execute(select(models.User).where(models.User.email == "argon2-rehash@example.com")).scalar_one()
        assert user.hashed_password != outdated_hash
        assert user.hashed_password.startswith("$argon2id$")
        assert not auth.password_needs_rehash(user.hashed_password)


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
