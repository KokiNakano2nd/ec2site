import { useEffect, useState } from "react";
import { fetchProducts } from "../api/products";
import { ErrorBanner } from "../components/ErrorBanner";
import { SkeletonCard } from "../components/SkeletonCard";
import { C, PAGE_SIZE } from "../lib/constants";
import { fmt } from "../lib/format";

export function ProductList({ onSelect, favProductIds = new Set(), onToggleFav }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetchProducts()
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (error) return <ErrorBanner style={{ marginBottom: 0 }}>エラー: {error}</ErrorBanner>;

  if (loading)
    return (
      <div style={{ animation: "fadeUp 0.3s ease" }}>
        <div style={{ marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 14, width: 120, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 36, width: 280 }} />
        </div>
        <div className="skeleton" style={{ height: 46, marginBottom: 28, borderRadius: 11 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
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
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1,
              color: C.accent,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            すべての商品
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1px", color: C.text }}>
            ガジェット &amp; 電子機器
          </h1>
        </div>
        <p style={{ color: C.muted, fontSize: 14 }}>{filtered.length}件の商品</p>
      </div>

      <div style={{ position: "relative", marginBottom: 28 }}>
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 16,
            color: C.muted,
            pointerEvents: "none",
          }}
        >
          🔍
        </span>
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
        <div
          style={{
            textAlign: "center",
            padding: "80px 40px",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
          }}
        >
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
                <div
                  style={{
                    background: C.dark,
                    aspectRatio: "4/3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    style={{ width: "55%", height: "55%", objectFit: "contain", opacity: 0.9 }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFav && onToggleFav(product.id);
                    }}
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      background: "rgba(9,9,15,0.6)",
                      border: "none",
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    {favProductIds.has(product.id) ? "❤️" : "🤍"}
                  </button>
                  {isOutOfStock ? (
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        background: "rgba(124,133,168,0.15)",
                        border: "1px solid rgba(124,133,168,0.3)",
                        color: C.muted,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 5,
                      }}
                    >
                      在庫切れ
                    </span>
                  ) : (
                    product.stock <= 7 && (
                      <span
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          background: "rgba(255,107,107,0.15)",
                          border: "1px solid rgba(255,107,107,0.3)",
                          color: C.red,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 5,
                        }}
                      >
                        残りわずか
                      </span>
                    )
                  )}
                </div>
                <div style={{ padding: 18 }}>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: C.text,
                      marginBottom: 5,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {product.name}
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      color: C.muted,
                      marginBottom: 14,
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {product.description}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>
                      ¥{fmt(product.price)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "4px 9px",
                        borderRadius: 5,
                        border: "1px solid rgba(255,255,255,0.05)",
                        background: "rgba(255,255,255,0.04)",
                        color: isOutOfStock ? C.muted : C.muted,
                      }}
                    >
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
          >
            ← 前へ
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                background: page === currentPage ? C.accent : "rgba(255,255,255,0.06)",
                color: page === currentPage ? "#fff" : C.sec,
                cursor: "pointer",
              }}
            >
              {page}
            </button>
          ))}
          <button
            className="btn-surface"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: "8px 16px", fontSize: 14, opacity: currentPage === totalPages ? 0.4 : 1 }}
          >
            次へ →
          </button>
        </div>
      )}
    </div>
  );
}
