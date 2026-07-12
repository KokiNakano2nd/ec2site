import { useEffect, useState } from "react";
import { createAdminCoupon, deleteAdminCoupon, fetchAdminCoupons, toggleAdminCoupon, updateAdminCoupon } from "../api/coupons";
import { useAuth } from "../AuthContext";
import { FieldLabel } from "../components/FieldLabel";
import { C } from "../lib/constants";
import { fmt, fmtDate } from "../lib/format";

export function AdminCouponsView({ showToast }) {
  const { token } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const emptyForm = { code: "", discount_type: "percentage", discount_value: "", max_uses: "", low_remaining_uses_threshold: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchAdminCoupons(token).then(setCoupons).catch((err) => setError(err.message));
  }, [token]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      const created = await createAdminCoupon(token, {
        code: form.code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        low_remaining_uses_threshold: form.low_remaining_uses_threshold ? Number(form.low_remaining_uses_threshold) : null,
      });
      setCoupons((prev) => [created, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      if (showToast) showToast("クーポンを作成しました");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggle(couponId) {
    try {
      const updated = await toggleAdminCoupon(token, couponId);
      setCoupons((prev) => prev.map((c) => (c.id === couponId ? updated : c)));
      if (showToast) showToast("クーポンを更新しました");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleThresholdChange(couponId, value) {
    try {
      const updated = await updateAdminCoupon(token, couponId, {
        low_remaining_uses_threshold: value === "" ? null : Number(value),
      });
      setCoupons((prev) => prev.map((c) => (c.id === couponId ? updated : c)));
    } catch (err) {
      setError(err.message);
    }
  }

  function isLowRemainingUses(coupon) {
    return (
      coupon.max_uses != null &&
      coupon.low_remaining_uses_threshold != null &&
      coupon.max_uses - coupon.used_count <= coupon.low_remaining_uses_threshold
    );
  }

  async function handleDelete(couponId) {
    try {
      await deleteAdminCoupon(token, couponId);
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
      if (showToast) showToast("クーポンを削除しました");
    } catch (err) {
      setError(err.message);
    }
  }

  const inputStyle = { width: "100%", background: "#0d0f1f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#e8eaf6", fontSize: 13, padding: "6px 10px", height: 36 };

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 6 }}>管理者パネル</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.6px", color: C.text }}>クーポン管理</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)} style={{ padding: "10px 20px", fontSize: 14, display: "flex", alignItems: "center", gap: 6, borderRadius: 10 }}>
          {showForm ? "× キャンセル" : "+ クーポンを作成"}
        </button>
      </div>

      {error && (
        <div style={{ color: C.red, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 12, padding: "16px 20px", fontSize: 14, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24, animation: "fadeUp 0.2s ease" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>新規クーポン</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <FieldLabel>コード（大文字英数字）</FieldLabel>
              <input style={inputStyle} placeholder="SUMMER10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
            </div>
            <div>
              <FieldLabel>割引タイプ</FieldLabel>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                <option value="percentage">パーセント割引（%）</option>
                <option value="fixed">固定額割引（円）</option>
              </select>
            </div>
            <div>
              <FieldLabel>{form.discount_type === "percentage" ? "割引率（%）" : "割引額（円）"}</FieldLabel>
              <input style={inputStyle} type="number" min="1" placeholder={form.discount_type === "percentage" ? "10" : "500"} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} required />
            </div>
            <div>
              <FieldLabel>最大使用回数（空欄＝無制限）</FieldLabel>
              <input style={inputStyle} type="number" min="1" placeholder="100" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
            </div>
            <div>
              <FieldLabel>残数アラートしきい値（空欄＝未設定）</FieldLabel>
              <input style={inputStyle} type="number" min="0" placeholder="未設定" value={form.low_remaining_uses_threshold} onChange={(e) => setForm({ ...form, low_remaining_uses_threshold: e.target.value })} />
            </div>
          </div>
          <button className="btn-primary" type="submit" style={{ padding: "10px 24px", fontSize: 14, borderRadius: 10 }}>作成する</button>
        </form>
      )}

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${C.border}` }}>
              {["コード", "割引内容", "使用回数", "残数アラートしきい値", "ステータス", "作成日", "操作"].map((h, i) => (
                <th key={h} style={{ textAlign: i >= 2 ? "center" : "left", padding: "14px 20px", fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="admin-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "15px 20px" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: C.accent, background: "rgba(91,139,245,0.1)", padding: "4px 10px", borderRadius: 6 }}>{coupon.code}</span>
                </td>
                <td style={{ padding: "15px 20px", fontSize: 13, color: C.text }}>
                  {coupon.discount_type === "percentage" ? `${coupon.discount_value}% OFF` : `¥${fmt(coupon.discount_value)} OFF`}
                </td>
                <td style={{ padding: "15px 20px", textAlign: "center", fontSize: 13, color: isLowRemainingUses(coupon) ? C.red : C.sec }}>
                  {coupon.used_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                  {isLowRemainingUses(coupon) && (
                    <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: C.red, background: "rgba(255,107,107,0.12)", borderRadius: 6, padding: "2px 6px" }}>残数僅少</span>
                  )}
                </td>
                <td style={{ padding: "15px 20px", textAlign: "center" }}>
                  <input
                    type="number"
                    min="0"
                    placeholder="未設定"
                    defaultValue={coupon.low_remaining_uses_threshold ?? ""}
                    onBlur={(e) => handleThresholdChange(coupon.id, e.target.value)}
                    style={{ ...inputStyle, width: 90, textAlign: "center" }}
                  />
                </td>
                <td style={{ padding: "15px 20px", textAlign: "center" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                    background: coupon.is_active ? "rgba(34,197,94,0.1)" : "rgba(124,133,168,0.1)",
                    border: coupon.is_active ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(124,133,168,0.2)",
                    color: coupon.is_active ? C.green : C.muted,
                  }}>
                    {coupon.is_active ? "有効" : "無効"}
                  </span>
                </td>
                <td style={{ padding: "15px 20px", textAlign: "center", fontSize: 12, color: C.muted }}>{fmtDate(coupon.created_at)}</td>
                <td style={{ padding: "15px 20px", textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                    <button className="btn-surface" onClick={() => handleToggle(coupon.id)} style={{ padding: "7px 14px", fontSize: 13 }}>
                      {coupon.is_active ? "無効化" : "有効化"}
                    </button>
                    <button className="btn-danger" onClick={() => handleDelete(coupon.id)} style={{ padding: "7px 14px", fontSize: 13 }}>削除</button>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 20px", color: C.muted, fontSize: 14 }}>クーポンがありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
