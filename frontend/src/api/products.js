import { apiFetch } from "./client";

export async function fetchProducts(q) {
  const path = q ? `/products?q=${encodeURIComponent(q)}` : "/products";
  return apiFetch(path, { errorMessage: "商品一覧の取得に失敗しました" });
}

export async function fetchProductById(id) {
  return apiFetch(`/products/${id}`, { errorMessage: "商品詳細の取得に失敗しました" });
}

export async function fetchRecommendations(productId) {
  return apiFetch(`/products/${productId}/recommendations`, { fallback: [] });
}

export async function fetchProductImages(productId) {
  return apiFetch(`/products/${productId}/images`, { fallback: [] });
}

export async function addProductImage(token, productId, imageUrl, displayOrder = 0) {
  return apiFetch(`/admin/products/${productId}/images`, {
    method: "POST",
    token,
    body: { image_url: imageUrl, display_order: displayOrder },
    errorMessage: "画像の追加に失敗しました",
  });
}

export async function deleteProductImage(token, imageId) {
  return apiFetch(`/admin/product-images/${imageId}`, {
    method: "DELETE",
    token,
    errorMessage: "画像の削除に失敗しました",
    parseResponse: false,
  });
}
