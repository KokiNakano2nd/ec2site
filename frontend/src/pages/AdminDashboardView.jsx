import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchAnalyticsSummary, fetchCategorySales, fetchSalesByDate, fetchTopProducts } from "../api/analytics";
import { fetchLowStockProducts } from "../api/admin";
import { fetchLowRemainingUsesCoupons } from "../api/coupons";
import { useAuth } from "../AuthContext";
import { C, CHART_COLORS } from "../lib/constants";
import { fmt } from "../lib/format";

export function AdminDashboardView() {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [salesByDate, setSalesByDate] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [lowRemainingUsesCoupons, setLowRemainingUsesCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAnalyticsSummary(token),
      fetchSalesByDate(token, 30),
      fetchTopProducts(token),
      fetchCategorySales(token),
      fetchLowStockProducts(token),
      fetchLowRemainingUsesCoupons(token),
    ]).then(([s, d, p, c, lowStock, lowRemainingCoupons]) => {
      setSummary(s);
      setSalesByDate(d);
      setTopProducts(p);
      setCategorySales(c);
      setLowStockProducts(lowStock);
      setLowRemainingUsesCoupons(lowRemainingCoupons);
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

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>低在庫アラート</h2>
        {lowStockProducts.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13 }}>現在低在庫の商品はありません</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lowStockProducts.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: C.text, fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: C.red }}>在庫 {p.stock} / しきい値 {p.low_stock_threshold}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>クーポン残数アラート</h2>
        {lowRemainingUsesCoupons.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13 }}>残数僅少のクーポンはありません</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lowRemainingUsesCoupons.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: C.text, fontWeight: 600, fontFamily: "monospace" }}>{c.code}</span>
                <span style={{ color: C.red }}>残り {c.max_uses - c.used_count} 回 / しきい値 {c.low_remaining_uses_threshold}</span>
              </div>
            ))}
          </div>
        )}
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
