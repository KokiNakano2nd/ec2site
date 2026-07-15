import { C } from "../lib/constants";
import { ErrorBanner } from "./ErrorBanner";
import { FieldLabel } from "./FieldLabel";

export function DeleteAccountModal({ password, onPasswordChange, error, deleting, onCancel, onSubmit }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 28,
          width: 360,
          animation: "fadeUp 0.2s ease",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>本当に退会しますか？</h3>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
          確認のため、現在のパスワードを入力してください。
        </p>
        <FieldLabel>パスワード</FieldLabel>
        <input
          type="password"
          style={{
            width: "100%",
            background: C.dark,
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 8,
            color: C.text,
            fontSize: 13,
            padding: "6px 10px",
            height: 36,
          }}
          value={password}
          onChange={onPasswordChange}
          required
          autoFocus
        />
        {error && (
          <ErrorBanner size="sm" style={{ padding: "10px 14px", marginTop: 12 }}>
            {error}
          </ErrorBanner>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn-surface"
            onClick={onCancel}
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="btn-danger"
            disabled={deleting}
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            {deleting ? "処理中..." : "退会を実行する"}
          </button>
        </div>
      </form>
    </div>
  );
}
