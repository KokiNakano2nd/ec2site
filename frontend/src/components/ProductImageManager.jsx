import { C } from "../lib/constants";

export function ProductImageManager({ images, newImageUrl, onNewImageUrlChange, onAdd, onDelete, error, inputStyle }) {
  return (
    <div
      style={{
        background: C.dark,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 20,
        animation: "fadeUp 0.2s ease",
      }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.sec,
          marginBottom: 14,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        追加画像管理（メイン画像は商品編集で変更）
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        {images.length === 0 && <p style={{ fontSize: 13, color: C.muted }}>追加画像はありません</p>}
        {images.map((img) => (
          <div key={img.id} style={{ position: "relative", width: 80, height: 80 }}>
            <img
              src={img.image_url}
              alt="product"
              style={{
                width: 80,
                height: 80,
                objectFit: "contain",
                background: C.surface,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
              }}
            />
            <button
              onClick={() => onDelete(img.id)}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 20,
                height: 20,
                background: C.red,
                border: "none",
                borderRadius: "50%",
                cursor: "pointer",
                color: "#fff",
                fontSize: 12,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
            <span style={{ display: "block", fontSize: 10, color: C.muted, textAlign: "center", marginTop: 2 }}>
              #{img.display_order + 1}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="追加画像URL（https://...）"
          value={newImageUrl}
          onChange={onNewImageUrlChange}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
        />
        <button
          className="btn-primary"
          onClick={onAdd}
          disabled={!newImageUrl.trim()}
          style={{ padding: "6px 16px", fontSize: 13, borderRadius: 8, whiteSpace: "nowrap" }}
        >
          + 追加
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: C.red, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
