from app import rate_limit
from app.routers.users import LOGIN_RATE_LIMIT, REGISTER_RATE_LIMIT

from .conftest import TEST_PASSWORD


def test_login_rate_limit_returns_429_after_threshold(client):
    max_requests, _ = LOGIN_RATE_LIMIT
    client.post("/auth/register", json={"email": "ratelimit@example.com", "password": TEST_PASSWORD})

    for _ in range(max_requests):
        res = client.post("/auth/login", json={"email": "ratelimit@example.com", "password": "wrong-password"})
        assert res.status_code == 401

    res = client.post("/auth/login", json={"email": "ratelimit@example.com", "password": "wrong-password"})
    assert res.status_code == 429
    assert res.json()["detail"] == "リクエストが多すぎます。しばらくしてから再度お試しください"


def test_login_rate_limit_does_not_block_other_ip_key(client):
    max_requests, window_seconds = LOGIN_RATE_LIMIT
    for _ in range(max_requests):
        rate_limit.check_rate_limit("login:1.2.3.4", max_requests, window_seconds)
    assert rate_limit.check_rate_limit("login:1.2.3.4", max_requests, window_seconds) is False

    # A different key (e.g. a different endpoint/IP combination) is unaffected.
    assert rate_limit.check_rate_limit("register:1.2.3.4", max_requests, window_seconds) is True


def test_register_rate_limit_returns_429_after_threshold(client):
    max_requests, _ = REGISTER_RATE_LIMIT

    for i in range(max_requests):
        res = client.post("/auth/register", json={"email": f"reg{i}@example.com", "password": TEST_PASSWORD})
        assert res.status_code == 201

    res = client.post("/auth/register", json={"email": "one-too-many@example.com", "password": TEST_PASSWORD})
    assert res.status_code == 429
    assert res.json()["detail"] == "リクエストが多すぎます。しばらくしてから再度お試しください"


def test_rate_limit_is_reset_between_tests(client):
    # If the autouse reset fixture in conftest didn't clear state, this would
    # immediately 429 due to leftover hits from the previous test functions.
    res = client.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever"})
    assert res.status_code == 401
