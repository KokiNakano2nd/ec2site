import { C } from "../lib/constants";
import { fmt } from "../lib/format";

export function FavoritesView({ favItems, onToggleFav, onSelect }) {
  if (favItems.length === 0) {
    return (
      <div style={{ animation: "fadeUp 0.3s ease" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", color: C.text, marginBottom: 8 }}>
          お気に入り
        </h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>お気に入りに追加した商品が表示されます</p>
        <div
          style={{
            textAlign: "center",
            padding: "100px 40px",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
          }}
        >
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
            ウィッシュリスト
          </p>
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
                    onToggleFav(product.id);
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
                    backdropFilter: "blur(8px)",
                  }}
                >
                  ❤️
                </button>
                {isOutOfStock && (
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
                      color: C.muted,
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
    </div>
  );
}
