class FakeCheckoutSession:
    def __init__(self, url="https://checkout.stripe.test/session/fake"):
        self.url = url


class FakeCompletedSession:
    def __init__(self, user_id, coupon_code="", payment_status="paid", payment_intent="pi_test_999"):
        self.payment_status = payment_status
        self.metadata = {"user_id": str(user_id), "coupon_code": coupon_code}
        self.payment_intent = payment_intent


def _current_user_id(client, headers):
    return client.get("/auth/me", headers=headers).json()["id"]


def _add_to_cart(client, headers, quantity=1):
    product = client.get("/products", headers=headers).json()[0]
    client.post("/cart", json={"product_id": product["id"], "quantity": quantity}, headers=headers)
    return product


def test_config_reports_stripe_disabled_by_default(client):
    assert client.get("/config").json() == {"stripe_enabled": False}


def test_config_reports_stripe_enabled(client, stripe_enabled):
    assert client.get("/config").json() == {"stripe_enabled": True}


def test_checkout_requires_stripe_configured(client, auth_headers):
    res = client.post("/payment/checkout", headers=auth_headers)
    assert res.status_code == 400
    assert "Stripe" in res.json()["detail"]


def test_checkout_requires_nonempty_cart(client, auth_headers, stripe_enabled):
    res = client.post("/payment/checkout", headers=auth_headers)
    assert res.status_code == 400
    assert "カートが空です" in res.json()["detail"]


def test_checkout_creates_session_url(client, auth_headers, stripe_enabled, monkeypatch):
    _add_to_cart(client, auth_headers)
    monkeypatch.setattr(
        "app.main.stripe_lib.checkout.Session.create", lambda **kwargs: FakeCheckoutSession()
    )

    res = client.post("/payment/checkout", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["session_url"] == "https://checkout.stripe.test/session/fake"


def test_checkout_applies_coupon_discount_to_session_amount(
    client, auth_headers, admin_headers, stripe_enabled, monkeypatch
):
    client.post(
        "/admin/coupons",
        json={"code": "CHECKOUT10", "discount_type": "percentage", "discount_value": 10},
        headers=admin_headers,
    )
    _add_to_cart(client, auth_headers)

    captured = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return FakeCheckoutSession()

    monkeypatch.setattr("app.main.stripe_lib.checkout.Session.create", fake_create)

    res_no_coupon = client.post("/payment/checkout", headers=auth_headers)
    assert res_no_coupon.status_code == 200
    amount_without_coupon = captured["line_items"][0]["price_data"]["unit_amount"]

    res_with_coupon = client.post(
        "/payment/checkout", json={"coupon_code": "CHECKOUT10"}, headers=auth_headers
    )
    assert res_with_coupon.status_code == 200
    amount_with_coupon = captured["line_items"][0]["price_data"]["unit_amount"]

    assert amount_with_coupon < amount_without_coupon
    assert captured["metadata"]["coupon_code"] == "CHECKOUT10"


def test_checkout_stripe_error_returns_500(client, auth_headers, stripe_enabled, monkeypatch):
    _add_to_cart(client, auth_headers)

    def fake_create(**kwargs):
        raise Exception("stripe down (mocked)")

    monkeypatch.setattr("app.main.stripe_lib.checkout.Session.create", fake_create)

    res = client.post("/payment/checkout", headers=auth_headers)
    assert res.status_code == 500


def test_complete_payment_requires_stripe_configured(client, auth_headers):
    res = client.post("/payment/complete", params={"session_id": "cs_test_1"}, headers=auth_headers)
    assert res.status_code == 400
    assert "Stripe" in res.json()["detail"]


def test_complete_payment_session_retrieve_failure(client, auth_headers, stripe_enabled, monkeypatch):
    def fake_retrieve(session_id):
        raise Exception("session not found (mocked)")

    monkeypatch.setattr("app.main.stripe_lib.checkout.Session.retrieve", fake_retrieve)

    res = client.post("/payment/complete", params={"session_id": "cs_bogus"}, headers=auth_headers)
    assert res.status_code == 400


def test_complete_payment_not_paid_returns_400(client, auth_headers, stripe_enabled, monkeypatch):
    user_id = _current_user_id(client, auth_headers)
    monkeypatch.setattr(
        "app.main.stripe_lib.checkout.Session.retrieve",
        lambda session_id: FakeCompletedSession(user_id, payment_status="unpaid"),
    )

    res = client.post("/payment/complete", params={"session_id": "cs_test_1"}, headers=auth_headers)
    assert res.status_code == 400
    assert "支払いが完了していません" in res.json()["detail"]


def test_complete_payment_wrong_user_returns_403(client, auth_headers, stripe_enabled, monkeypatch):
    monkeypatch.setattr(
        "app.main.stripe_lib.checkout.Session.retrieve",
        lambda session_id: FakeCompletedSession(user_id=999999),
    )

    res = client.post("/payment/complete", params={"session_id": "cs_test_1"}, headers=auth_headers)
    assert res.status_code == 403


def test_complete_payment_empty_cart_returns_400(client, auth_headers, stripe_enabled, monkeypatch):
    user_id = _current_user_id(client, auth_headers)
    monkeypatch.setattr(
        "app.main.stripe_lib.checkout.Session.retrieve",
        lambda session_id: FakeCompletedSession(user_id),
    )

    res = client.post("/payment/complete", params={"session_id": "cs_test_1"}, headers=auth_headers)
    assert res.status_code == 400
    assert "カートが空です" in res.json()["detail"]


def test_complete_payment_creates_order_and_applies_coupon(
    client, auth_headers, admin_headers, stripe_enabled, monkeypatch
):
    client.post(
        "/admin/coupons",
        json={"code": "STRIPE10", "discount_type": "percentage", "discount_value": 10},
        headers=admin_headers,
    )

    user_id = _current_user_id(client, auth_headers)
    product = _add_to_cart(client, auth_headers, quantity=2)
    stock_before = product["stock"]

    monkeypatch.setattr(
        "app.main.stripe_lib.checkout.Session.retrieve",
        lambda session_id: FakeCompletedSession(user_id, coupon_code="STRIPE10"),
    )

    res = client.post("/payment/complete", params={"session_id": "cs_test_1"}, headers=auth_headers)
    assert res.status_code == 200
    order = res.json()
    assert order["status"] == "processing"
    assert order["coupon_code"] == "STRIPE10"
    assert order["discount_amount"] > 0

    stock_after = client.get(f"/products/{product['id']}", headers=auth_headers).json()["stock"]
    assert stock_after == stock_before - 2

    cart_after = client.get("/cart", headers=auth_headers).json()
    assert cart_after == []

    coupons = client.get("/admin/coupons", headers=admin_headers).json()
    coupon = next(c for c in coupons if c["code"] == "STRIPE10")
    assert coupon["used_count"] == 1
