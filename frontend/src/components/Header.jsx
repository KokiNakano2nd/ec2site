import { C } from "../lib/constants";
import { useAuth } from "../AuthContext";

export function Header({ onNavigate }) {
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
