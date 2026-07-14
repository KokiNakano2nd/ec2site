import { useEffect, useState } from "react";
import { fetchRecommendations } from "../api/products";
import { C } from "../lib/constants";
import { fmt } from "../lib/format";

export function RecommendationsSection({ productId, onSelect, favProductIds = new Set(), onToggleFav }) {
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecommendations(productId, { signal: controller.signal })
      .then(setRecs)
      .catch((error) => {
        if (error.name !== "AbortError") setRecs([]);
      });
    return () => controller.abort();
  }, [productId]);

  if (recs.length === 0) return null;

  return (
    <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${C.border}` }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 20 }}>この商品と同じカテゴリの商品</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {recs.map((product) => {
          const isOutOfStock = product.stock === 0;
          return (
            <div
              key={product.id}
              className="product-card"
              onClick={() => onSelect(product.id)}
              style={{ cursor: isOutOfStock ? "default" : "pointer", opacity: isOutOfStock ? 0.55 : 1 }}
            >
              <div style={{ background: C.dark, aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <img src={product.image_url} alt={product.name} loading="lazy" style={{ width: "55%", height: "55%", objectFit: "contain", opacity: 0.9 }} />
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFav && onToggleFav(product.id); }}
                  style={{ position: "absolute", top: 8, left: 8, background: "rgba(9,9,15,0.6)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, backdropFilter: "blur(8px)" }}
                >{favProductIds.has(product.id) ? "❤️" : "🤍"}</button>
                {isOutOfStock && (
                  <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(124,133,168,0.15)", border: "1px solid rgba(124,133,168,0.3)", color: C.muted, fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>在庫切れ</span>
                )}
              </div>
              <div style={{ padding: 14 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</h3>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>¥{fmt(product.price)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
