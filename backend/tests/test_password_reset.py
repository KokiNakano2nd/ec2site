from datetime import datetime, timedelta

from .conftest import TEST_PASSWORD


def _get_reset_token(email):
    from app.database import SessionLocal
    from app import models

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        return user.password_reset_token
    finally:
        db.close()


def test_request_reset_for_existing_user_sends_email_and_sets_token(client, auth_headers, monkeypatch):
    sent = {}

    def fake_send(email, link):
        sent["email"] = email
        sent["link"] = link

    monkeypatch.setattr("app.main.send_password_reset_email", fake_send)

    res = client.post("/auth/password-reset/request", json={"email": "user@example.com"})
    assert res.status_code == 200

    assert sent["email"] == "user@example.com"
    assert "token=" in sent["link"]

    token = _get_reset_token("user@example.com")
    assert token is not None
    assert token in sent["link"]


def test_request_reset_for_nonexistent_email_returns_same_200_without_sending(client, monkeypatch):
    sent = {}

    def fake_send(email, link):
        sent["called"] = True

    monkeypatch.setattr("app.main.send_password_reset_email", fake_send)

    res = client.post("/auth/password-reset/request", json={"email": "nobody@example.com"})
    assert res.status_code == 200
    assert "called" not in sent


def test_confirm_reset_with_valid_token_updates_password(client, auth_headers, monkeypatch):
    monkeypatch.setattr("app.main.send_password_reset_email", lambda email, link: None)
    client.post("/auth/password-reset/request", json={"email": "user@example.com"})
    token = _get_reset_token("user@example.com")

    res = client.post(
        "/auth/password-reset/confirm", json={"token": token, "new_password": "new-password-456"}
    )
    assert res.status_code == 200

    # Old password no longer works; new password does.
    res = client.post("/auth/login", json={"email": "user@example.com", "password": TEST_PASSWORD})
    assert res.status_code == 401

    res = client.post("/auth/login", json={"email": "user@example.com", "password": "new-password-456"})
    assert res.status_code == 200


def test_confirm_reset_token_is_single_use(client, auth_headers, monkeypatch):
    monkeypatch.setattr("app.main.send_password_reset_email", lambda email, link: None)
    client.post("/auth/password-reset/request", json={"email": "user@example.com"})
    token = _get_reset_token("user@example.com")

    res = client.post(
        "/auth/password-reset/confirm", json={"token": token, "new_password": "new-password-456"}
    )
    assert res.status_code == 200

    res = client.post(
        "/auth/password-reset/confirm", json={"token": token, "new_password": "another-password"}
    )
    assert res.status_code == 400


def test_confirm_reset_with_invalid_token_returns_400(client):
    res = client.post(
        "/auth/password-reset/confirm", json={"token": "not-a-real-token", "new_password": "whatever123"}
    )
    assert res.status_code == 400


def test_confirm_reset_with_expired_token_returns_400(client, auth_headers, monkeypatch):
    from app.database import SessionLocal
    from app import models

    monkeypatch.setattr("app.main.send_password_reset_email", lambda email, link: None)
    client.post("/auth/password-reset/request", json={"email": "user@example.com"})
    token = _get_reset_token("user@example.com")

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == "user@example.com").first()
        user.password_reset_token_expires_at = datetime.utcnow() - timedelta(hours=1)
        db.commit()
    finally:
        db.close()

    res = client.post(
        "/auth/password-reset/confirm", json={"token": token, "new_password": "new-password-456"}
    )
    assert res.status_code == 400
