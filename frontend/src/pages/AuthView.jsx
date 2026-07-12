import { useEffect, useState } from "react";
import { register } from "../api/auth";
import { useAuth } from "../AuthContext";
import { FieldLabel } from "../components/FieldLabel";
import { C } from "../lib/constants";

export function AuthView({ initialMode, onSuccess, onToggle }) {
  const { login } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(initialMode !== "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoginMode(initialMode !== "register");
  }, [initialMode]);

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
    setIsLoginMode((m) => !m);
    setError(null);
    if (onToggle) onToggle(isLoginMode ? "register" : "login");
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
            <div style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 10, padding: "12px 16px", color: C.red, fontSize: 13 }}>
              {error}
            </div>
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
