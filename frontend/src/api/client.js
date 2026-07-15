const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export async function apiFetch(
  path,
  {
    method = "GET",
    token,
    body,
    errorMessage = "リクエストに失敗しました",
    fallback,
    parseResponse = true,
    signal,
  } = {},
) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    if (fallback !== undefined) return fallback;
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail || errorMessage, res.status, data.detail);
  }

  if (!parseResponse || res.status === 204) return undefined;
  return res.json();
}
