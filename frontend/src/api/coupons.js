import { apiFetch } from "./client";

export async function validateCoupon(code) {
  return apiFetch(`/coupons/validate?code=${encodeURIComponent(code)}`, {
    errorMessage: "無効なクーポンコードです",
  });
}

export async function fetchAdminCoupons(token) {
  return apiFetch("/admin/coupons", { token, errorMessage: "クーポン一覧の取得に失敗しました" });
}

export async function createAdminCoupon(token, data) {
  return apiFetch("/admin/coupons", {
    method: "POST",
    token,
    body: data,
    errorMessage: "クーポンの作成に失敗しました",
  });
}

export async function toggleAdminCoupon(token, couponId) {
  return apiFetch(`/admin/coupons/${couponId}`, {
    method: "PATCH",
    token,
    errorMessage: "クーポンの更新に失敗しました",
  });
}

export async function updateAdminCoupon(token, couponId, data) {
  return apiFetch(`/admin/coupons/${couponId}`, {
    method: "PATCH",
    token,
    body: data,
    errorMessage: "クーポンの更新に失敗しました",
  });
}

export async function fetchLowRemainingUsesCoupons(token) {
  return apiFetch("/admin/coupons/low-remaining-uses", {
    token,
    errorMessage: "残数僅少クーポンの取得に失敗しました",
  });
}

export async function deleteAdminCoupon(token, couponId) {
  return apiFetch(`/admin/coupons/${couponId}`, {
    method: "DELETE",
    token,
    errorMessage: "クーポンの削除に失敗しました",
    parseResponse: false,
  });
}
