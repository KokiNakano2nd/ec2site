import { useEffect, useState } from "react";
import { fetchProducts, fetchProductById } from "./api/products";
import { register } from "./api/auth";
import { fetchCart, addToCart, updateCartItem, removeCartItem } from "./api/cart";
import { createOrder, fetchOrders } from "./api/orders";
import { createProduct, updateProduct, deleteProduct, fetchAdminOrders } from "./api/admin";
import { AuthProvider, useAuth } from "./AuthContext";

function ProductList({ onSelect }) {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p>エラー: {error}</p>;

  return (
    <div>
      <h1>商品一覧</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {products.map((product) => (
          <div
            key={product.id}
            onClick={() => onSelect(product.id)}
            style={{ border: "1px solid #ccc", padding: "1rem", width: "200px", cursor: "pointer" }}
          >
            <img src={product.image_url} alt={product.name} style={{ width: "100%" }} />
            <h3>{product.name}</h3>
            <p>¥{product.price.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductDetail({ productId, onBack, onNavigateLogin }) {
  const { token } = useAuth();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchProductById(productId)
      .then(setProduct)
      .catch((err) => setError(err.message));
  }, [productId]);

  async function handleAddToCart() {
    setMessage(null);
    if (!token) {
      onNavigateLogin();
      return;
    }
    try {
      await addToCart(token, productId, quantity);
      setMessage("カートに追加しました");
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (error) return <p>エラー: {error}</p>;
  if (!product) return <p>読み込み中...</p>;

  return (
    <div>
      <button onClick={onBack}>← 一覧に戻る</button>
      <h1>{product.name}</h1>
      <img src={product.image_url} alt={product.name} style={{ width: "300px" }} />
      <p>{product.description}</p>
      <p>価格: ¥{product.price.toLocaleString()}</p>
      <p>在庫: {product.stock}</p>
      <div>
        <label>
          数量:{" "}
          <input
            type="number"
            min="1"
            max={product.stock}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            style={{ width: "60px" }}
          />
        </label>
        <button onClick={handleAddToCart} style={{ marginLeft: "1rem" }}>
          カートに入れる
        </button>
      </div>
      {message && <p>{message}</p>}
    </div>
  );
}

function Header({ view, onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.5rem 0",
        borderBottom: "1px solid #ccc",
        marginBottom: "1rem",
      }}
    >
      <span
        style={{ cursor: "pointer", fontWeight: "bold" }}
        onClick={() => onNavigate("products")}
      >
        EC Site
      </span>
      {user ? (
        <span>
          <button onClick={() => onNavigate("cart")}>カート</button>{" "}
          <button onClick={() => onNavigate("orders")}>注文履歴</button>{" "}
          {user.is_admin && (
            <>
              <button onClick={() => onNavigate("admin-products")}>商品管理</button>{" "}
              <button onClick={() => onNavigate("admin-orders")}>全注文一覧</button>{" "}
            </>
          )}
          ログイン中: {user.email}{" "}
          <button onClick={logout}>ログアウト</button>
        </span>
      ) : (
        <span>
          <button onClick={() => onNavigate("login")}>ログイン</button>{" "}
          <button onClick={() => onNavigate("register")}>新規登録</button>
        </span>
      )}
    </div>
  );
}

function LoginForm({ onSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "320px" }}>
      <h1>ログイン</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div>
        <label>メールアドレス</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%" }}
        />
      </div>
      <div>
        <label>パスワード</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%" }}
        />
      </div>
      <button type="submit" style={{ marginTop: "1rem" }}>
        ログイン
      </button>
    </form>
  );
}

function RegisterForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await register(email, password);
      onSuccess();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "320px" }}>
      <h1>新規登録</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div>
        <label>メールアドレス</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%" }}
        />
      </div>
      <div>
        <label>パスワード</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%" }}
        />
      </div>
      <button type="submit" style={{ marginTop: "1rem" }}>
        登録する
      </button>
    </form>
  );
}

function CartView({ onOrderComplete }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    fetchCart(token)
      .then(setItems)
      .catch((err) => setError(err.message));
  }, [token]);

  async function handlePlaceOrder() {
    setError(null);
    setPlacing(true);
    try {
      await createOrder(token);
      setItems([]);
      onOrderComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  async function handleQuantityChange(cartId, quantity) {
    setError(null);
    try {
      const updated = await updateCartItem(token, cartId, quantity);
      setItems((prev) => prev.map((item) => (item.id === cartId ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(cartId) {
    setError(null);
    try {
      await removeCartItem(token, cartId);
      setItems((prev) => prev.filter((item) => item.id !== cartId));
    } catch (err) {
      setError(err.message);
    }
  }

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div>
      <h1>カート</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {items.length === 0 ? (
        <p>カートは空です</p>
      ) : (
        <div>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                borderBottom: "1px solid #ccc",
                padding: "0.5rem 0",
              }}
            >
              <img src={item.product.image_url} alt={item.product.name} style={{ width: "80px" }} />
              <span style={{ flex: 1 }}>{item.product.name}</span>
              <span>¥{item.product.price.toLocaleString()}</span>
              <input
                type="number"
                min="1"
                max={item.product.stock}
                value={item.quantity}
                onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                style={{ width: "60px" }}
              />
              <span>小計: ¥{(item.product.price * item.quantity).toLocaleString()}</span>
              <button onClick={() => handleRemove(item.id)}>削除</button>
            </div>
          ))}
          <h2>合計: ¥{total.toLocaleString()}</h2>
          <button onClick={handlePlaceOrder} disabled={placing}>
            {placing ? "処理中..." : "注文を確定する"}
          </button>
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
    fetchOrders(token)
      .then(setOrders)
      .catch((err) => setError(err.message));
  }, [token]);

  return (
    <div>
      <h1>注文履歴</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {orders.length === 0 ? (
        <p>注文履歴はありません</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <p>
              注文日時: {new Date(order.created_at).toLocaleString()}({order.status})
            </p>
            <p>合計: ¥{order.total_price.toLocaleString()}</p>
            <ul>
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.product.name} × {item.quantity} (¥{item.price.toLocaleString()})
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

function AdminProductsView() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const emptyForm = { name: "", description: "", price: "", stock: "", image_url: "" };
  const [newForm, setNewForm] = useState(emptyForm);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => setError(err.message));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      const created = await createProduct(token, {
        ...newForm,
        price: Number(newForm.price),
        stock: Number(newForm.stock),
      });
      setProducts((prev) => [...prev, created]);
      setNewForm(emptyForm);
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
    });
  }

  async function handleUpdate(productId) {
    setError(null);
    try {
      const updated = await updateProduct(token, productId, {
        ...editForm,
        price: Number(editForm.price),
        stock: Number(editForm.stock),
      });
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(productId) {
    setError(null);
    try {
      await deleteProduct(token, productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>商品管理</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>新規商品作成</h2>
      <form onSubmit={handleCreate} style={{ marginBottom: "2rem" }}>
        <input
          placeholder="商品名"
          value={newForm.name}
          onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
          required
        />{" "}
        <input
          placeholder="説明"
          value={newForm.description}
          onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
        />{" "}
        <input
          type="number"
          placeholder="価格"
          value={newForm.price}
          onChange={(e) => setNewForm({ ...newForm, price: e.target.value })}
          required
        />{" "}
        <input
          type="number"
          placeholder="在庫"
          value={newForm.stock}
          onChange={(e) => setNewForm({ ...newForm, stock: e.target.value })}
          required
        />{" "}
        <input
          placeholder="画像URL"
          value={newForm.image_url}
          onChange={(e) => setNewForm({ ...newForm, image_url: e.target.value })}
        />{" "}
        <button type="submit">作成</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>商品名</th>
            <th style={{ textAlign: "left" }}>説明</th>
            <th style={{ textAlign: "left" }}>価格</th>
            <th style={{ textAlign: "left" }}>在庫</th>
            <th style={{ textAlign: "left" }}>画像URL</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) =>
            editingId === product.id ? (
              <tr key={product.id}>
                <td>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={editForm.image_url}
                    onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                  />
                </td>
                <td>
                  <button onClick={() => handleUpdate(product.id)}>保存</button>{" "}
                  <button onClick={() => setEditingId(null)}>キャンセル</button>
                </td>
              </tr>
            ) : (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.description}</td>
                <td>¥{product.price.toLocaleString()}</td>
                <td>{product.stock}</td>
                <td>{product.image_url}</td>
                <td>
                  <button onClick={() => startEdit(product)}>編集</button>{" "}
                  <button onClick={() => handleDelete(product.id)}>削除</button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function AdminOrdersView() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminOrders(token)
      .then(setOrders)
      .catch((err) => setError(err.message));
  }, [token]);

  return (
    <div>
      <h1>全注文一覧</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {orders.length === 0 ? (
        <p>注文はありません</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <p>
              注文者: {order.user_email} / 注文日時: {new Date(order.created_at).toLocaleString()}
              ({order.status})
            </p>
            <p>合計: ¥{order.total_price.toLocaleString()}</p>
            <ul>
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.product.name} × {item.quantity} (¥{item.price.toLocaleString()})
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

function MainView() {
  const [view, setView] = useState("products");
  const [selectedId, setSelectedId] = useState(null);

  function handleSelect(id) {
    setSelectedId(id);
    setView("products");
  }

  return (
    <div>
      <Header view={view} onNavigate={setView} />
      {view === "login" && <LoginForm onSuccess={() => setView("products")} />}
      {view === "register" && (
        <RegisterForm onSuccess={() => setView("login")} />
      )}
      {view === "cart" && <CartView onOrderComplete={() => setView("orders")} />}
      {view === "orders" && <OrderHistoryView />}
      {view === "admin-products" && <AdminProductsView />}
      {view === "admin-orders" && <AdminOrdersView />}
      {view === "products" &&
        (selectedId === null ? (
          <ProductList onSelect={handleSelect} />
        ) : (
          <ProductDetail
            productId={selectedId}
            onBack={() => setSelectedId(null)}
            onNavigateLogin={() => setView("login")}
          />
        ))}
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
