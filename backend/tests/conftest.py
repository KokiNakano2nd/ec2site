import os
import tempfile
from pathlib import Path

_tmp_dir = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp_dir.name) / 'test.db'}"
os.environ.setdefault("STRIPE_SECRET_KEY", "")
os.environ.setdefault("SMTP_HOST", "")

import pytest
from fastapi.testclient import TestClient

from app import rate_limit
from app.database import Base, engine
from app.main import app

TEST_PASSWORD = "password123"


@pytest.fixture(autouse=True)
def _reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    rate_limit.reset()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _register_and_login(client, email, password=TEST_PASSWORD):
    client.post("/auth/register", json={"email": email, "password": password})
    res = client.post("/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


@pytest.fixture
def user_token(client):
    return _register_and_login(client, "user@example.com")


@pytest.fixture
def auth_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def other_user_headers(client):
    token = _register_and_login(client, "other@example.com")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(client):
    # app.main.seed_admin() creates this account on startup.
    res = client.post("/auth/login", json={"email": "admin@example.com", "password": "admin12345"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture
def mock_stripe_refund_success(monkeypatch):
    calls = []

    def fake_create(**kwargs):
        calls.append(kwargs)
        return {"id": "re_test_123", "status": "succeeded"}

    monkeypatch.setattr("app.stripe_client.stripe_lib.Refund.create", fake_create)
    return calls


@pytest.fixture
def mock_stripe_refund_failure(monkeypatch):
    def fake_create(**kwargs):
        raise Exception("stripe refund failed (mocked)")

    monkeypatch.setattr("app.stripe_client.stripe_lib.Refund.create", fake_create)


@pytest.fixture
def stripe_enabled(monkeypatch):
    monkeypatch.setattr("app.config.STRIPE_SECRET_KEY", "sk_test_dummy")


def create_order_for_user(client, headers, product_id, quantity=1):
    client.post("/cart", json={"product_id": product_id, "quantity": quantity}, headers=headers)
    res = client.post("/orders", headers=headers)
    return res.json()
