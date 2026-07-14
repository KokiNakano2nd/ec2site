import { apiFetch } from "./client";

export async function fetchReviews(productId, { signal } = {}) {
  return apiFetch(`/products/${productId}/reviews`, { signal, errorMessage: "レビューの取得に失敗しました" });
}

export async function postReview(token, productId, rating, comment) {
  return apiFetch(`/products/${productId}/reviews`, {
    method: "POST",
    token,
    body: { rating, comment },
    errorMessage: "レビューの投稿に失敗しました",
  });
}
