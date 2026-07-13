from tests.conftest import create_order_for_user


def _first_product_id(client, headers):
    products = client.get("/products", headers=headers).json()
    return products[0]["id"], products[0]["stock"]


def test_cancel_pending_order_restores_stock(client, auth_headers):
    product_id, stock_before = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id, quantity=2)
    assert order["status"] == "pending"

    stock_after_order = client.get(f"/products/{product_id}", headers=auth_headers).json()["stock"]
    assert stock_after_order == stock_before - 2

    res = client.post(f"/orders/{order['id']}/cancel", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "cancelled"

    stock_after_cancel = client.get(f"/products/{product_id}", headers=auth_headers).json()["stock"]
    assert stock_after_cancel == stock_before


def test_cancel_already_cancelled_order_returns_400(client, auth_headers):
    product_id, _ = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id)
    client.post(f"/orders/{order['id']}/cancel", headers=auth_headers)

    res = client.post(f"/orders/{order['id']}/cancel", headers=auth_headers)
    assert res.status_code == 400


def test_cancel_shipped_order_is_rejected(client, auth_headers, admin_headers):
    product_id, _ = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id)
    client.patch(f"/admin/orders/{order['id']}/status", json={"status": "shipped"}, headers=admin_headers)

    res = client.post(f"/orders/{order['id']}/cancel", headers=auth_headers)
    assert res.status_code == 400
    assert "キャンセルできません" in res.json()["detail"]


def test_cancel_other_users_order_returns_404(client, auth_headers, other_user_headers):
    product_id, _ = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id)

    res = client.post(f"/orders/{order['id']}/cancel", headers=other_user_headers)
    assert res.status_code == 404


def test_return_request_requires_shipped_status(client, auth_headers):
    product_id, _ = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id)

    res = client.post(f"/orders/{order['id']}/return-request", headers=auth_headers)
    assert res.status_code == 400
    assert "返品を申請できません" in res.json()["detail"]


def test_return_request_success_keeps_stock_decremented(client, auth_headers, admin_headers):
    product_id, stock_before = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id, quantity=1)
    client.patch(f"/admin/orders/{order['id']}/status", json={"status": "shipped"}, headers=admin_headers)

    res = client.post(
        f"/orders/{order['id']}/return-request", json={"reason": "サイズが合わなかった"}, headers=auth_headers
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "return_requested"
    assert body["return_reason"] == "サイズが合わなかった"

    stock_after = client.get(f"/products/{product_id}", headers=auth_headers).json()["stock"]
    assert stock_after == stock_before - 1


def test_admin_approve_return_restores_stock(client, auth_headers, admin_headers):
    product_id, stock_before = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id, quantity=3)
    client.patch(f"/admin/orders/{order['id']}/status", json={"status": "shipped"}, headers=admin_headers)
    client.post(f"/orders/{order['id']}/return-request", headers=auth_headers)

    res = client.patch(f"/admin/orders/{order['id']}/return", json={"action": "approve"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "returned"

    stock_after = client.get(f"/products/{product_id}", headers=auth_headers).json()["stock"]
    assert stock_after == stock_before


def test_admin_reject_return_goes_back_to_shipped_without_stock_change(client, auth_headers, admin_headers):
    product_id, stock_before = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id, quantity=1)
    client.patch(f"/admin/orders/{order['id']}/status", json={"status": "shipped"}, headers=admin_headers)
    client.post(f"/orders/{order['id']}/return-request", headers=auth_headers)

    res = client.patch(f"/admin/orders/{order['id']}/return", json={"action": "reject"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "shipped"

    stock_after = client.get(f"/products/{product_id}", headers=auth_headers).json()["stock"]
    assert stock_after == stock_before - 1


def test_admin_reject_return_sends_dedicated_notification(client, auth_headers, admin_headers, monkeypatch):
    rejected_calls = []
    status_calls = []
    monkeypatch.setattr(
        "app.email_utils.send_return_rejected_email", lambda email, order_id: rejected_calls.append((email, order_id))
    )
    monkeypatch.setattr(
        "app.email_utils.send_status_notification",
        lambda email, order_id, status: status_calls.append((email, order_id, status)),
    )

    product_id, _ = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id, quantity=1)
    client.patch(f"/admin/orders/{order['id']}/status", json={"status": "shipped"}, headers=admin_headers)
    status_calls.clear()
    client.post(f"/orders/{order['id']}/return-request", headers=auth_headers)
    status_calls.clear()

    res = client.patch(f"/admin/orders/{order['id']}/return", json={"action": "reject"}, headers=admin_headers)
    assert res.status_code == 200

    assert len(rejected_calls) == 1
    assert rejected_calls[0][1] == order["id"]
    assert status_calls == []


def test_admin_resolve_return_invalid_action_returns_400(client, auth_headers, admin_headers):
    product_id, _ = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id)
    client.patch(f"/admin/orders/{order['id']}/status", json={"status": "shipped"}, headers=admin_headers)
    client.post(f"/orders/{order['id']}/return-request", headers=auth_headers)

    res = client.patch(f"/admin/orders/{order['id']}/return", json={"action": "bogus"}, headers=admin_headers)
    assert res.status_code == 400


def test_admin_resolve_return_wrong_status_returns_400(client, auth_headers, admin_headers):
    product_id, _ = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id)

    res = client.patch(f"/admin/orders/{order['id']}/return", json={"action": "approve"}, headers=admin_headers)
    assert res.status_code == 400


def test_admin_resolve_return_requires_admin(client, auth_headers):
    product_id, _ = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id)

    res = client.patch(f"/admin/orders/{order['id']}/return", json={"action": "approve"}, headers=auth_headers)
    assert res.status_code == 403


def test_cancel_with_stripe_payment_intent_calls_refund(client, auth_headers, mock_stripe_refund_success):
    from app import models
    from app.database import SessionLocal

    product_id, stock_before = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id, quantity=1)

    db = SessionLocal()
    try:
        db_order = db.query(models.Order).filter(models.Order.id == order["id"]).first()
        db_order.stripe_payment_intent_id = "pi_test_123"
        db.commit()
    finally:
        db.close()

    res = client.post(f"/orders/{order['id']}/cancel", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "cancelled"
    assert mock_stripe_refund_success == [{"payment_intent": "pi_test_123"}]


def test_cancel_with_stripe_refund_failure_returns_500_and_keeps_order_unchanged(
    client, auth_headers, mock_stripe_refund_failure
):
    from app import models
    from app.database import SessionLocal

    product_id, stock_before = _first_product_id(client, auth_headers)
    order = create_order_for_user(client, auth_headers, product_id, quantity=1)

    db = SessionLocal()
    try:
        db_order = db.query(models.Order).filter(models.Order.id == order["id"]).first()
        db_order.stripe_payment_intent_id = "pi_test_456"
        db.commit()
    finally:
        db.close()

    res = client.post(f"/orders/{order['id']}/cancel", headers=auth_headers)
    assert res.status_code == 500

    order_after = client.get(f"/orders/{order['id']}", headers=auth_headers).json()
    assert order_after["status"] == "pending"

    stock_after = client.get(f"/products/{product_id}", headers=auth_headers).json()["stock"]
    assert stock_after == stock_before - 1
