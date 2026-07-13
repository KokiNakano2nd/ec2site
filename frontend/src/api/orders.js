import { apiFetch } from "./client";

export async function createOrder(token, couponCode = null) {
  return apiFetch("/orders", {
    method: "POST",
    token,
    body: { coupon_code: couponCode || null },
    errorMessage: "注文の確定に失敗しました",
  });
}

export async function fetchOrders(token) {
  return apiFetch("/orders", { token, errorMessage: "注文履歴の取得に失敗しました" });
}

export async function fetchOrderById(token, orderId) {
  return apiFetch(`/orders/${orderId}`, { token, errorMessage: "注文情報の取得に失敗しました" });
}

export async function cancelOrder(token, orderId) {
  return apiFetch(`/orders/${orderId}/cancel`, {
    method: "POST",
    token,
    errorMessage: "注文のキャンセルに失敗しました",
  });
}

export async function requestOrderReturn(token, orderId, reason) {
  return apiFetch(`/orders/${orderId}/return-request`, {
    method: "POST",
    token,
    body: { reason: reason || null },
    errorMessage: "返品申請に失敗しました",
  });
}
