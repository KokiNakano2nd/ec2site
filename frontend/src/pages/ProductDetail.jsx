import { useEffect, useState } from "react";
import { addToCart } from "../api/cart";
import { fetchProductById } from "../api/products";
import { useAuth } from "../AuthContext";
import { ErrorBanner } from "../components/ErrorBanner";
import { RecommendationsSection } from "../components/RecommendationsSection";
import { ReviewsSection } from "../components/ReviewsSection";
import { C } from "../lib/constants";
import { fmt } from "../lib/format";

export function ProductDetail({ productId, onBack, onNavigateLogin, showToast, favProductIds = new Set(), onToggleFav, onSelect }) {
  const { token } = useAuth();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    setActiveImageIdx(0);
    fetchProductById(productId).then(setProduct).catch((err) => setError(err.message));
  }, [productId]);

  async function handleAddToCart() {
    setMessage(null);
    if (!token) { onNavigateLogin(); return; }
    try {
      await addToCart(token, productId, quantity);
      setMessage("カートに追加しました");
      if (showToast) showToast("カートに追加しました");
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (error) return (
    <ErrorBanner style={{ marginBottom: 0 }}>エラー: {error}</ErrorBanner>
  );
  if (!product) return <p style={{ color: C.muted, fontSize: 14 }}>読み込み中...</p>;

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <button className="btn-back" onClick={onBack} style={{ marginBottom: 32 }}>← 商品一覧に戻る</button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start" }}>
        <div>
          {(() => {
            const gallery = [
              ...(product.image_url ? [product.image_url] : []),
              ...(product.images || []).map((img) => img.image_url),
            ];
            const src = gallery[activeImageIdx] || product.image_url;
            return (
              <>
                <div style={{
                  background: C.dark, border: `1px solid ${C.border}`, borderRadius: 20,
                  aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <img src={src} alt={product.name} style={{ width: "60%", height: "60%", objectFit: "contain" }} />
                </div>
                {gallery.length > 1 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {gallery.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImageIdx(i)}
                        style={{
                          width: 64, height: 64, background: C.dark,
                          border: `2px solid ${i === activeImageIdx ? C.accent : C.border}`,
                          borderRadius: 10, padding: 4, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <img src={url} alt={`view ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
        <div style={{ paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ display: "inline-block", background: "rgba(91,139,245,0.12)", color: C.accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", padding: "4px 10px", borderRadius: 6 }}>電子機器</span>
            <button
              onClick={() => onToggleFav && onToggleFav(productId)}
              style={{
                background: favProductIds.has(productId) ? "rgba(255,80,100,0.12)" : "rgba(255,255,255,0.05)",
                border: favProductIds.has(productId) ? "1px solid rgba(255,80,100,0.3)" : `1px solid ${C.border}`,
                borderRadius: 10, padding: "8px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: favProductIds.has(productId) ? "#ff6b6b" : C.sec,
                fontWeight: 600, transition: "all 0.15s",
              }}
            >
              {favProductIds.has(productId) ? "❤️ お気に入り済み" : "🤍 お気に入りに追加"}
            </button>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: C.text, lineHeight: 1.25, letterSpacing: "-0.8px", marginBottom: 14 }}>{product.name}</h1>
          <p style={{ color: C.sec, fontSize: 15, lineHeight: 1.65, marginBottom: 28 }}>{product.description}</p>
          <div style={{ padding: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 28 }}>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-1.5px", color: C.text, marginBottom: 4 }}>¥{fmt(product.price)}</div>
            {product.stock === 0 ? (
              <div style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>在庫切れ</div>
            ) : (
              <div style={{ fontSize: 13, color: C.muted }}>
                在庫残り<span style={{ color: product.stock <= 7 ? C.red : C.text, fontWeight: 600, marginLeft: 4 }}>{product.stock}個</span>
                {product.stock <= 7 && <span style={{ color: C.red, marginLeft: 6, fontSize: 11 }}>（残りわずか）</span>}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", background: C.surface, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, overflow: "hidden", opacity: product.stock === 0 ? 0.4 : 1 }}>
              <button className="qty-btn" disabled={product.stock === 0} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
              <span style={{ minWidth: 44, textAlign: "center", fontSize: 16, fontWeight: 700, color: C.text }}>{quantity}</span>
              <button className="qty-btn" disabled={product.stock === 0} onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}>+</button>
            </div>
            <button
              className="btn-add-cart"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              style={product.stock === 0 ? { opacity: 0.4, cursor: "not-allowed", background: C.muted } : {}}
            >
              {product.stock === 0 ? "在庫切れ" : "カートに入れる"}
            </button>
          </div>
          {message && (
            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "12px 16px", color: C.green, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              ✓ {message}
            </div>
          )}
        </div>
      </div>
      <RecommendationsSection productId={productId} onSelect={onSelect} favProductIds={favProductIds} onToggleFav={onToggleFav} />
      <ReviewsSection productId={productId} onNavigateLogin={onNavigateLogin} showToast={showToast} />
    </div>
  );
}
