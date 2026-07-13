import { apiFetch } from "./client";

export async function createProduct(token, data) {
  return apiFetch("/admin/products", {
    method: "POST",
    token,
    body: data,
    errorMessage: "商品の作成に失敗しました",
  });
}

export async function updateProduct(token, productId, data) {
  return apiFetch(`/admin/products/${productId}`, {
    method: "PATCH",
    token,
    body: data,
    errorMessage: "商品の更新に失敗しました",
  });
}

export async function deleteProduct(token, productId) {
  return apiFetch(`/admin/products/${productId}`, {
    method: "DELETE",
    token,
    errorMessage: "商品の削除に失敗しました",
    parseResponse: false,
  });
}

export async function fetchLowStockProducts(token) {
  return apiFetch("/admin/products/low-stock", { token, errorMessage: "低在庫商品の取得に失敗しました" });
}

export async function fetchAdminOrders(token) {
  return apiFetch("/admin/orders", { token, errorMessage: "注文一覧の取得に失敗しました" });
}

export async function updateOrderStatus(token, orderId, status) {
  return apiFetch(`/admin/orders/${orderId}/status`, {
    method: "PATCH",
    token,
    body: { status },
    errorMessage: "ステータスの更新に失敗しました",
  });
}

export async function resolveOrderReturn(token, orderId, action) {
  return apiFetch(`/admin/orders/${orderId}/return`, {
    method: "PATCH",
    token,
    body: { action },
    errorMessage: "返品処理に失敗しました",
  });
}
