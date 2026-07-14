import { useEffect, useState } from "react";
import { createAddress, deleteAddress, fetchAddresses, setDefaultAddress } from "../api/addresses";
import { deleteAccount, resendVerificationEmail } from "../api/auth";
import { useAuth } from "../AuthContext";
import { DeleteAccountModal } from "../components/DeleteAccountModal";
import { ErrorBanner } from "../components/ErrorBanner";
import { FieldLabel } from "../components/FieldLabel";
import { C } from "../lib/constants";

export function ProfileView({ showToast, onAccountDeleted }) {
  const { user, token, logout } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const emptyForm = { name: "", postal_code: "", prefecture: "", city: "", address_line1: "", address_line2: "", phone: "", is_default: false };
  const [form, setForm] = useState(emptyForm);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleResendVerification() {
    setResending(true);
    try {
      await resendVerificationEmail(token);
      if (showToast) showToast("確認メールを再送しました");
    } catch (err) {
      if (showToast) showToast(err.message);
    } finally {
      setResending(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetchAddresses(token, { signal: controller.signal })
      .then(setAddresses)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, [token]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      const created = await createAddress(token, form);
      setAddresses((prev) => {
        const updated = form.is_default ? prev.map((a) => ({ ...a, is_default: false })) : prev;
        return [created, ...updated].sort((a, b) => b.is_default - a.is_default);
      });
      setForm(emptyForm);
      setShowForm(false);
      if (showToast) showToast("住所を追加しました");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteAddress(token, id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      if (showToast) showToast("住所を削除しました");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSetDefault(id) {
    try {
      await setDefaultAddress(token, id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
            .sort((a, b) => b.is_default - a.is_default)
      );
      if (showToast) showToast("デフォルト住所を変更しました");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(token, deletePassword);
      logout();
      if (onAccountDeleted) onAccountDeleted();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const fieldStyle = { width: "100%", background: C.dark, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8, color: C.text, fontSize: 13, padding: "6px 10px", height: 36 };

  return (
    <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 720 }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: C.accent, textTransform: "uppercase", marginBottom: 6 }}>アカウント</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.6px", color: C.text }}>プロフィール</h1>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56, height: 56, background: "linear-gradient(135deg,#5b8bf5,#8b5cf6)",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: "#fff",
          }}>{(user?.email || "?")[0].toUpperCase()}</div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{user?.email}</p>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{user?.is_admin ? "管理者" : "一般ユーザー"}</p>
          </div>
        </div>
        {user && !user.is_verified && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, background: "rgba(255,193,7,0.15)", color: "#ffc107", border: "1px solid rgba(255,193,7,0.3)", borderRadius: 6, padding: "4px 10px" }}>
              メールアドレスが未確認です
            </span>
            <button className="btn-surface" onClick={handleResendVerification} disabled={resending} style={{ padding: "6px 12px", fontSize: 12 }}>
              {resending ? "送信中..." : "確認メールを再送する"}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>配送先住所帳</h2>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)} style={{ padding: "8px 16px", fontSize: 13, borderRadius: 8 }}>
          {showForm ? "× キャンセル" : "+ 住所を追加"}
        </button>
      </div>

      {error && (
        <ErrorBanner size="sm" style={{ marginBottom: 16 }}>{error}</ErrorBanner>
      )}

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 20, animation: "fadeUp 0.2s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <FieldLabel>お名前（宛名）</FieldLabel>
              <input style={fieldStyle} placeholder="山田 太郎" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <FieldLabel>電話番号（任意）</FieldLabel>
              <input style={fieldStyle} placeholder="090-0000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <FieldLabel>郵便番号</FieldLabel>
              <input style={fieldStyle} placeholder="000-0000" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} required />
            </div>
            <div>
              <FieldLabel>都道府県</FieldLabel>
              <input style={fieldStyle} placeholder="東京都" value={form.prefecture} onChange={(e) => setForm({ ...form, prefecture: e.target.value })} required />
            </div>
            <div>
              <FieldLabel>市区町村</FieldLabel>
              <input style={fieldStyle} placeholder="渋谷区" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </div>
            <div>
              <FieldLabel>番地・建物名</FieldLabel>
              <input style={fieldStyle} placeholder="1-2-3 ○○ビル" value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} required />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel>部屋番号等（任意）</FieldLabel>
              <input style={fieldStyle} placeholder="101号室" value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.sec, cursor: "pointer", marginBottom: 16 }}>
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} style={{ accentColor: C.accent }} />
            デフォルトの配送先に設定する
          </label>
          <button className="btn-primary" type="submit" style={{ padding: "10px 24px", fontSize: 13, borderRadius: 8 }}>保存する</button>
        </form>
      )}

      {addresses.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "60px 40px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 }}>
          <p style={{ color: C.muted, fontSize: 14 }}>住所が登録されていません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {addresses.map((addr) => (
            <div key={addr.id} style={{ background: C.surface, border: `1px solid ${addr.is_default ? "rgba(91,139,245,0.35)" : C.border}`, borderRadius: 14, padding: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div>
                {addr.is_default && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(91,139,245,0.15)", color: C.accent, border: "1px solid rgba(91,139,245,0.3)", borderRadius: 4, padding: "2px 7px", marginBottom: 8, display: "inline-block" }}>デフォルト</span>
                )}
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{addr.name}</p>
                {addr.phone && <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{addr.phone}</p>}
                <p style={{ fontSize: 13, color: C.sec, marginTop: 4 }}>
                  〒{addr.postal_code} {addr.prefecture}{addr.city}{addr.address_line1}
                  {addr.address_line2 && ` ${addr.address_line2}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {!addr.is_default && (
                  <button className="btn-surface" onClick={() => handleSetDefault(addr.id)} style={{ padding: "6px 12px", fontSize: 12 }}>デフォルトに設定</button>
                )}
                <button className="btn-danger" onClick={() => handleDelete(addr.id)} style={{ padding: "6px 12px", fontSize: 12 }}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.red, marginBottom: 12 }}>危険な操作</h2>
        <div style={{ background: C.surface, border: "1px solid rgba(255,107,107,0.3)", borderRadius: 14, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>アカウントを退会する</p>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>退会するとログインできなくなり、メールアドレス等の個人情報が匿名化されます。注文履歴は業務記録として残ります。</p>
          </div>
          <button className="btn-danger" onClick={() => { setShowDeleteModal(true); setDeleteError(null); setDeletePassword(""); }} style={{ padding: "8px 16px", fontSize: 13, flexShrink: 0 }}>
            退会する
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          password={deletePassword}
          onPasswordChange={(e) => setDeletePassword(e.target.value)}
          error={deleteError}
          deleting={deleting}
          onCancel={() => setShowDeleteModal(false)}
          onSubmit={handleDeleteAccount}
        />
      )}
    </div>
  );
}
