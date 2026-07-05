const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchProducts(q) {
  const url = q ? `${API_URL}/products?q=${encodeURIComponent(q)}` : `${API_URL}/products`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("商品一覧の取得に失敗しました");
  }
  return res.json();
}

export async function fetchProductById(id) {
  const res = await fetch(`${API_URL}/products/${id}`);
  if (!res.ok) {
    throw new Error("商品詳細の取得に失敗しました");
  }
  return res.json();
}

export async function fetchRecommendations(productId) {
  const res = await fetch(`${API_URL}/products/${productId}/recommendations`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProductImages(productId) {
  const res = await fetch(`${API_URL}/products/${productId}/images`);
  if (!res.ok) return [];
  return res.json();
}

export async function addProductImage(token, productId, imageUrl, displayOrder = 0) {
  const res = await fetch(`${API_URL}/admin/products/${productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ image_url: imageUrl, display_order: displayOrder }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "画像の追加に失敗しました");
  }
  return res.json();
}

export async function deleteProductImage(token, imageId) {
  const res = await fetch(`${API_URL}/admin/product-images/${imageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("画像の削除に失敗しました");
}
