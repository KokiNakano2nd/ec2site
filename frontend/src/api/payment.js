import { apiFetch } from "./client";

export async function fetchConfig() {
  return apiFetch("/config", { fallback: { stripe_enabled: false } });
}

export async function createCheckoutSession(token, couponCode = null) {
  return apiFetch("/payment/checkout", {
    method: "POST",
    token,
    body: { coupon_code: couponCode },
    errorMessage: "決済セッションの作成に失敗しました",
  });
}

export async function completePayment(token, sessionId) {
  return apiFetch(`/payment/complete?session_id=${encodeURIComponent(sessionId)}`, {
    method: "POST",
    token,
    errorMessage: "決済の確認に失敗しました",
  });
}
