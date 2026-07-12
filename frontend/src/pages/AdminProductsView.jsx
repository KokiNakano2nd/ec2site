import { useEffect, useState } from "react";
import { createProduct, deleteProduct, updateProduct } from "../api/admin";
import { addProductImage, deleteProductImage, fetchProducts } from "../api/products";
import { useAuth } from "../AuthContext";
import { FieldLabel } from "../components/FieldLabel";
import { C } from "../lib/constants";
import { fmt } from "../lib/format";

function isLowStock(product) {
  return product.low_stock_threshold != null && product.stock <= product.low_stock_threshold;
}

export function AdminProductsView({ showToast }) {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showNewForm, setShowNewForm] = useState(false);
  const emptyForm = { name: "", description: "", price: "", stock: "", image_url: "", low_stock_threshold: "" };
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
      const created = await createProduct(token, {
        ...newForm,
        price: Number(newForm.price),
        stock: Number(newForm.stock),
        low_stock_threshold: newForm.low_stock_threshold === "" ? null : Number(newForm.low_stock_threshold),
      });
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
    setEditForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      stock: product.stock,
      image_url: product.image_url || "",
      low_stock_threshold: product.low_stock_threshold ?? "",
    });
  }

  async function handleUpdate(productId) {
    setError(null);
    try {
      const updated = await updateProduct(token, productId, {
        ...editForm,
        price: Number(editForm.price),
        stock: Number(editForm.stock),
        low_stock_threshold: editForm.low_stock_threshold === "" ? null : Number(editForm.low_stock_threshold),
      });
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
            <div>
              <FieldLabel>低在庫しきい値（任意）</FieldLabel>
              <input style={inputStyle} type="number" placeholder="未設定" value={newForm.low_stock_threshold} onChange={(e) => setNewForm({ ...newForm, low_stock_threshold: e.target.value })} />
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
              {["商品名", "説明", "価格", "在庫", "しきい値", "操作"].map((h, i) => (
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
                  <td style={{ padding: "12px 20px" }}><input style={{ ...inputStyle, textAlign: "right" }} type="number" placeholder="未設定" value={editForm.low_stock_threshold} onChange={(e) => setEditForm({ ...editForm, low_stock_threshold: e.target.value })} /></td>
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
                  <td style={{ padding: "16px 20px", textAlign: "right", fontSize: 14, color: isLowStock(product) ? C.red : C.sec }}>
                    {product.stock}
                    {isLowStock(product) && (
                      <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: C.red, background: "rgba(255,107,107,0.12)", borderRadius: 6, padding: "2px 6px" }}>低在庫</span>
                    )}
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right", fontSize: 13, color: C.muted }}>{product.low_stock_threshold ?? "-"}</td>
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
                    <td colSpan={6} style={{ padding: "0 20px 20px" }}>
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
