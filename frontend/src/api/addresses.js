const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchAddresses(token) {
  const res = await fetch(`${API_URL}/addresses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createAddress(token, data) {
  const res = await fetch(`${API_URL}/addresses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "住所の追加に失敗しました");
  }
  return res.json();
}

export async function updateAddress(token, id, data) {
  const res = await fetch(`${API_URL}/addresses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("住所の更新に失敗しました");
  return res.json();
}

export async function deleteAddress(token, id) {
  const res = await fetch(`${API_URL}/addresses/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("住所の削除に失敗しました");
}

export async function setDefaultAddress(token, id) {
  const res = await fetch(`${API_URL}/addresses/${id}/default`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("デフォルト設定に失敗しました");
  return res.json();
}
