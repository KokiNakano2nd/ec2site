from datetime import datetime, timedelta


def _get_verification_token(email):
    from app.database import SessionLocal
    from app import models

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        return user.email_verification_token
    finally:
        db.close()


def test_register_sends_verification_email_and_creates_unverified_user(client, monkeypatch):
    sent = {}

    def fake_send(email, link):
        sent["email"] = email
        sent["link"] = link

    monkeypatch.setattr("app.email_utils.send_verification_email", fake_send)

    res = client.post(
        "/auth/register", json={"email": "verify-me@example.com", "password": "password123"}
    )
    assert res.status_code == 201
    assert res.json()["is_verified"] is False

    assert sent["email"] == "verify-me@example.com"
    assert "verify_token=" in sent["link"]

    token = _get_verification_token("verify-me@example.com")
    assert token is not None
    assert token in sent["link"]


def test_confirm_verification_with_valid_token_marks_user_verified(client, monkeypatch):
    monkeypatch.setattr("app.email_utils.send_verification_email", lambda email, link: None)
    client.post("/auth/register", json={"email": "verify-me@example.com", "password": "password123"})
    token = _get_verification_token("verify-me@example.com")

    res = client.post("/auth/verify-email/confirm", json={"token": token})
    assert res.status_code == 200

    res = client.post(
        "/auth/login", json={"email": "verify-me@example.com", "password": "password123"}
    )
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {res.json()['access_token']}"})
    assert me.json()["is_verified"] is True


def test_confirm_verification_token_is_single_use(client, monkeypatch):
    monkeypatch.setattr("app.email_utils.send_verification_email", lambda email, link: None)
    client.post("/auth/register", json={"email": "verify-me@example.com", "password": "password123"})
    token = _get_verification_token("verify-me@example.com")

    res = client.post("/auth/verify-email/confirm", json={"token": token})
    assert res.status_code == 200

    res = client.post("/auth/verify-email/confirm", json={"token": token})
    assert res.status_code == 400


def test_confirm_verification_with_invalid_token_returns_400(client):
    res = client.post("/auth/verify-email/confirm", json={"token": "not-a-real-token"})
    assert res.status_code == 400


def test_confirm_verification_with_expired_token_returns_400(client, monkeypatch):
    from app.database import SessionLocal
    from app import models

    monkeypatch.setattr("app.email_utils.send_verification_email", lambda email, link: None)
    client.post("/auth/register", json={"email": "verify-me@example.com", "password": "password123"})
    token = _get_verification_token("verify-me@example.com")

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == "verify-me@example.com").first()
        user.email_verification_token_expires_at = datetime.utcnow() - timedelta(days=1)
        db.commit()
    finally:
        db.close()

    res = client.post("/auth/verify-email/confirm", json={"token": token})
    assert res.status_code == 400


def test_resend_verification_requires_auth(client):
    res = client.post("/auth/verify-email/resend")
    assert res.status_code == 401


def test_resend_verification_sends_new_token(client, auth_headers, monkeypatch):
    sent = {}

    def fake_send(email, link):
        sent["email"] = email
        sent["link"] = link

    monkeypatch.setattr("app.email_utils.send_verification_email", fake_send)

    old_token = _get_verification_token("user@example.com")

    res = client.post("/auth/verify-email/resend", headers=auth_headers)
    assert res.status_code == 200
    assert sent["email"] == "user@example.com"

    new_token = _get_verification_token("user@example.com")
    assert new_token != old_token
    assert new_token in sent["link"]
