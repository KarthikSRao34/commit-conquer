// UnifiedDashboard.jsx
// Drop this file into apps/storefront/pages/admin/ (or a new apps/dashboard/)
// and wire it as the root route in main.tsx.
// It composes AdminLayout + storefront pages into one shell.
//
// Usage in main.tsx:
//   import UnifiedDashboard from "./pages/UnifiedDashboard";
//   <Route path="/" element={<UnifiedDashboard />} />

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Shared helpers ────────────────────────────────────────────────────────────

const ADMIN_HDR = { "Content-Type": "application/json", "X-Admin-Secret": "admin_dev_secret" };
const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// ─── Demo data generators ──────────────────────────────────────────────────────

const PRODUCT_TITLES = [
  "Obsidian Crew Neck","Slate Cargo Pant","Onyx Hoodie","Granite Bomber",
  "Ash Trench Coat","Carbon Jogger","Basalt Windbreaker","Charcoal Denim",
  "Iron Fleece","Flint Overshirt","Coal Polo","Cinder Vest",
];
const CATEGORIES = ["Tops","Bottoms","Outerwear","Accessories"];

function genProducts(n = 16) {
  return Array.from({ length: n }, (_, i) => ({
    id: `prod_${String(i + 1).padStart(3, "0")}`,
    title: PRODUCT_TITLES[i % 12],
    handle: PRODUCT_TITLES[i % 12].toLowerCase().replace(/\s+/g, "-"),
    status: i % 4 === 1 ? "draft" : "published",
    price: 3900 + ((i * 1700) % 20000),
    category: CATEGORIES[i % 4],
    thumbnail: `https://picsum.photos/seed/${i + 10}/80/96`,
    variants: [{ inventory: 5 + (i * 7) % 40 }],
    rating: parseFloat((3.5 + ((i * 7) % 15) / 10).toFixed(1)),
    tags: [["new"], ["sale"], [], ["bestseller"], ["limited"]][i % 5],
  }));
}

const ORDER_NAMES = [["Ethan","Cole"],["Maya","Patel"],["Lucas","Kim"],["Zoe","Turner"],["Aiden","Brooks"],["Sara","Nolan"]];
const ORDER_STATUSES = ["pending","paid","fulfilled","cancelled","fulfilled","paid"];
const ORDER_ITEMS = [
  [{ title: "Obsidian Crew Neck", price: 7900, qty: 1 }],
  [{ title: "Slate Cargo Pant", price: 11900, qty: 1 }, { title: "Onyx Hoodie", price: 9400, qty: 1 }],
  [{ title: "Granite Bomber", price: 16800, qty: 1 }],
  [{ title: "Carbon Jogger", price: 8900, qty: 2 }],
  [{ title: "Ash Trench Coat", price: 22900, qty: 1 }],
  [{ title: "Basalt Windbreaker", price: 13400, qty: 1 }],
];

function genOrders(n = 12) {
  return Array.from({ length: n }, (_, i) => {
    const ni = i % 6;
    const total = ORDER_ITEMS[ni].reduce((s, x) => s + x.price * x.qty, 0);
    return {
      id: `order_${String(i + 1).padStart(4, "0")}`,
      display_id: `#${1000 + i}`,
      status: ORDER_STATUSES[ni],
      customer: { first_name: ORDER_NAMES[ni][0], last_name: ORDER_NAMES[ni][1], email: `${ORDER_NAMES[ni][0].toLowerCase()}@example.com` },
      items: ORDER_ITEMS[ni],
      total: total + 599,
      created_at: new Date(Date.now() - i * 86400000 * 2).toISOString(),
    };
  });
}

function genStorefrontProducts(n = 60) {
  return Array.from({ length: n }, (_, i) => {
    const price = parseFloat((29 + ((i * 17) % 200)).toFixed(2));
    const tags = [["new"], ["sale"], [], ["bestseller"], ["limited"]][i % 5];
    return {
      id: `prod_${String(i + 1).padStart(3, "0")}`,
      handle: PRODUCT_TITLES[i % 12].toLowerCase().replace(/\s+/g, "-") + `-${i + 1}`,
      title: PRODUCT_TITLES[i % 12],
      category: CATEGORIES[i % 4],
      status: i % 5 === 1 ? "draft" : "published",
      thumbnail: `https://picsum.photos/seed/${i + 10}/400/500`,
      price,
      originalPrice: tags.includes("sale") ? parseFloat((price * 1.3).toFixed(2)) : undefined,
      inventory: 200 - ((i * 13) % 180),
      tags,
      rating: parseFloat((3.5 + ((i * 7) % 15) / 10).toFixed(1)),
      reviewCount: 4 + ((i * 11) % 120),
    };
  });
}

// ─── Status colours ────────────────────────────────────────────────────────────

const STATUS_CLR = {
  pending:   { bg: "rgba(245,166,35,.12)",  clr: "#f5a623" },
  paid:      { bg: "rgba(96,165,250,.12)",   clr: "#60a5fa" },
  fulfilled: { bg: "rgba(61,220,151,.12)",   clr: "#3ddc97" },
  cancelled: { bg: "rgba(255,92,92,.12)",    clr: "#ff5c5c" },
  refunded:  { bg: "rgba(153,153,170,.12)",  clr: "#9999aa" },
};

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: "#3ddc97", color: "#0c0c0e",
      padding: "12px 20px", borderRadius: 10, fontWeight: 700, zIndex: 9999, fontSize: 14 }}>
      ✓ {msg}
    </div>
  );
}

function useToast() {
  const [msg, setMsg] = useState(null);
  const show = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };
  return [msg, show];
}

// ─── Dashboard stats page ──────────────────────────────────────────────────────

function DashboardPage({ setPage }) {
  const stats = {
    products: { total: 24, published: 20, draft: 4 },
    orders: { total: 47, pending: 8, fulfilled: 35, cancelled: 4, revenue: 428900 },
  };
  const cards = [
    { label: "Total Products", value: stats.products.total, sub: `${stats.products.published} published`, color: "#7c6aff", icon: "◈", page: "products" },
    { label: "Total Orders",   value: stats.orders.total,   sub: `${stats.orders.pending} pending`,    color: "#f5a623", icon: "○", page: "orders" },
    { label: "Revenue",        value: fmt(stats.orders.revenue), sub: "All time",              color: "#3ddc97", icon: "⬡", page: "orders" },
    { label: "Fulfilled",      value: stats.orders.fulfilled, sub: `${stats.orders.cancelled} cancelled`, color: "#60a5fa", icon: "✓", page: "orders" },
  ];
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={s.pageTitle}>Dashboard</h1>
        <p style={{ color: "#888", fontSize: 14 }}>Welcome back. Here's what's happening.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16, marginBottom: 48 }}>
        {cards.map((c) => (
          <button key={c.label} onClick={() => setPage(c.page)} style={{ background: "#141417", border: "1px solid #2a2a31",
            borderRadius: 14, padding: 24, textAlign: "left", color: "inherit", cursor: "pointer", transition: "border-color .2s" }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 18, color: c.color, background: `${c.color}18`, marginBottom: 16 }}>{c.icon}</span>
            <div style={{ fontSize: 32, fontWeight: 800, color: c.color, marginBottom: 4 }}>{c.value}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8f0", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{c.sub}</div>
          </button>
        ))}
      </div>
      <div style={{ background: "#141417", border: "1px solid #2a2a31", borderRadius: 16, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => setPage("products")} style={s.actionBtn}>Manage Products →</button>
          <button onClick={() => setPage("orders")}   style={s.actionBtn}>View Orders →</button>
          <button onClick={() => setPage("storefront")} style={s.ghostBtn}>View Storefront ↗</button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin products page ───────────────────────────────────────────────────────

function ProductsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({ title: "", price: "", category: "Tops", status: "published" });
  const [toastMsg, showToast] = useToast();
  const [products] = useState(genProducts);

  const visible = products.filter((p) => {
    const ms = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const mv = status === "all" || p.status === status;
    return ms && mv;
  });

  const toggleSelect = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const selectAll = () => setSelected(selected.length === visible.length ? [] : visible.map((p) => p.id));

  return (
    <div>
      <div style={s.topBar}>
        <div>
          <h1 style={s.pageTitle}>Products</h1>
          <p style={{ color: "#888", fontSize: 14 }}>{products.length} total</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={s.actionBtn}>+ New Product</button>
      </div>
      <div style={s.filters}>
        <input style={s.search} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={s.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        {selected.length > 0 && (
          <button onClick={() => { setSelected([]); showToast(`Deleted ${selected.length} products`); }}
            style={{ padding: "10px 16px", background: "rgba(255,92,92,.12)", color: "#ff5c5c",
              border: "1px solid #ff5c5c44", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
            Delete ({selected.length})
          </button>
        )}
      </div>
      <div style={{ background: "#141417", border: "1px solid #2a2a31", borderRadius: 14, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1c1c21" }}>
              <th style={s.th}><input type="checkbox" checked={selected.length === visible.length && visible.length > 0} onChange={selectAll} /></th>
              {["Product","Category","Price","Stock","Status","Actions"].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #1c1c21" }}>
                <td style={s.td}><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                <td style={s.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={p.thumbnail} alt={p.title} width={40} height={48} style={{ borderRadius: 6, objectFit: "cover" }}
                      onError={(e) => { e.target.src = "https://placehold.co/40x48?text=img"; }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                      <div style={{ color: "#888", fontSize: 12 }}>{p.handle}</div>
                    </div>
                  </div>
                </td>
                <td style={s.td}><span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#1c1c21", color: "#888" }}>{p.category}</span></td>
                <td style={s.td}><span style={{ fontWeight: 700 }}>{fmt(p.price)}</span></td>
                <td style={s.td}>
                  <span style={{ color: (p.variants?.[0]?.inventory ?? 0) > 5 ? "#3ddc97" : "#f5a623" }}>
                    {p.variants?.reduce((a, v) => a + (v.inventory ?? 0), 0) ?? "—"}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                    background: p.status === "published" ? "rgba(61,220,151,.12)" : "rgba(245,166,35,.12)",
                    color: p.status === "published" ? "#3ddc97" : "#f5a623" }}>{p.status}</span>
                </td>
                <td style={s.td}>
                  <button onClick={() => showToast(`Product ${p.status === "published" ? "un" : ""}published`)}
                    style={{ padding: "6px 12px", background: "#1c1c21", border: "1px solid #2a2a31",
                      color: "#e8e8f0", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                    {p.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowAdd(false)}>
          <div style={{ background: "#141417", border: "1px solid #2a2a31", borderRadius: 16, padding: 32, width: "min(480px,90vw)" }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>New Product</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input style={s.input} placeholder="Product title" value={newProduct.title}
                onChange={(e) => setNewProduct((p) => ({ ...p, title: e.target.value }))} />
              <input style={s.input} type="number" placeholder="Price (USD, e.g. 79)" value={newProduct.price}
                onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))} />
              <select style={s.input} value={newProduct.category} onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}>
                {["Tops","Bottoms","Outerwear","Accessories"].map((c) => <option key={c}>{c}</option>)}
              </select>
              <select style={s.input} value={newProduct.status} onChange={(e) => setNewProduct((p) => ({ ...p, status: e.target.value }))}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button style={s.actionBtn} onClick={() => { setShowAdd(false); showToast("Product created!"); }}>Create Product</button>
                <button style={{ padding: "10px 16px", background: "none", border: "1px solid #2a2a31", color: "#888", borderRadius: 8, cursor: "pointer", fontSize: 14 }}
                  onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Toast msg={toastMsg} />
    </div>
  );
}

// ─── Admin orders page ─────────────────────────────────────────────────────────

function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [toastMsg, showToast] = useToast();
  const [orders] = useState(genOrders);

  const filtered = orders.filter((o) => {
    const ms = !search || o.display_id?.includes(search) ||
      `${o.customer?.first_name} ${o.customer?.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.email?.toLowerCase().includes(search.toLowerCase());
    const mv = status === "all" || o.status === status;
    return ms && mv;
  });

  return (
    <div>
      <div style={s.topBar}>
        <div>
          <h1 style={s.pageTitle}>Orders</h1>
          <p style={{ color: "#888", fontSize: 14 }}>{filtered.length} orders</p>
        </div>
      </div>
      <div style={s.filters}>
        <input style={s.search} placeholder="Search by order ID, name, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={s.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          {["pending","paid","fulfilled","cancelled","refunded"].map((v) => (
            <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>
          ))}
        </select>
      </div>
      <div style={{ background: "#141417", border: "1px solid #2a2a31", borderRadius: 14, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1c1c21" }}>
              {["Order","Date","Customer","Items","Total","Status","Actions"].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <>
                <tr key={order.id} style={{ borderTop: "1px solid #1c1c21", cursor: "pointer" }}
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                  <td style={s.td}><span style={{ fontFamily: "monospace", color: "#7c6aff", fontWeight: 700 }}>{order.display_id}</span></td>
                  <td style={s.td}><span style={{ color: "#888", fontSize: 13 }}>{fmtDate(order.created_at)}</span></td>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{order.customer?.first_name} {order.customer?.last_name}</div>
                    <div style={{ color: "#888", fontSize: 12 }}>{order.customer?.email}</div>
                  </td>
                  <td style={s.td}><span style={{ color: "#aaa" }}>{order.items?.length ?? 0} item{order.items?.length !== 1 ? "s" : ""}</span></td>
                  <td style={s.td}><span style={{ fontWeight: 700 }}>{fmt(order.total)}</span></td>
                  <td style={s.td}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                      background: STATUS_CLR[order.status]?.bg ?? "#1c1c21",
                      color: STATUS_CLR[order.status]?.clr ?? "#888" }}>{order.status}</span>
                  </td>
                  <td style={s.td} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {order.status === "paid" && (
                        <button onClick={() => showToast("Order fulfilled")}
                          style={{ padding: "6px 12px", background: "rgba(61,220,151,.12)", border: "1px solid #3ddc9744",
                            color: "#3ddc97", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Fulfill</button>
                      )}
                      {["pending","paid"].includes(order.status) && (
                        <button onClick={() => showToast("Order cancelled")}
                          style={{ padding: "6px 12px", background: "rgba(255,92,92,.1)", border: "1px solid #ff5c5c44",
                            color: "#ff5c5c", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                      )}
                      {order.status === "fulfilled" && (
                        <button onClick={() => showToast("Order refunded")}
                          style={{ padding: "6px 12px", background: "rgba(255,92,92,.1)", border: "1px solid #ff5c5c44",
                            color: "#ff5c5c", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Refund</button>
                      )}
                    </div>
                  </td>
                </tr>
                {expanded === order.id && (
                  <tr key={`${order.id}-detail`}>
                    <td colSpan={7} style={{ padding: "0 0 0 48px", background: "#0c0c0e" }}>
                      <div style={{ padding: "16px 20px 20px", borderLeft: "2px solid #7c6aff33" }}>
                        <p style={{ fontSize: 12, color: "#888", marginBottom: 10, fontWeight: 700, textTransform: "uppercase" }}>Order Items</p>
                        {order.items?.map((item, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0",
                            borderBottom: "1px solid #1c1c21", fontSize: 14 }}>
                            <span>{item.qty ?? 1}× {item.title}</span>
                            <span style={{ fontWeight: 700 }}>{fmt(item.price * (item.qty ?? 1))}</span>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 700 }}>
                          <span>Total</span><span>{fmt(order.total)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>No orders found</div>
        )}
      </div>
      <Toast msg={toastMsg} />
    </div>
  );
}

// ─── Storefront view ───────────────────────────────────────────────────────────

function StorefrontPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toastMsg, showToast] = useToast();
  const products = genStorefrontProducts(36);

  const visible = products.filter((p) => {
    if (p.status !== "published") return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "All" && p.category !== category) return false;
    return true;
  });

  const addToCart = (p) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      if (ex) return prev.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...p, qty: 1 }];
    });
    showToast(`${p.title} added to cart`);
  };

  const cartCount = cart.reduce((n, i) => n + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty * 100, 0);

  return (
    <div>
      {/* Storefront header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={s.pageTitle}>Storefront</h1>
          <p style={{ color: "#888", fontSize: 14 }}>{visible.length} products available</p>
        </div>
        <button onClick={() => setCartOpen(true)} style={{ position: "relative", padding: "10px 16px",
          background: "#141417", border: "1px solid #2a2a31", borderRadius: 10,
          color: "#e8e8f0", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          🛒 Cart
          {cartCount > 0 && (
            <span style={{ position: "absolute", top: -6, right: -6, background: "#7c6aff", color: "#fff",
              borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700 }}>{cartCount}</span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <input style={{ ...s.search, flex: "none", width: 220 }} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {["All", ...CATEGORIES].map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            style={{ padding: "8px 16px", borderRadius: 20, border: "1px solid",
              borderColor: category === cat ? "#7c6aff" : "#2a2a31",
              background: category === cat ? "rgba(124,106,255,.15)" : "transparent",
              color: category === cat ? "#7c6aff" : "#888", fontSize: 13, cursor: "pointer" }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
        {visible.map((p) => (
          <div key={p.id} style={{ background: "#141417", border: "1px solid #2a2a31", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden" }}>
              <img src={p.thumbnail} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { e.target.src = "https://placehold.co/200x250?text=img"; }} />
              {p.tags.length > 0 && (
                <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, fontWeight: 700, padding: "3px 8px",
                  borderRadius: 20, background: p.tags[0] === "sale" ? "#ff5c5c" : p.tags[0] === "new" ? "#7c6aff" : "#3ddc97",
                  color: "#fff", textTransform: "uppercase" }}>{p.tags[0]}</span>
              )}
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{p.category}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: p.originalPrice ? "#ff5c5c" : "#e8e8f0" }}>${p.price}</span>
                  {p.originalPrice && <span style={{ fontSize: 12, color: "#888", textDecoration: "line-through", marginLeft: 6 }}>${p.originalPrice}</span>}
                </div>
                <button onClick={() => addToCart(p)}
                  style={{ padding: "6px 12px", background: "rgba(124,106,255,.2)", border: "1px solid #7c6aff44",
                    color: "#7c6aff", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Add</button>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: "#666" }}>
                {"★".repeat(Math.round(p.rating))}{"☆".repeat(5 - Math.round(p.rating))} ({p.reviewCount})
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cart drawer */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500 }} onClick={() => setCartOpen(false)}>
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 360, background: "#141417",
            borderLeft: "1px solid #2a2a31", padding: 24, overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Cart ({cartCount})</h2>
              <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            {cart.length === 0 ? (
              <p style={{ color: "#888", textAlign: "center", marginTop: 60 }}>Your cart is empty</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.id} style={{ display: "flex", gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #2a2a31" }}>
                    <img src={item.thumbnail} alt={item.title} width={60} height={72} style={{ borderRadius: 8, objectFit: "cover" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{item.category}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button onClick={() => setCart((prev) => item.qty === 1 ? prev.filter((i) => i.id !== item.id) : prev.map((i) => i.id === item.id ? { ...i, qty: i.qty - 1 } : i))}
                            style={{ width: 24, height: 24, borderRadius: 4, background: "#1c1c21", border: "1px solid #2a2a31", color: "#e8e8f0", cursor: "pointer" }}>−</button>
                          <span style={{ fontSize: 13 }}>{item.qty}</span>
                          <button onClick={() => setCart((prev) => prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i))}
                            style={{ width: 24, height: 24, borderRadius: 4, background: "#1c1c21", border: "1px solid #2a2a31", color: "#e8e8f0", cursor: "pointer" }}>+</button>
                        </div>
                        <span style={{ fontWeight: 700 }}>${(item.price * item.qty).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #2a2a31", paddingTop: 16, marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontWeight: 700, fontSize: 16 }}>
                    <span>Total</span><span>{fmt(cartTotal)}</span>
                  </div>
                  <button onClick={() => { setCart([]); setCartOpen(false); showToast("Order placed!"); }}
                    style={{ width: "100%", padding: 14, background: "#7c6aff", color: "#fff", border: "none",
                      borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Checkout</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <Toast msg={toastMsg} />
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const s = {
  pageTitle: { fontSize: 28, fontWeight: 800, marginBottom: 4, margin: 0 },
  topBar:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  filters:   { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  search:    { flex: 1, minWidth: 200, padding: "10px 14px", background: "#141417", border: "1px solid #2a2a31",
               borderRadius: 8, color: "#e8e8f0", fontSize: 14, outline: "none" },
  select:    { padding: "10px 14px", background: "#141417", border: "1px solid #2a2a31",
               borderRadius: 8, color: "#e8e8f0", fontSize: 14, cursor: "pointer" },
  th:        { padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888",
               textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" },
  td:        { padding: "14px 16px", fontSize: 14 },
  actionBtn: { padding: "10px 20px", background: "#7c6aff", color: "#fff", border: "none",
               borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  ghostBtn:  { padding: "10px 20px", background: "none", color: "#888", border: "1px solid #2a2a31",
               borderRadius: 8, fontSize: 14, cursor: "pointer" },
  input:     { width: "100%", padding: "12px 14px", background: "#1c1c21", border: "1px solid #2a2a31",
               borderRadius: 8, color: "#e8e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" },
};

// ─── Nav items ─────────────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard",  label: "Dashboard",  icon: "⬡", section: "admin" },
  { id: "products",   label: "Products",   icon: "◈", section: "admin" },
  { id: "orders",     label: "Orders",     icon: "○", section: "admin" },
  { id: "storefront", label: "Storefront", icon: "⬢", section: "store" },
];

// ─── Root shell ────────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

export default function UnifiedDashboard() {
  const [page, setPage] = useState("dashboard");

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ display: "flex", height: "100vh", background: "#0c0c0e", color: "#e8e8f0",
        fontFamily: "monospace", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 200, flexShrink: 0, borderRight: "1px solid #1c1c21", display: "flex",
          flexDirection: "column", background: "#0a0a0c", position: "sticky", top: 0, height: "100vh" }}>

          {/* Logo */}
          <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1c1c21",
            display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#e8e8f0" }}>commit&amp;conquer</span>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Admin section */}
            <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "8px 12px 4px", fontFamily: "sans-serif" }}>Admin</div>
            {NAV.filter((n) => n.section === "admin").map((n) => (
              <button key={n.id} onClick={() => setPage(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 7,
                  border: "none", cursor: "pointer", fontSize: 13, fontFamily: "monospace", textAlign: "left",
                  background: page === n.id ? "rgba(124,106,255,.15)" : "transparent",
                  color: page === n.id ? "#7c6aff" : "#888", transition: "all .15s" }}>
                <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
              </button>
            ))}

            {/* Divider */}
            <div style={{ height: 1, background: "#1c1c21", margin: "8px 4px" }} />

            {/* Store section */}
            <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "4px 12px", fontFamily: "sans-serif" }}>Store</div>
            {NAV.filter((n) => n.section === "store").map((n) => (
              <button key={n.id} onClick={() => setPage(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 7,
                  border: "none", cursor: "pointer", fontSize: 13, fontFamily: "monospace", textAlign: "left",
                  background: page === n.id ? "rgba(61,220,151,.12)" : "transparent",
                  color: page === n.id ? "#3ddc97" : "#888", transition: "all .15s" }}>
                <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid #1c1c21" }}>
            <div style={{ fontSize: 11, color: "#555" }}>Unified Dashboard</div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>admin + storefront</div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "36px 40px" }}>
          {page === "dashboard"  && <DashboardPage setPage={setPage} />}
          {page === "products"   && <ProductsPage />}
          {page === "orders"     && <OrdersPage />}
          {page === "storefront" && <StorefrontPage />}
        </main>
      </div>
    </QueryClientProvider>
  );
}