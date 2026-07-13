import { apiFetch } from "./client";

export async function fetchAnalyticsSummary(token) {
  return apiFetch("/admin/analytics/summary", { token, errorMessage: "サマリーの取得に失敗しました" });
}

export async function fetchSalesByDate(token, days = 30) {
  return apiFetch(`/admin/analytics/sales-by-date?days=${days}`, { token, fallback: [] });
}

export async function fetchTopProducts(token) {
  return apiFetch("/admin/analytics/top-products", { token, fallback: [] });
}

export async function fetchCategorySales(token) {
  return apiFetch("/admin/analytics/category-sales", { token, fallback: [] });
}
