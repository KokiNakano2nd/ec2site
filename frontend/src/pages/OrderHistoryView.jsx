import { useEffect, useState } from "react";
import { cancelOrder, fetchOrders, requestOrderReturn } from "../api/orders";
import { useAuth } from "../AuthContext";
import { ErrorBanner } from "../components/ErrorBanner";
import { C } from "../lib/constants";
import { fmt, fmtDate, statusConfig } from "../lib/format";

export function OrderHistoryView() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [returnReasons, setReturnReasons] = useState({});
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchOrders(token).then(setOrders).catch((err) => setError(err.message));
  }, [token]);

  async function handleCancel(orderId) {
    setError(null);
    setBusyId(orderId);
    try {
      const updated = await cancelOrder(token, orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReturnRequest(orderId) {
    setError(null);
    setBusyId(orderId);
    try {
      const updated = await requestOrderReturn(token, orderId, returnReasons[orderId] || "");
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", color: C.text, marginBottom: 8 }}>注文履歴</h1>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>
        {orders.length > 0 ? `${orders.length}件の注文` : "注文履歴はありません"}
      </p>
      {error && (
        <ErrorBanner>{error}</ErrorBanner>
      )}
      {orders.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "80px 40px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 }}>
          <p style={{ color: C.muted, fontSize: 15 }}>注文履歴がありません</p>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {orders.map((order) => (
          <div key={order.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
              <div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{fmtDate(order.created_at)}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>注文 #{order.id}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {(() => { const s = statusConfig(order.status); return (
                  <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, letterSpacing: "0.3px" }}>{s.label}</span>
                ); })()}
                <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: C.text }}>¥{fmt(order.total_price)}</span>
              </div>
            </div>
            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
              {order.items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                  <span style={{ color: C.sec }}>
                    {item.product.name}<span style={{ color: C.muted, marginLeft: 6 }}>× {item.quantity}</span>
                  </span>
                  <span style={{ color: C.text, fontWeight: 600 }}>¥{fmt(item.price * item.quantity)}</span>
                </div>
              ))}
              {(order.status === "return_requested" || order.status === "returned") && order.return_reason && (
                <div style={{ marginTop: 4, fontSize: 13, color: C.muted }}>返品理由: {order.return_reason}</div>
              )}
              {(order.status === "pending" || order.status === "processing") && (
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={busyId === order.id}
                    style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", color: C.red, fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 10, cursor: "pointer" }}
                  >
                    {busyId === order.id ? "処理中..." : "キャンセルする"}
                  </button>
                </div>
              )}
              {order.status === "shipped" && (
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="返品理由（任意）"
                    value={returnReasons[order.id] || ""}
                    onChange={(e) => setReturnReasons((prev) => ({ ...prev, [order.id]: e.target.value }))}
                    style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", color: C.text, fontSize: 13 }}
                  />
                  <button
                    onClick={() => handleReturnRequest(order.id)}
                    disabled={busyId === order.id}
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b", fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    {busyId === order.id ? "処理中..." : "返品を申請する"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
