import { useEffect, useState } from "react";
import { fetchAdminOrders, resolveOrderReturn, updateOrderStatus } from "../api/admin";
import { useAuth } from "../AuthContext";
import { C, ORDER_STATUSES } from "../lib/constants";
import { fmt, fmtDate, statusConfig } from "../lib/format";

export function AdminOrdersView({ showToast }) {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminOrders(token).then(setOrders).catch((err) => setError(err.message));
  }, [token]);

  async function handleStatusChange(orderId, newStatus) {
    try {
      const updated = await updateOrderStatus(token, orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...updated, user_email: o.user_email } : o)));
      if (showToast) showToast("ステータスを更新しました");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReturnResolve(orderId, action) {
    try {
      const updated = await resolveOrderReturn(token, orderId, action);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...updated, user_email: o.user_email } : o)));
      if (showToast) showToast(action === "approve" ? "返品を承認しました" : "返品を却下しました");
    } catch (err) {
      setError(err.message);
    }
  }

  const totalSales = orders.reduce((s, o) => s + o.total_price, 0);
  const avgOrder = orders.length ? totalSales / orders.length : 0;

  const StatCard = ({ label, value }) => (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
      <p style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color: C.text }}>{value}</p>
    </div>
  );

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 6 }}>管理者パネル</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.6px", color: C.text }}>全注文一覧</h1>
      </div>
      {error && (
        <div style={{ color: C.red, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 12, padding: "16px 20px", fontSize: 14, marginBottom: 20 }}>
          {error}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard label="総注文数" value={<>{orders.length}<span style={{ fontSize: 14, color: C.muted, fontWeight: 400, marginLeft: 4 }}>件</span></>} />
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>総売上</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: C.accent }}>¥{fmt(totalSales)}</p>
        </div>
        <StatCard label="平均注文額" value={`¥${fmt(avgOrder)}`} />
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${C.border}` }}>
              {["注文ID", "注文者", "注文日時", "ステータス", "合計", "返品対応"].map((h, i) => (
                <th key={h} style={{ textAlign: i === 3 || i === 5 ? "center" : i === 4 ? "right" : "left", padding: "14px 20px", fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const s = statusConfig(order.status);
              return (
                <tr key={order.id} className="admin-row" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <td style={{ padding: "15px 20px", fontSize: 13, fontWeight: 700, color: C.accent }}>#{order.id}</td>
                  <td style={{ padding: "15px 20px", fontSize: 13, color: C.sec }}>{order.user_email}</td>
                  <td style={{ padding: "15px 20px", fontSize: 13, color: C.muted }}>{fmtDate(order.created_at)}</td>
                  <td style={{ padding: "15px 20px", textAlign: "center" }}>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      style={{
                        background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                        fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 20,
                        cursor: "pointer", appearance: "none", textAlign: "center",
                      }}
                    >
                      {ORDER_STATUSES.map((st) => (
                        <option key={st.value} value={st.value} style={{ background: C.surface, color: C.text }}>{st.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "15px 20px", textAlign: "right", fontSize: 15, fontWeight: 700, color: C.text }}>¥{fmt(order.total_price)}</td>
                  <td style={{ padding: "15px 20px", textAlign: "center" }}>
                    {order.status === "return_requested" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                        {order.return_reason && (
                          <span style={{ fontSize: 11, color: C.muted, maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{order.return_reason}</span>
                        )}
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleReturnResolve(order.id, "approve")}
                            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: C.green, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, cursor: "pointer" }}
                          >承認</button>
                          <button
                            onClick={() => handleReturnResolve(order.id, "reject")}
                            style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", color: C.red, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, cursor: "pointer" }}
                          >却下</button>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: C.muted }}>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
