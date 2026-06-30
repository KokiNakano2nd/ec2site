const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function createOrder(token) {
  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "注文の確定に失敗しました");
  }
  return res.json();
}

export async function fetchOrders(token) {
  const res = await fetch(`${API_URL}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("注文履歴の取得に失敗しました");
  }
  return res.json();
}

export async function fetchOrderById(token, orderId) {
  const res = await fetch(`${API_URL}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("注文情報の取得に失敗しました");
  }
  return res.json();
}
