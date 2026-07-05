const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchAnalyticsSummary(token) {
  const res = await fetch(`${API_URL}/admin/analytics/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("サマリーの取得に失敗しました");
  return res.json();
}

export async function fetchSalesByDate(token, days = 30) {
  const res = await fetch(`${API_URL}/admin/analytics/sales-by-date?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTopProducts(token) {
  const res = await fetch(`${API_URL}/admin/analytics/top-products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchCategorySales(token) {
  const res = await fetch(`${API_URL}/admin/analytics/category-sales`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}
