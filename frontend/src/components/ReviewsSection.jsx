import { useEffect, useState } from "react";
import { fetchReviews, postReview } from "../api/reviews";
import { useAuth } from "../AuthContext";
import { C } from "../lib/constants";
import { fmtDate } from "../lib/format";
import { FieldLabel } from "./FieldLabel";
import { StarRating } from "./StarRating";

export function ReviewsSection({ productId, onNavigateLogin, showToast }) {
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
