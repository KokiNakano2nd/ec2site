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
