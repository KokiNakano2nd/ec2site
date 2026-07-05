const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchConfig() {
  const res = await fetch(`${API_URL}/config`);
  if (!res.ok) return { stripe_enabled: false };
  return res.json();
}

export async function createCheckoutSession(token, couponCode = null) {
  const res = await fetch(`${API_URL}/payment/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ coupon_code: couponCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "決済セッションの作成に失敗しました");
  }
  return res.json();
}

export async function completePayment(token, sessionId) {
  const res = await fetch(`${API_URL}/payment/complete?session_id=${encodeURIComponent(sessionId)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "決済の確認に失敗しました");
  }
  return res.json();
}
