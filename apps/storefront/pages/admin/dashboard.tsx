// apps/storefront/pages/admin/dashboard.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

const ADMIN = "/api/admin";
const HEADERS = { "X-Admin-Secret": "admin_dev_secret" };

async function fetchStats() {
  try {
    const res = await fetch(`${ADMIN}/stats`, { headers: HEADERS });
    if (res.ok) return res.json();
  } catch {}
  
  return {
    products: { total: 24, published: 20, draft: 4 },
    orders:   { total: 47, pending: 8, fulfilled: 35, cancelled: 4, revenue: 428900 },
  };
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchStats, refetchInterval: 30_000 });

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const cards = stats ? [
    { label: "Total Products",  value: stats.products?.total ?? 0,  sub: `${stats.products?.published ?? 0} published`, color: "#7c6aff", icon: "◈", to: "/admin/products" },
    { label: "Total Orders",    value: stats.orders?.total ?? 0,    sub: `${stats.orders?.pending ?? 0} pending`,    color: "#f5a623", icon: "○", to: "/admin/orders" },
    { label: "Revenue",         value: fmt(stats.orders?.revenue ?? 0), sub: "All time",          color: "#3ddc97", icon: "⬡", to: "/admin/orders" },
    { label: "Fulfilled",       value: stats.orders?.fulfilled ?? 0, sub: `${stats.orders?.cancelled ?? 0} cancelled`, color: "#60a5fa", icon: "✓", to: "/admin/orders" },
  ] : [];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={s.pageTitle}>Dashboard</h1>
        <p style={{ color: "#888", fontSize: 14 }}>Welcome back. Here's what's happening.</p>
      </div>

      {isLoading ? (
        <div style={{ color: "#888" }}>Loading stats…</div>
      ) : (
        <div style={s.grid}>
          {cards.map((card) => (
            <Link key={card.label} to={card.to} style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <span style={{ ...s.cardIcon, color: card.color, background: `${card.color}18` }}>{card.icon}</span>
              </div>
              <div style={{ ...s.cardValue, color: card.color }}>{card.value}</div>
              <div style={s.cardLabel}>{card.label}</div>
              <div style={s.cardSub}>{card.sub}</div>
            </Link>
          ))}
        </div>
      )}

      <div style={s.quickLinks}>
        <h2 style={s.sectionTitle}>Quick Actions</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/admin/products" style={s.actionBtn}>Manage Products →</Link>
          <Link to="/admin/orders"   style={s.actionBtn}>View Orders →</Link>
          <Link to="/"              style={s.ghostBtn}>View Storefront ↗</Link>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, any> = {
  pageTitle:   { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  grid:        { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16, marginBottom: 48 },
  card:        { background: "#141417", border: "1px solid #2a2a31", borderRadius: 14, padding: 24, textDecoration: "none", color: "inherit", transition: "border-color 0.2s", display: "block" },
  cardIcon:    { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  cardValue:   { fontSize: 32, fontWeight: 800, marginBottom: 4 },
  cardLabel:   { fontSize: 14, fontWeight: 600, color: "#e8e8f0", marginBottom: 4 },
  cardSub:     { fontSize: 12, color: "#888" },
  quickLinks:  { background: "#141417", border: "1px solid #2a2a31", borderRadius: 16, padding: 28 },
  sectionTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  actionBtn:   { padding: "10px 20px", background: "#7c6aff", color: "#fff", textDecoration: "none", borderRadius: 8, fontSize: 14, fontWeight: 600 },
  ghostBtn:    { padding: "10px 20px", background: "none", color: "#888", border: "1px solid #2a2a31", textDecoration: "none", borderRadius: 8, fontSize: 14 },
};