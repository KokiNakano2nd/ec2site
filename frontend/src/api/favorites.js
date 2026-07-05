const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchFavorites(token) {
  const res = await fetch(`${API_URL}/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("お気に入りの取得に失敗しました");
  return res.json();
}

export async function addFavorite(token, productId) {
  const res = await fetch(`${API_URL}/favorites/${productId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("お気に入りへの追加に失敗しました");
  return res.json();
}

export async function removeFavorite(token, productId) {
  const res = await fetch(`${API_URL}/favorites/${productId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("お気に入りの削除に失敗しました");
}
