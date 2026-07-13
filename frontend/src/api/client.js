const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function apiFetch(path, { method = "GET", token, body, errorMessage = "リクエストに失敗しました", fallback, parseResponse = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (fallback !== undefined) return fallback;
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || errorMessage);
  }

  if (!parseResponse) return undefined;
  return res.json();
}
