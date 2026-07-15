import { C } from "../lib/constants";
import { fmt } from "../lib/format";
import { FieldLabel } from "./FieldLabel";

export function CouponBox({
  couponInput,
  onCouponInputChange,
  appliedCoupon,
  onApply,
  onRemove,
  couponError,
  couponLoading,
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <FieldLabel>クーポンコード</FieldLabel>
      {appliedCoupon ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <span style={{ fontSize: 12, color: C.green, fontWeight: 700, flex: 1 }}>
            ✓ {appliedCoupon.code}（
            {appliedCoupon.discount_type === "percentage"
              ? `${appliedCoupon.discount_value}%OFF`
              : `¥${fmt(appliedCoupon.discount_value)}OFF`}
            ）
          </span>
          <button
            onClick={onRemove}
            style={{
              background: "none",
              border: "none",
              color: C.muted,
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="field-input"
            style={{ flex: 1, fontSize: 13, padding: "8px 12px" }}
            placeholder="コードを入力"
            value={couponInput}
            onChange={onCouponInputChange}
            onKeyDown={(e) => e.key === "Enter" && onApply()}
          />
          <button
            className="btn-surface"
            onClick={onApply}
            disabled={couponLoading || !couponInput.trim()}
            style={{ padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap" }}
          >
            {couponLoading ? "..." : "適用"}
          </button>
        </div>
      )}
      {couponError && <p style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{couponError}</p>}
    </div>
  );
}
