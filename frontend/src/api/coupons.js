const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function validateCoupon(code) {
  const res = await fetch(`${API_URL}/coupons/validate?code=${encodeURIComponent(code)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "無効なクーポンコードです");
  }
  return res.json();
}

export async function fetchAdminCoupons(token) {
  const res = await fetch(`${API_URL}/admin/coupons`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("クーポン一覧の取得に失敗しました");
  return res.json();
}

export async function createAdminCoupon(token, data) {
  const res = await fetch(`${API_URL}/admin/coupons`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "クーポンの作成に失敗しました");
  }
  return res.json();
}

export async function toggleAdminCoupon(token, couponId) {
  const res = await fetch(`${API_URL}/admin/coupons/${couponId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("クーポンの更新に失敗しました");
  return res.json();
}

export async function updateAdminCoupon(token, couponId, data) {
  const res = await fetch(`${API_URL}/admin/coupons/${couponId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("クーポンの更新に失敗しました");
  return res.json();
}

export async function fetchLowRemainingUsesCoupons(token) {
  const res = await fetch(`${API_URL}/admin/coupons/low-remaining-uses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("残数僅少クーポンの取得に失敗しました");
  return res.json();
}

export async function deleteAdminCoupon(token, couponId) {
  const res = await fetch(`${API_URL}/admin/coupons/${couponId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("クーポンの削除に失敗しました");
}
