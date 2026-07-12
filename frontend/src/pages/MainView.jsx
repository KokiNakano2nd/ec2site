import { useEffect, useRef, useState } from "react";
import { addFavorite, fetchFavorites, removeFavorite } from "../api/favorites";
import { completePayment } from "../api/payment";
import { useAuth } from "../AuthContext";
import { Header } from "../components/Header";
import { Toast } from "../components/Toast";
import { C } from "../lib/constants";
import { AdminCouponsView } from "./AdminCouponsView";
import { AdminDashboardView } from "./AdminDashboardView";
import { AdminOrdersView } from "./AdminOrdersView";
import { AdminProductsView } from "./AdminProductsView";
import { AuthView } from "./AuthView";
import { CartView } from "./CartView";
import { FavoritesView } from "./FavoritesView";
import { OrderHistoryView } from "./OrderHistoryView";
import { ProductDetail } from "./ProductDetail";
import { ProductList } from "./ProductList";
import { ProfileView } from "./ProfileView";

export function MainView() {
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
