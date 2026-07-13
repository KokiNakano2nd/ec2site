const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function register(email, password) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "登録に失敗しました");
  }
  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "ログインに失敗しました");
  }
  return res.json();
}

export async function fetchMe(token) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("ユーザー情報の取得に失敗しました");
  }
  return res.json();
}

export async function requestPasswordReset(email) {
  const res = await fetch(`${API_URL}/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new Error("パスワードリセットの要求に失敗しました");
  }
}

export async function confirmPasswordReset(token, newPassword) {
  const res = await fetch(`${API_URL}/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "パスワードの再設定に失敗しました");
  }
}

export async function resendVerificationEmail(token) {
  const res = await fetch(`${API_URL}/auth/verify-email/resend`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("確認メールの再送に失敗しました");
  }
}

export async function confirmEmailVerification(token) {
  const res = await fetch(`${API_URL}/auth/verify-email/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "メールアドレスの確認に失敗しました");
  }
}

export async function deleteAccount(token, password) {
  const res = await fetch(`${API_URL}/users/me`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "退会処理に失敗しました");
  }
}
