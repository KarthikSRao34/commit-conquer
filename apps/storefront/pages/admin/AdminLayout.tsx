// apps/storefront/pages/admin/AdminLayout.tsx
// Wraps all /admin/* routes with sidebar navigation

import { NavLink, Outlet, Link } from "react-router-dom";

const NAV = [
  { to: "/admin",          label: "Dashboard", icon: "⬡", end: true },
  { to: "/admin/products", label: "Products",  icon: "◈" },
  { to: "/admin/orders",   label: "Orders",    icon: "○" },
];

export default function AdminLayout() {
  return (
    <div style={s.root}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.logoWrap}>
          <Link to="/" style={s.logo}>commit&amp;conquer</Link>
          <span style={s.badge}>Admin</span>
        </div>

        <nav style={s.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }: { isActive: boolean }) => ({
                ...s.navItem,
                background: isActive ? "rgba(124,106,255,0.15)" : "transparent",
                color:      isActive ? "#7c6aff" : "#888",
              })}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <Link to="/" style={s.backLink}>← Back to Store</Link>
        </div>
      </aside>

      {/* Content */}
      <main style={s.main}>
        <Outlet />
      </main>
    </div>
  );
}

const s: Record<string, any> = {
  root:    { display: "flex", minHeight: "100vh", background: "#0c0c0e", color: "#e8e8f0" },
  sidebar: { width: 220, background: "#0a0a0c", borderRight: "1px solid #1c1c21", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" },
  logoWrap: { padding: "24px 20px 20px", borderBottom: "1px solid #1c1c21", display: "flex", alignItems: "center", gap: 8 },
  logo:    { fontWeight: 800, fontSize: 14, textDecoration: "none", color: "#e8e8f0" },
  badge:   { fontSize: 10, fontWeight: 700, padding: "2px 8px", background: "rgba(124,106,255,0.2)", color: "#7c6aff", borderRadius: 4 },
  nav:     { flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 4 },
  navItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "all 0.15s" },
  navIcon: { fontSize: 16 },
  sidebarFooter: { padding: "16px 20px", borderTop: "1px solid #1c1c21" },
  backLink: { color: "#555", textDecoration: "none", fontSize: 13 },
  main:    { flex: 1, padding: "32px 36px", overflowX: "auto" },
};