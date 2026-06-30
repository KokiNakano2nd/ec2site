const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchCart(token) {
  const res = await fetch(`${API_URL}/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("カート情報の取得に失敗しました");
  }
  return res.json();
}

export async function addToCart(token, productId, quantity) {
  const res = await fetch(`${API_URL}/cart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ product_id: productId, quantity }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "カートへの追加に失敗しました");
  }
  return res.json();
}

export async function updateCartItem(token, cartId, quantity) {
  const res = await fetch(`${API_URL}/cart/${cartId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "数量の変更に失敗しました");
  }
  return res.json();
}

export async function removeCartItem(token, cartId) {
  const res = await fetch(`${API_URL}/cart/${cartId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("カートからの削除に失敗しました");
  }
}
