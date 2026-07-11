import { useEffect, useRef, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchProducts, fetchProductById, fetchRecommendations, addProductImage, deleteProductImage } from "./api/products";
import { register, deleteAccount } from "./api/auth";
import { fetchCart, addToCart, updateCartItem, removeCartItem } from "./api/cart";
import { createOrder, fetchOrders } from "./api/orders";
import { createProduct, updateProduct, deleteProduct, fetchAdminOrders, updateOrderStatus } from "./api/admin";
import { fetchFavorites, addFavorite, removeFavorite } from "./api/favorites";
import { fetchReviews, postReview } from "./api/reviews";
import { validateCoupon, fetchAdminCoupons, createAdminCoupon, toggleAdminCoupon, deleteAdminCoupon } from "./api/coupons";
import { fetchAnalyticsSummary, fetchSalesByDate, fetchTopProducts, fetchCategorySales } from "./api/analytics";
import { fetchAddresses, createAddress, deleteAddress, setDefaultAddress } from "./api/addresses";
import { fetchConfig, createCheckoutSession, completePayment } from "./api/payment";
import { AuthProvider, useAuth } from "./AuthContext";

const C = {
  bg: "#09090f",
  surface: "#111422",
  dark: "#0d0f1f",
  text: "#e8eaf6",
  sec: "#7c85a8",
  muted: "#4a5270",
  border: "rgba(255,255,255,0.06)",
  accent: "#5b8bf5",
  green: "#22c55e",
  red: "#ff6b6b",
};

const ORDER_STATUSES = [
  { value: "pending",    label: "受付中",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)" },
  { value: "processing", label: "処理中",   color: "#5b8bf5", bg: "rgba(91,139,245,0.1)",  border: "rgba(91,139,245,0.2)" },
  { value: "shipped",    label: "発送済み", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.2)" },
  { value: "completed",  label: "完了",     color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.2)" },
];

function statusConfig(value) {
  return ORDER_STATUSES.find((s) => s.value === value) ?? { label: value, color: "#7c85a8", bg: "rgba(124,133,168,0.1)", border: "rgba(124,133,168,0.2)" };
}

function fmt(n) {
  return Math.round(n).toLocaleString("ja-JP");
}

function fmtDate(s) {
  return new Date(s).toLocaleString("ja-JP", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StarRating({ value, onChange, readonly = false, size = 18 }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          style={{
            fontSize: size,
            cursor: readonly ? "default" : "pointer",
            color: star <= active ? "#f59e0b" : "rgba(255,255,255,0.15)",
            transition: "color 0.1s",
            lineHeight: 1,
          }}
        >★</span>
      ))}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sec, marginBottom: 7, letterSpacing: "0.3px" }}>
      {children}
    </label>
  );
}

function Header({ onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 200, height: 64,
      background: "rgba(9,9,15,0.85)", backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        maxWidth: 1320, margin: "0 auto", padding: "0 32px",
        height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <span
            onClick={() => onNavigate("products")}
            style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.5px", cursor: "pointer", color: C.text, display: "flex", alignItems: "center", gap: 8 }}
          >
            <span style={{
              width: 28, height: 28, background: "linear-gradient(135deg,#5b8bf5,#8b5cf6)",
              borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>⚡</span>
            TechStore
          </span>
          {user && (
            <nav style={{ display: "flex", gap: 4 }}>
              <button className="btn-ghost" onClick={() => onNavigate("products")} style={{ padding: "6px 12px", fontSize: 14 }}>商品一覧</button>
              <button className="btn-ghost" onClick={() => onNavigate("favorites")} style={{ padding: "6px 12px", fontSize: 14 }}>♡ お気に入り</button>
              <button className="btn-ghost" onClick={() => onNavigate("orders")} style={{ padding: "6px 12px", fontSize: 14 }}>注文履歴</button>
              <button className="btn-ghost" onClick={() => onNavigate("profile")} style={{ padding: "6px 12px", fontSize: 14 }}>プロフィール</button>
              {user.is_admin && (
                <>
                  <button className="btn-ghost" onClick={() => onNavigate("admin-dashboard")} style={{ padding: "6px 12px", fontSize: 14 }}>ダッシュボード</button>
                  <button className="btn-ghost" onClick={() => onNavigate("admin-products")} style={{ padding: "6px 12px", fontSize: 14 }}>商品管理</button>
                  <button className="btn-ghost" onClick={() => onNavigate("admin-orders")} style={{ padding: "6px 12px", fontSize: 14 }}>注文管理</button>
                  <button className="btn-ghost" onClick={() => onNavigate("admin-coupons")} style={{ padding: "6px 12px", fontSize: 14 }}>クーポン</button>
                </>
              )}
            </nav>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!user ? (
            <>
              <button className="btn-ghost" onClick={() => onNavigate("login")} style={{ padding: "8px 16px", fontSize: 14 }}>ログイン</button>
              <button className="btn-primary" onClick={() => onNavigate("register")} style={{ padding: "8px 18px", fontSize: 14 }}>新規登録</button>
            </>
          ) : (
            <>
              <button className="cart-btn" onClick={() => onNavigate("cart")} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 500 }}>
                <span style={{ fontSize: 16 }}>🛒</span> カート
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 4 }}>
                <div style={{
                  width: 32, height: 32, background: "linear-gradient(135deg,#5b8bf5,#8b5cf6)",
                  borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: "#fff",
                }}>{user.email[0].toUpperCase()}</div>
                <button className="btn-logout" onClick={logout}>ログアウト</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const PAGE_SIZE = 6;

function SkeletonCard() {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div className="skeleton" style={{ aspectRatio: "4/3" }} />
      <div style={{ padding: 18 }}>
        <div className="skeleton" style={{ height: 16, width: "70%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: "90%", marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 24, width: "40%" }} />
      </div>
    </div>
  );
}

function ProductList({ onSelect, favProductIds = new Set(), onToggleFav }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetchProducts().then(setProducts).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (error) return (
    <div style={{ color: C.red, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 12, padding: "16px 20px", fontSize: 14 }}>
      エラー: {error}
    </div>
  );

  if (loading) return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 14, width: 120, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 36, width: 280 }} />
      </div>
      <div className="skeleton" style={{ height: 46, marginBottom: 28, borderRadius: 11 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  const q = searchQuery.toLowerCase();
  const filtered = q
    ? products.filter((p) => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q))
    : products;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: C.accent, textTransform: "uppercase", marginBottom: 8 }}>すべての商品</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1px", color: C.text }}>ガジェット &amp; 電子機器</h1>
        </div>
        <p style={{ color: C.muted, fontSize: 14 }}>{filtered.length}件の商品</p>
      </div>

      <div style={{ position: "relative", marginBottom: 28 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: C.muted, pointerEvents: "none" }}>🔍</span>
        <input
          className="field-input"
          style={{ paddingLeft: 42 }}
          type="text"
          placeholder="商品名・説明で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {paged.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 40px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 }}>
          <p style={{ color: C.muted, fontSize: 15 }}>「{searchQuery}」に一致する商品が見つかりませんでした</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {paged.map((product) => {
            const isOutOfStock = product.stock === 0;
            return (
              <div
                key={product.id}
                className="product-card"
                onClick={() => onSelect(product.id)}
                style={isOutOfStock ? { opacity: 0.55, cursor: "default" } : {}}
              >
                <div style={{ background: C.dark, aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <img src={product.image_url} alt={product.name} loading="lazy" style={{ width: "55%", height: "55%", objectFit: "contain", opacity: 0.9 }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFav && onToggleFav(product.id); }}
                    style={{
                      position: "absolute", top: 10, left: 10,
                      background: "rgba(9,9,15,0.6)", border: "none",
                      borderRadius: "50%", width: 32, height: 32,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", fontSize: 16, lineHeight: 1,
                      backdropFilter: "blur(8px)",
                    }}
                  >{favProductIds.has(product.id) ? "❤️" : "🤍"}</button>
                  {isOutOfStock ? (
                    <span style={{
                      position: "absolute", top: 10, right: 10,
                      background: "rgba(124,133,168,0.15)", border: "1px solid rgba(124,133,168,0.3)",
                      color: C.muted, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                    }}>在庫切れ</span>
                  ) : product.stock <= 7 && (
                    <span style={{
                      position: "absolute", top: 10, right: 10,
                      background: "rgba(255,107,107,0.15)", border: "1px solid rgba(255,107,107,0.3)",
                      color: C.red, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                    }}>残りわずか</span>
                  )}
                </div>
                <div style={{ padding: 18 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</h3>
                  <p style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.description}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>¥{fmt(product.price)}</span>
                    <span style={{
                      fontSize: 11, padding: "4px 9px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.05)",
                      background: "rgba(255,255,255,0.04)",
                      color: isOutOfStock ? C.muted : C.muted,
                    }}>
                      {isOutOfStock ? "在庫なし" : `在庫 ${product.stock}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 36 }}>
          <button
            className="btn-surface"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: "8px 16px", fontSize: 14, opacity: currentPage === 1 ? 0.4 : 1 }}
          >← 前へ</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                width: 36, height: 36, borderRadius: 8, fontSize: 14, fontWeight: 600, border: "none",
                background: page === currentPage ? C.accent : "rgba(255,255,255,0.06)",
                color: page === currentPage ? "#fff" : C.sec,
                cursor: "pointer",
              }}
            >{page}</button>
          ))}
          <button
            className="btn-surface"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: "8px 16px", fontSize: 14, opacity: currentPage === totalPages ? 0.4 : 1 }}
          >次へ →</button>
        </div>
      )}
    </div>
  );
}

function RecommendationsSection({ productId, onSelect, favProductIds = new Set(), onToggleFav }) {
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    fetchRecommendations(productId).then(setRecs).catch(() => {});
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

function ReviewsSection({ productId, onNavigateLogin, showToast }) {
  const { token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReviews(productId).then(setReviews).catch(() => {});
  }, [productId]);

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) { onNavigateLogin(); return; }
    setError(null);
    setSubmitting(true);
    try {
      const newReview = await postReview(token, productId, rating, comment);
      setReviews((prev) => [newReview, ...prev]);
      setComment("");
      setRating(5);
      if (showToast) showToast("レビューを投稿しました");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>カスタマーレビュー</h2>
        {avgRating ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StarRating value={Math.round(avgRating)} readonly size={16} />
            <span style={{ fontSize: 13, color: C.sec }}>{avgRating.toFixed(1)} ({reviews.length}件)</span>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: C.muted }}>まだレビューはありません</span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "start" }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 20 }}>レビューを投稿する</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <FieldLabel>評価</FieldLabel>
              <StarRating value={rating} onChange={setRating} size={24} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <FieldLabel>コメント（任意）</FieldLabel>
              <textarea
                className="field-input"
                rows={3}
                style={{ resize: "vertical", minHeight: 80 }}
                placeholder="この商品の感想を書いてください"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            {error && (
              <div style={{ color: C.red, fontSize: 13, marginBottom: 12, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 8, padding: "10px 14px" }}>
                {error}
              </div>
            )}
            <button className="btn-primary" type="submit" disabled={submitting} style={{ padding: "10px 24px", fontSize: 14, borderRadius: 10 }}>
              {submitting ? "送信中..." : token ? "投稿する" : "ログインして投稿"}
            </button>
          </form>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted, fontSize: 14 }}>
              レビューがまだありません。最初のレビューを投稿しましょう！
            </div>
          )}
          {reviews.map((review) => (
            <div key={review.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "linear-gradient(135deg,#5b8bf5,#8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: "#fff",
                  }}>{(review.user_email || "?")[0].toUpperCase()}</div>
                  <span style={{ fontSize: 13, color: C.sec }}>{review.user_email}</span>
                </div>
                <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(review.created_at)}</span>
              </div>
              <StarRating value={review.rating} readonly size={14} />
              {review.comment && (
                <p style={{ fontSize: 14, color: C.text, marginTop: 8, lineHeight: 1.6 }}>{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductDetail({ productId, onBack, onNavigateLogin, showToast, favProductIds = new Set(), onToggleFav, onSelect }) {
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
    <div style={{ color: C.red, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 12, padding: "16px 20px", fontSize: 14 }}>
      エラー: {error}
    </div>
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

function FavoritesView({ favItems, onToggleFav, onSelect }) {
  if (favItems.length === 0) {
    return (
      <div style={{ animation: "fadeUp 0.3s ease" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", color: C.text, marginBottom: 8 }}>お気に入り</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>お気に入りに追加した商品が表示されます</p>
        <div style={{ textAlign: "center", padding: "100px 40px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 }}>
          <div style={{ fontSize: 56, marginBottom: 20, opacity: 0.5 }}>♡</div>
          <p style={{ color: C.muted, fontSize: 16 }}>お気に入りに追加した商品はありません</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: C.accent, textTransform: "uppercase", marginBottom: 8 }}>ウィッシュリスト</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1px", color: C.text }}>お気に入り</h1>
        </div>
        <p style={{ color: C.muted, fontSize: 14 }}>{favItems.length}件</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {favItems.map(({ product }) => {
          const isOutOfStock = product.stock === 0;
          return (
            <div
              key={product.id}
              className="product-card"
              onClick={() => onSelect(product.id)}
              style={isOutOfStock ? { opacity: 0.55, cursor: "default" } : {}}
            >
              <div style={{ background: C.dark, aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <img src={product.image_url} alt={product.name} loading="lazy" style={{ width: "55%", height: "55%", objectFit: "contain", opacity: 0.9 }} />
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFav(product.id); }}
                  style={{
                    position: "absolute", top: 10, left: 10,
                    background: "rgba(9,9,15,0.6)", border: "none",
                    borderRadius: "50%", width: 32, height: 32,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 16, backdropFilter: "blur(8px)",
                  }}
                >❤️</button>
                {isOutOfStock && (
                  <span style={{
                    position: "absolute", top: 10, right: 10,
                    background: "rgba(124,133,168,0.15)", border: "1px solid rgba(124,133,168,0.3)",
                    color: C.muted, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                  }}>在庫切れ</span>
                )}
              </div>
              <div style={{ padding: 18 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</h3>
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.description}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>¥{fmt(product.price)}</span>
                  <span style={{ fontSize: 11, padding: "4px 9px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.04)", color: C.muted }}>
                    {isOutOfStock ? "在庫なし" : `在庫 ${product.stock}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuthView({ initialMode, onSuccess, onToggle }) {
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

function CartView({ onOrderComplete, showToast }) {
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

function OrderHistoryView() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders(token).then(setOrders).catch((err) => setError(err.message));
  }, [token]);

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", color: C.text, marginBottom: 8 }}>注文履歴</h1>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>
        {orders.length > 0 ? `${orders.length}件の注文` : "注文履歴はありません"}
      </p>
      {error && (
        <div style={{ color: C.red, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 12, padding: "16px 20px", fontSize: 14, marginBottom: 20 }}>
          {error}
        </div>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminProductsView({ showToast }) {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showNewForm, setShowNewForm] = useState(false);
  const emptyForm = { name: "", description: "", price: "", stock: "", image_url: "" };
  const [newForm, setNewForm] = useState(emptyForm);
  const [managingImagesFor, setManagingImagesFor] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [imageError, setImageError] = useState(null);

  useEffect(() => {
    fetchProducts().then(setProducts).catch((err) => setError(err.message));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      const created = await createProduct(token, { ...newForm, price: Number(newForm.price), stock: Number(newForm.stock) });
      setProducts((prev) => [...prev, created]);
      setNewForm(emptyForm);
      setShowNewForm(false);
      if (showToast) showToast("商品を追加しました");
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(product) {
    setEditingId(product.id);
    setEditForm({ name: product.name, description: product.description || "", price: product.price, stock: product.stock, image_url: product.image_url || "" });
  }

  async function handleUpdate(productId) {
    setError(null);
    try {
      const updated = await updateProduct(token, productId, { ...editForm, price: Number(editForm.price), stock: Number(editForm.stock) });
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      setEditingId(null);
      if (showToast) showToast("商品を更新しました");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(productId) {
    setError(null);
    try {
      await deleteProduct(token, productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      if (showToast) showToast("商品を削除しました");
    } catch (err) {
      setError(err.message);
    }
  }

  async function openImageManager(product) {
    setManagingImagesFor(product.id);
    setProductImages(product.images || []);
    setNewImageUrl("");
    setImageError(null);
  }

  async function handleAddImage(productId) {
    if (!newImageUrl.trim()) return;
    setImageError(null);
    try {
      const nextOrder = productImages.length;
      const img = await addProductImage(token, productId, newImageUrl.trim(), nextOrder);
      setProductImages((prev) => [...prev, img]);
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, images: [...(p.images || []), img] } : p));
      setNewImageUrl("");
      if (showToast) showToast("画像を追加しました");
    } catch (err) {
      setImageError(err.message);
    }
  }

  async function handleDeleteImage(imageId, productId) {
    try {
      await deleteProductImage(token, imageId);
      setProductImages((prev) => prev.filter((img) => img.id !== imageId));
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, images: (p.images || []).filter((img) => img.id !== imageId) } : p));
      if (showToast) showToast("画像を削除しました");
    } catch (err) {
      setImageError(err.message);
    }
  }

  const inputStyle = { width: "100%", background: C.dark, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8, color: C.text, fontSize: 13, padding: "6px 10px", height: 36 };

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 6 }}>管理者パネル</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.6px", color: C.text }}>商品管理</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowNewForm((v) => !v)} style={{ padding: "10px 20px", fontSize: 14, display: "flex", alignItems: "center", gap: 6, borderRadius: 10 }}>
          {showNewForm ? "× キャンセル" : "+ 新規商品を追加"}
        </button>
      </div>

      {error && (
        <div style={{ color: C.red, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 12, padding: "16px 20px", fontSize: 14, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {showNewForm && (
        <form onSubmit={handleCreate} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24, animation: "fadeUp 0.2s ease" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>新規商品</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <FieldLabel>商品名</FieldLabel>
              <input style={inputStyle} placeholder="商品名" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} required />
            </div>
            <div>
              <FieldLabel>画像URL</FieldLabel>
              <input style={inputStyle} placeholder="https://..." value={newForm.image_url} onChange={(e) => setNewForm({ ...newForm, image_url: e.target.value })} />
            </div>
            <div>
              <FieldLabel>価格（円）</FieldLabel>
              <input style={inputStyle} type="number" placeholder="0" value={newForm.price} onChange={(e) => setNewForm({ ...newForm, price: e.target.value })} required />
            </div>
            <div>
              <FieldLabel>在庫数</FieldLabel>
              <input style={inputStyle} type="number" placeholder="0" value={newForm.stock} onChange={(e) => setNewForm({ ...newForm, stock: e.target.value })} required />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>説明</FieldLabel>
            <input style={inputStyle} placeholder="商品の説明" value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} />
          </div>
          <button className="btn-primary" type="submit" style={{ padding: "10px 24px", fontSize: 14, borderRadius: 10 }}>作成する</button>
        </form>
      )}

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${C.border}` }}>
              {["商品名", "説明", "価格", "在庫", "操作"].map((h, i) => (
                <th key={h} style={{ textAlign: i >= 2 ? "right" : "left", padding: "14px 20px", fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product) =>
              editingId === product.id ? (
                <tr key={product.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <td style={{ padding: "12px 20px" }}><input style={inputStyle} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                  <td style={{ padding: "12px 20px" }}><input style={inputStyle} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></td>
                  <td style={{ padding: "12px 20px" }}><input style={{ ...inputStyle, textAlign: "right" }} type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} /></td>
                  <td style={{ padding: "12px 20px" }}><input style={{ ...inputStyle, textAlign: "right" }} type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} /></td>
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <button className="btn-primary" onClick={() => handleUpdate(product.id)} style={{ padding: "7px 14px", fontSize: 13, borderRadius: 8 }}>保存</button>
                      <button className="btn-surface" onClick={() => setEditingId(null)} style={{ padding: "7px 14px", fontSize: 13 }}>キャンセル</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                <tr key={product.id} className="admin-row" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, background: C.dark, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <img src={product.image_url} alt={product.name} loading="lazy" style={{ width: 28, height: 28, objectFit: "contain" }} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{product.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: 13, color: C.muted, maxWidth: 240 }}>
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.description}</span>
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right", fontSize: 15, fontWeight: 700, color: C.text }}>¥{fmt(product.price)}</td>
                  <td style={{ padding: "16px 20px", textAlign: "right", fontSize: 14, color: C.sec }}>{product.stock}</td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <button
                        className="btn-surface"
                        onClick={() => managingImagesFor === product.id ? setManagingImagesFor(null) : openImageManager(product)}
                        style={{ padding: "7px 14px", fontSize: 13, color: managingImagesFor === product.id ? C.accent : undefined }}
                      >画像</button>
                      <button className="btn-surface" onClick={() => startEdit(product)} style={{ padding: "7px 14px", fontSize: 13 }}>編集</button>
                      <button className="btn-danger" onClick={() => handleDelete(product.id)} style={{ padding: "7px 14px", fontSize: 13 }}>削除</button>
                    </div>
                  </td>
                </tr>
                {managingImagesFor === product.id && (
                  <tr key={`images-${product.id}`}>
                    <td colSpan={5} style={{ padding: "0 20px 20px" }}>
                      <div style={{ background: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, animation: "fadeUp 0.2s ease" }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: C.sec, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>追加画像管理（メイン画像は商品編集で変更）</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                          {productImages.length === 0 && (
                            <p style={{ fontSize: 13, color: C.muted }}>追加画像はありません</p>
                          )}
                          {productImages.map((img) => (
                            <div key={img.id} style={{ position: "relative", width: 80, height: 80 }}>
                              <img src={img.image_url} alt="product" style={{ width: 80, height: 80, objectFit: "contain", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }} />
                              <button
                                onClick={() => handleDeleteImage(img.id, product.id)}
                                style={{
                                  position: "absolute", top: -6, right: -6, width: 20, height: 20,
                                  background: C.red, border: "none", borderRadius: "50%", cursor: "pointer",
                                  color: "#fff", fontSize: 12, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
                                }}
                              >×</button>
                              <span style={{ display: "block", fontSize: 10, color: C.muted, textAlign: "center", marginTop: 2 }}>#{img.display_order + 1}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            style={{ ...inputStyle, flex: 1 }}
                            placeholder="追加画像URL（https://...）"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddImage(product.id)}
                          />
                          <button
                            className="btn-primary"
                            onClick={() => handleAddImage(product.id)}
                            disabled={!newImageUrl.trim()}
                            style={{ padding: "6px 16px", fontSize: 13, borderRadius: 8, whiteSpace: "nowrap" }}
                          >+ 追加</button>
                        </div>
                        {imageError && <p style={{ fontSize: 12, color: C.red, marginTop: 8 }}>{imageError}</p>}
                      </div>
                    </td>
                  </tr>
                )}
                </>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const CHART_COLORS = ["#5b8bf5", "#8b5cf6", "#22c55e", "#f59e0b", "#ff6b6b"];

function AdminDashboardView() {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [salesByDate, setSalesByDate] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAnalyticsSummary(token),
      fetchSalesByDate(token, 30),
      fetchTopProducts(token),
      fetchCategorySales(token),
    ]).then(([s, d, p, c]) => {
      setSummary(s);
      setSalesByDate(d);
      setTopProducts(p);
      setCategorySales(c);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const KpiCard = ({ label, value, sub, accent }) => (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
      <p style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontSize: 30, fontWeight: 800, color: accent || C.text, letterSpacing: "-0.8px" }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sub}</p>}
    </div>
  );

  if (loading) return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 32, width: "80%" }} />
          </div>
        ))}
      </div>
    </div>
  );

  const noData = salesByDate.length === 0 && topProducts.length === 0;

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 6 }}>管理者パネル</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.6px", color: C.text }}>売上ダッシュボード</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <KpiCard label="総売上" value={`¥${fmt(summary?.total_revenue || 0)}`} accent={C.accent} />
        <KpiCard label="注文数" value={`${summary?.order_count || 0}件`} />
        <KpiCard label="平均注文額" value={`¥${fmt(summary?.avg_order || 0)}`} />
        <KpiCard label="ユーザー数" value={`${summary?.user_count || 0}人`} />
      </div>

      {noData ? (
        <div style={{ textAlign: "center", padding: "80px 40px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 }}>
          <p style={{ color: C.muted, fontSize: 15 }}>注文データがまだありません。</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 20 }}>日別売上（直近30日）</h2>
              {salesByDate.length === 0 ? (
                <p style={{ color: C.muted, fontSize: 13 }}>データなし</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={salesByDate} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5b8bf5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#5b8bf5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${fmt(v)}`} width={70} />
                    <Tooltip
                      contentStyle={{ background: C.dark, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: C.sec }}
                      formatter={(v) => [`¥${fmt(v)}`, "売上"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#5b8bf5" fill="url(#salesGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 20 }}>人気商品 TOP5（販売数）</h2>
              {topProducts.length === 0 ? (
                <p style={{ color: C.muted, fontSize: 13 }}>データなし</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: C.muted, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: C.sec, fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                    <Tooltip
                      contentStyle={{ background: C.dark, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
                      formatter={(v) => [v, "販売数"]}
                    />
                    <Bar dataKey="total_qty" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 20 }}>カテゴリ別売上</h2>
            {categorySales.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 13 }}>データなし</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categorySales} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="revenue" paddingAngle={3}>
                      {categorySales.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: C.dark, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
                      formatter={(v) => [`¥${fmt(v)}`, "売上"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  {categorySales.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: C.sec }}>{c.category}</span>
                      </div>
                      <span style={{ color: C.text, fontWeight: 600 }}>¥{fmt(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileView({ showToast, onAccountDeleted }) {
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

  useEffect(() => {
    if (token) fetchAddresses(token).then(setAddresses).catch(() => {});
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
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>配送先住所帳</h2>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)} style={{ padding: "8px 16px", fontSize: 13, borderRadius: 8 }}>
          {showForm ? "× キャンセル" : "+ 住所を追加"}
        </button>
      </div>

      {error && (
        <div style={{ color: C.red, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <form onSubmit={handleDeleteAccount} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: 360, animation: "fadeUp 0.2s ease" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>本当に退会しますか？</h3>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>確認のため、現在のパスワードを入力してください。</p>
            <FieldLabel>パスワード</FieldLabel>
            <input
              type="password"
              style={fieldStyle}
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
              autoFocus
            />
            {deleteError && (
              <div style={{ color: C.red, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginTop: 12 }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button type="button" className="btn-surface" onClick={() => setShowDeleteModal(false)} style={{ padding: "8px 16px", fontSize: 13 }}>
                キャンセル
              </button>
              <button type="submit" className="btn-danger" disabled={deleting} style={{ padding: "8px 16px", fontSize: 13 }}>
                {deleting ? "処理中..." : "退会を実行する"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AdminCouponsView({ showToast }) {
  const { token } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const emptyForm = { code: "", discount_type: "percentage", discount_value: "", max_uses: "" };
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
          </div>
          <button className="btn-primary" type="submit" style={{ padding: "10px 24px", fontSize: 14, borderRadius: 10 }}>作成する</button>
        </form>
      )}

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${C.border}` }}>
              {["コード", "割引内容", "使用回数", "ステータス", "作成日", "操作"].map((h, i) => (
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
                <td style={{ padding: "15px 20px", textAlign: "center", fontSize: 13, color: C.sec }}>
                  {coupon.used_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
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
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 20px", color: C.muted, fontSize: 14 }}>クーポンがありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminOrdersView({ showToast }) {
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
              {["注文ID", "注文者", "注文日時", "ステータス", "合計"].map((h, i) => (
                <th key={h} style={{ textAlign: i === 3 ? "center" : i === 4 ? "right" : "left", padding: "14px 20px", fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>{h}</th>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: "#1a1e35", border: "1px solid rgba(91,139,245,0.25)", borderRadius: 12,
      padding: "14px 24px", color: C.text, fontSize: 14, fontWeight: 600,
      boxShadow: "0 8px 40px rgba(0,0,0,0.5)", animation: "toastIn 0.3s ease",
      whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 10, zIndex: 999,
    }}>
      <span style={{ color: C.green, fontSize: 16 }}>✓</span> {message}
    </div>
  );
}

function MainView() {
  const { token } = useAuth();
  const [view, setView] = useState("products");
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [favItems, setFavItems] = useState([]);

  const favProductIds = new Set(favItems.map((f) => f.product.id));

  useEffect(() => {
    if (!token) { setFavItems([]); return; }
    fetchFavorites(token).then(setFavItems).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "success") return;
    const sessionId = params.get("session_id");
    window.history.replaceState({}, "", "/");
    if (!sessionId) return;
    completePayment(token, sessionId)
      .then(() => {
        showToast("ご注文ありがとうございます！（Stripe決済完了）");
        navigate("orders");
      })
      .catch((err) => showToast(err.message));
  }, [token]);

  async function toggleFav(productId) {
    if (!token) { setView("login"); return; }
    if (favProductIds.has(productId)) {
      await removeFavorite(token, productId);
      setFavItems((prev) => prev.filter((f) => f.product.id !== productId));
    } else {
      await addFavorite(token, productId);
      setFavItems((prev) => [...prev, { id: Date.now(), product: { id: productId } }]);
      fetchFavorites(token).then(setFavItems).catch(() => {});
    }
  }

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  function navigate(v) {
    setView(v);
    if (v === "products") setSelectedId(null);
  }

  function handleSelect(id) {
    setSelectedId(id);
    setView("products");
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Header onNavigate={navigate} />
      <main style={{ maxWidth: 1320, margin: "0 auto", padding: "40px 32px" }}>
        {(view === "login" || view === "register") && (
          <AuthView
            initialMode={view}
            onSuccess={() => navigate("products")}
            onToggle={(mode) => setView(mode)}
          />
        )}
        {view === "cart" && <CartView onOrderComplete={() => navigate("orders")} showToast={showToast} />}
        {view === "orders" && <OrderHistoryView />}
        {view === "favorites" && (
          <FavoritesView
            favItems={favItems}
            onToggleFav={toggleFav}
            onSelect={(id) => { setSelectedId(id); setView("products"); }}
          />
        )}
        {view === "profile" && <ProfileView showToast={showToast} onAccountDeleted={() => navigate("login")} />}
        {view === "admin-dashboard" && <AdminDashboardView />}
        {view === "admin-products" && <AdminProductsView showToast={showToast} />}
        {view === "admin-orders" && <AdminOrdersView showToast={showToast} />}
        {view === "admin-coupons" && <AdminCouponsView showToast={showToast} />}
        {view === "products" && (
          selectedId === null ? (
            <ProductList
              onSelect={handleSelect}
              favProductIds={favProductIds}
              onToggleFav={toggleFav}
            />
          ) : (
            <ProductDetail
              productId={selectedId}
              onBack={() => setSelectedId(null)}
              onNavigateLogin={() => setView("login")}
              showToast={showToast}
              favProductIds={favProductIds}
              onToggleFav={toggleFav}
              onSelect={handleSelect}
            />
          )
        )}
      </main>
      <Toast message={toast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainView />
    </AuthProvider>
  );
}
