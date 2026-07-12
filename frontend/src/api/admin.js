const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function createProduct(token, data) {
  const res = await fetch(`${API_URL}/admin/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "商品の作成に失敗しました");
  }
  return res.json();
}

export async function updateProduct(token, productId, data) {
  const res = await fetch(`${API_URL}/admin/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "商品の更新に失敗しました");
  }
  return res.json();
}

export async function deleteProduct(token, productId) {
  const res = await fetch(`${API_URL}/admin/products/${productId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("商品の削除に失敗しました");
  }
}

export async function fetchAdminOrders(token) {
  const res = await fetch(`${API_URL}/admin/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("注文一覧の取得に失敗しました");
  }
  return res.json();
}

export async function updateOrderStatus(token, orderId, status) {
  const res = await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error("ステータスの更新に失敗しました");
  }
  return res.json();
}

export async function resolveOrderReturn(token, orderId, action) {
  const res = await fetch(`${API_URL}/admin/orders/${orderId}/return`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "返品処理に失敗しました");
  }
  return res.json();
}
