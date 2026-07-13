import { useEffect, useState } from "react";
import { confirmPasswordReset, register, requestPasswordReset } from "../api/auth";
import { useAuth } from "../AuthContext";
import { ErrorBanner } from "../components/ErrorBanner";
import { FieldLabel } from "../components/FieldLabel";
import { C } from "../lib/constants";

export function AuthView({ initialMode, resetToken, onSuccess, onToggle }) {
  const { login } = useAuth();
  const [mode, setMode] = useState(initialMode || "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState(null);
  const [resetRequested, setResetRequested] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    setMode(initialMode || "login");
    setError(null);
    setResetRequested(false);
    setResetDone(false);
  }, [initialMode]);

  const isLoginMode = mode === "login";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        await register(email, password);
        await login(email, password);
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleMode() {
    const next = isLoginMode ? "register" : "login";
    setMode(next);
    setError(null);
    if (onToggle) onToggle(next);
  }

  function goToPasswordResetRequest() {
    setMode("password-reset-request");
    setError(null);
    if (onToggle) onToggle("password-reset-request");
  }

  async function handleRequestReset(e) {
    e.preventDefault();
    setError(null);
    try {
      await requestPasswordReset(email);
      setResetRequested(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleConfirmReset(e) {
    e.preventDefault();
    setError(null);
    try {
      await confirmPasswordReset(resetToken, newPassword);
      setResetDone(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (mode === "password-reset-request") {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 48, animation: "fadeUp 0.3s ease" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", color: C.text, marginBottom: 8, lineHeight: 1.2 }}>
            パスワードをリセット
          </div>
          {resetRequested ? (
            <p style={{ color: C.muted, fontSize: 15, maxWidth: 320, lineHeight: 1.6 }}>
              ご入力いただいたメールアドレス宛にパスワード再設定用のメールを送信しました(該当するアカウントが存在する場合)
            </p>
          ) : (
            <form onSubmit={handleRequestReset} style={{ display: "flex", flexDirection: "column", gap: 12, width: 360 }}>
              {error && (
                <ErrorBanner size="sm">
                  {error}
                </ErrorBanner>
              )}
              <div>
                <FieldLabel>メールアドレス</FieldLabel>
                <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required />
              </div>
              <button className="btn-auth" type="submit">送信する</button>
            </form>
          )}
          <div style={{ textAlign: "center", fontSize: 13, color: C.muted, marginTop: 12 }}>
            <button className="btn-link" type="button" onClick={() => { setMode("login"); if (onToggle) onToggle("login"); }}>
              ログインへ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "password-reset-confirm") {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 48, animation: "fadeUp 0.3s ease" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", color: C.text, marginBottom: 8, lineHeight: 1.2 }}>
            新しいパスワードを設定
          </div>
          {resetDone ? (
            <>
              <p style={{ color: C.muted, fontSize: 15, maxWidth: 320, lineHeight: 1.6, marginBottom: 20 }}>
                パスワードを更新しました
              </p>
              <button className="btn-auth" type="button" onClick={() => { setMode("login"); if (onToggle) onToggle("login"); }}>
                ログインへ
              </button>
            </>
          ) : (
            <form onSubmit={handleConfirmReset} style={{ display: "flex", flexDirection: "column", gap: 12, width: 360 }}>
              {error && (
                <ErrorBanner size="sm">
                  {error}
                </ErrorBanner>
              )}
              <div>
                <FieldLabel>新しいパスワード</FieldLabel>
                <input className="field-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6文字以上" required />
              </div>
              <button className="btn-auth" type="submit">パスワードを更新する</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 48, gap: 80, animation: "fadeUp 0.3s ease" }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", color: C.text, marginBottom: 8, lineHeight: 1.2 }}>
          {isLoginMode ? "おかえりなさい" : "アカウント作成"}
        </div>
        <p style={{ color: C.muted, fontSize: 15, marginBottom: 40, maxWidth: 280, lineHeight: 1.6 }}>
          {isLoginMode ? "メールアドレスとパスワードでログイン" : "新しいアカウントを作成して購入を始めよう"}
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, width: 360 }}>
          {error && (
            <ErrorBanner size="sm">
              {error}
            </ErrorBanner>
          )}
          <div>
            <FieldLabel>メールアドレス</FieldLabel>
            <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required />
          </div>
          <div>
            <FieldLabel>パスワード</FieldLabel>
            <input className="field-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6文字以上" required />
          </div>
          <button className="btn-auth" type="submit">{isLoginMode ? "ログイン" : "アカウントを作成"}</button>
          {isLoginMode && (
            <button className="btn-link" type="button" onClick={goToPasswordResetRequest} style={{ textAlign: "right", fontSize: 13 }}>
              パスワードをお忘れですか?
            </button>
          )}
          <div style={{ textAlign: "center", fontSize: 13, color: C.muted, marginTop: 4 }}>
            {isLoginMode ? "アカウントをお持ちでない方は" : "すでにアカウントをお持ちの方は"}
            {" "}
            <button className="btn-link" type="button" onClick={toggleMode}>
              {isLoginMode ? "新規登録" : "ログインへ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
