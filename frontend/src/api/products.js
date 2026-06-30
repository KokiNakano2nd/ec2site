const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchProducts() {
  const res = await fetch(`${API_URL}/products`);
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
