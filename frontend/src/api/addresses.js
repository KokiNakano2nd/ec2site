import { apiFetch } from "./client";

export async function fetchAddresses(token, { signal } = {}) {
  return apiFetch("/addresses", { token, signal, fallback: [] });
}

export async function createAddress(token, data) {
  return apiFetch("/addresses", {
    method: "POST",
    token,
    body: data,
    errorMessage: "住所の追加に失敗しました",
  });
}

export async function updateAddress(token, id, data) {
  return apiFetch(`/addresses/${id}`, {
    method: "PATCH",
    token,
    body: data,
    errorMessage: "住所の更新に失敗しました",
  });
}

export async function deleteAddress(token, id) {
  return apiFetch(`/addresses/${id}`, {
    method: "DELETE",
    token,
    errorMessage: "住所の削除に失敗しました",
    parseResponse: false,
  });
}

export async function setDefaultAddress(token, id) {
  return apiFetch(`/addresses/${id}/default`, {
    method: "POST",
    token,
    errorMessage: "デフォルト設定に失敗しました",
  });
}
