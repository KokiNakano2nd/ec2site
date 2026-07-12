import { useEffect, useState } from "react";
import { fetchAddresses } from "../api/addresses";
import { fetchCart, removeCartItem, updateCartItem } from "../api/cart";
import { validateCoupon } from "../api/coupons";
import { createOrder } from "../api/orders";
import { createCheckoutSession, fetchConfig } from "../api/payment";
import { useAuth } from "../AuthContext";
import { FieldLabel } from "../components/FieldLabel";
import { C } from "../lib/constants";
import { fmt } from "../lib/format";

export function CartView({ onOrderComplete, showToast }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    fetchCart(token).then(setItems).catch((err) => setError(err.message));
    fetchAddresses(token).then((addrs) => {
      setAddresses(addrs);
      const def = addrs.find((a) => a.is_default);
      if (def) setSelectedAddressId(def.id);
    }).catch(() => {});
    fetchConfig().then((cfg) => setStripeEnabled(cfg.stripe_enabled)).catch(() => {});
  }, [token]);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponError(null);
    setCouponLoading(true);
    try {
      const coupon = await validateCoupon(couponInput.trim().toUpperCase());
      setAppliedCoupon(coupon);
      if (showToast) showToast("クーポンを適用しました");
    } catch (err) {
      setCouponError(err.message);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  async function handlePlaceOrder() {
    setError(null);
    setPlacing(true);
    try {
      await createOrder(token, appliedCoupon ? appliedCoupon.code : null);
      setItems([]);
      setAppliedCoupon(null);
      setCouponInput("");
      if (showToast) showToast("ご注文ありがとうございます！");
      onOrderComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  async function handleStripeCheckout() {
    setError(null);
    setStripeLoading(true);
    try {
      const { session_url } = await createCheckoutSession(token, appliedCoupon ? appliedCoupon.code : null);
      window.location.href = session_url;
    } catch (err) {
      setError(err.message);
      setStripeLoading(false);
    }
  }

  async function handleQuantityChange(cartId, quantity) {
    try {
      const updated = await updateCartItem(token, cartId, quantity);
      setItems((prev) => prev.map((item) => (item.id === cartId ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(cartId) {
    try {
      await removeCartItem(token, cartId);
      setItems((prev) => prev.filter((item) => item.id !== cartId));
    } catch (err) {
      setError(err.message);
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? subtotal * appliedCoupon.discount_value / 100
      : Math.min(appliedCoupon.discount_value, subtotal)
    : 0;
  const discountedSubtotal = subtotal - discountAmount;
  const tax = discountedSubtotal * 0.1;
  const grandTotal = discountedSubtotal + tax;

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", color: C.text, marginBottom: 32 }}>ショッピングカート</h1>
      {error && (
        <div style={{ color: C.red, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 12, padding: "16px 20px", fontSize: 14, marginBottom: 20 }}>
          {error}
        </div>
      )}
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "100px 40px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 }}>
          <div style={{ fontSize: 56, marginBottom: 20, opacity: 0.5 }}>🛒</div>
          <p style={{ color: C.muted, fontSize: 16, marginBottom: 24 }}>カートに商品がありません</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ width: 76, height: 76, background: C.dark, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <img src={item.product.image_url} alt={item.product.name} loading="lazy" style={{ width: 56, height: 56, objectFit: "contain" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.product.name}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                    ¥{fmt(item.product.price)}<span style={{ fontSize: 12, color: C.muted, fontWeight: 400, marginLeft: 4 }}>/ 個</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", background: C.dark, border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 9, overflow: "hidden" }}>
                  <button className="qty-btn-sm" onClick={() => item.quantity > 1 && handleQuantityChange(item.id, item.quantity - 1)}>−</button>
                  <span style={{ padding: "0 10px", fontSize: 14, fontWeight: 600, color: C.text }}>{item.quantity}</span>
                  <button className="qty-btn-sm" onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>+</button>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, minWidth: 88, textAlign: "right" }}>¥{fmt(item.product.price * item.quantity)}</div>
                <button className="btn-remove" onClick={() => handleRemove(item.id)}>×</button>
              </div>
            ))}
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, position: "sticky", top: 88 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 20, letterSpacing: "-0.2px" }}>注文サマリー</h2>

            <div style={{ marginBottom: 16 }}>
              <FieldLabel>クーポンコード</FieldLabel>
              {appliedCoupon ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                  <span style={{ fontSize: 12, color: C.green, fontWeight: 700, flex: 1 }}>
                    ✓ {appliedCoupon.code}（{appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%OFF` : `¥${fmt(appliedCoupon.discount_value)}OFF`}）
                  </span>
                  <button onClick={handleRemoveCoupon} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="field-input"
                    style={{ flex: 1, fontSize: 13, padding: "8px 12px" }}
                    placeholder="コードを入力"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value); setCouponError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  />
                  <button
                    className="btn-surface"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    style={{ padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap" }}
                  >{couponLoading ? "..." : "適用"}</button>
                </div>
              )}
              {couponError && <p style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{couponError}</p>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ color: C.muted }}>小計</span><span style={{ color: C.text }}>¥{fmt(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: C.green }}>割引</span>
                  <span style={{ color: C.green, fontWeight: 600 }}>−¥{fmt(discountAmount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ color: C.muted }}>送料</span><span style={{ color: C.green, fontWeight: 600 }}>無料</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ color: C.muted }}>消費税（10%）</span><span style={{ color: C.text }}>¥{fmt(tax)}</span>
              </div>
            </div>
            <div style={{ borderTop: `1px solid rgba(255,255,255,0.07)`, paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
              <span style={{ fontSize: 14, color: C.muted }}>合計（税込）</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>¥{fmt(grandTotal)}</span>
            </div>
            {addresses.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <FieldLabel>配送先</FieldLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                        background: selectedAddressId === addr.id ? "rgba(91,139,245,0.08)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${selectedAddressId === addr.id ? "rgba(91,139,245,0.3)" : C.border}`,
                        borderRadius: 10, padding: "10px 12px",
                      }}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        style={{ marginTop: 2, accentColor: C.accent }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{addr.name}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          〒{addr.postal_code} {addr.prefecture}{addr.city}{addr.address_line1}
                          {addr.address_line2 && ` ${addr.address_line2}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button className="btn-order" onClick={handlePlaceOrder} disabled={placing} style={{ marginBottom: 10 }}>
              {placing ? "処理中..." : "注文を確定する →"}
            </button>
            {stripeEnabled && (
              <button
                onClick={handleStripeCheckout}
                disabled={stripeLoading}
                style={{
                  width: "100%", height: 50, background: "#6772e5", border: "none",
                  color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 700,
                  cursor: stripeLoading ? "not-allowed" : "pointer", opacity: stripeLoading ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {stripeLoading ? "処理中..." : "💳 カードで決済 (Stripe)"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
