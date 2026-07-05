const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchReviews(productId) {
  const res = await fetch(`${API_URL}/products/${productId}/reviews`);
  if (!res.ok) throw new Error("レビューの取得に失敗しました");
  return res.json();
}

export async function postReview(token, productId, rating, comment) {
  const res = await fetch(`${API_URL}/products/${productId}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rating, comment }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "レビューの投稿に失敗しました");
  }
  return res.json();
}
