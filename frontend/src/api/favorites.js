import { apiFetch } from "./client";

export async function fetchFavorites(token) {
  return apiFetch("/favorites", { token, errorMessage: "お気に入りの取得に失敗しました" });
}

export async function addFavorite(token, productId) {
  return apiFetch(`/favorites/${productId}`, {
    method: "POST",
    token,
    errorMessage: "お気に入りへの追加に失敗しました",
  });
}

export async function removeFavorite(token, productId) {
  return apiFetch(`/favorites/${productId}`, {
    method: "DELETE",
    token,
    errorMessage: "お気に入りの削除に失敗しました",
    parseResponse: false,
  });
}
