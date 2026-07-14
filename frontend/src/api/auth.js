import { apiFetch } from "./client";

export async function register(email, password) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: { email, password },
    errorMessage: "登録に失敗しました",
  });
}

export async function login(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: { email, password },
    errorMessage: "ログインに失敗しました",
  });
}

export async function fetchMe(token, { signal } = {}) {
  return apiFetch("/auth/me", { token, signal, errorMessage: "ユーザー情報の取得に失敗しました" });
}

export async function requestPasswordReset(email) {
  return apiFetch("/auth/password-reset/request", {
    method: "POST",
    body: { email },
    errorMessage: "パスワードリセットの要求に失敗しました",
    parseResponse: false,
  });
}

export async function confirmPasswordReset(token, newPassword) {
  return apiFetch("/auth/password-reset/confirm", {
    method: "POST",
    body: { token, new_password: newPassword },
    errorMessage: "パスワードの再設定に失敗しました",
    parseResponse: false,
  });
}

export async function resendVerificationEmail(token) {
  return apiFetch("/auth/verify-email/resend", {
    method: "POST",
    token,
    errorMessage: "確認メールの再送に失敗しました",
    parseResponse: false,
  });
}

export async function confirmEmailVerification(token) {
  return apiFetch("/auth/verify-email/confirm", {
    method: "POST",
    body: { token },
    errorMessage: "メールアドレスの確認に失敗しました",
    parseResponse: false,
  });
}

export async function deleteAccount(token, password) {
  return apiFetch("/users/me", {
    method: "DELETE",
    token,
    body: { password },
    errorMessage: "退会処理に失敗しました",
    parseResponse: false,
  });
}
