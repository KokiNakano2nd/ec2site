import { apiFetch } from "./client";

export async function fetchCart(token, { signal } = {}) {
  return apiFetch("/cart", { token, signal, errorMessage: "カート情報の取得に失敗しました" });
}

export async function addToCart(token, productId, quantity) {
  return apiFetch("/cart", {
    method: "POST",
    token,
    body: { product_id: productId, quantity },
    errorMessage: "カートへの追加に失敗しました",
  });
}

export async function updateCartItem(token, cartId, quantity) {
  return apiFetch(`/cart/${cartId}`, {
    method: "PATCH",
    token,
    body: { quantity },
    errorMessage: "数量の変更に失敗しました",
  });
}

export async function removeCartItem(token, cartId) {
  return apiFetch(`/cart/${cartId}`, {
    method: "DELETE",
    token,
    errorMessage: "カートからの削除に失敗しました",
    parseResponse: false,
  });
}
