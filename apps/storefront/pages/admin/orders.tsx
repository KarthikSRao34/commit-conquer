
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const ADMIN   = "/api/admin";
const HEADERS = { "Content-Type": "application/json", "X-Admin-Secret": "admin_dev_secret" };

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "rgba(245,166,35,0.12)",  color: "#f5a623" },
  paid:      { bg: "rgba(96,165,250,0.12)",   color: "#60a5fa" },
  fulfilled: { bg: "rgba(61,220,151,0.12)",   color: "#3ddc97" },
  cancelled: { bg: "rgba(255,92,92,0.12)",    color: "#ff5c5c" },
  refunded:  { bg: "rgba(153,153,170,0.12)",  color: "#9999aa" },
};

async function fetchOrders(search = "", status = "all") {
  try {
    const params = new URLSearchParams({ limit: "50", search, status });
    const res = await fetch(`${ADMIN}/orders?${params}`, { headers: HEADERS });
    if (res.ok) { const d = await res.json(); return d.orders ?? d.data ?? []; }
  } catch {}
  
  const names = [["Ethan","Cole"],["Maya","Patel"],["Lucas","Kim"],["Zoe","Turner"],["Aiden","Brooks"],["Sara","Nolan"]];
  const statuses = ["pending","paid","fulfilled","cancelled","fulfilled","paid"];
  const items = [
    [{ title: "Obsidian Crew Neck", price: 7900, qty: 1 }],
    [{ title: "Slate Cargo Pant", price: 11900, qty: 1 },{ title: "Onyx Hoodie", price: 9400, qty: 1 }],
    [{ title: "Granite Bomber", price: 16800, qty: 1 }],
    [{ title: "Carbon Jogger", price: 8900, qty: 2 }],
    [{ title: "Ash Trench Coat", price: 22900, qty: 1 }],
    [{ title: "Basalt Windbreaker", price: 13400, qty: 1 }],
  ];
  return Array.from({ length: 12 }, (_, i) => {
    const ni = i % 6;
    const total = items[ni].reduce((s, x) => s + x.price * x.qty, 0);
    return {
      id: `order_${String(i+1).padStart(4,"0")}`,
      display_id: `#${1000 + i}`,
      status: statuses[ni],
      customer: { first_name: names[ni][0], last_name: names[ni][1], email: `${names[ni][0].toLowerCase()}@example.com` },
      items: items[ni],
      total: total + 599,
      created_at: new Date(Date.now() - i * 86400000 * 2).toISOString(),
    };
  });
}

export default function AdminOrders() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast]     = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders", search, status],
    queryFn: () => fetchOrders(search, status),
    staleTime: 10_000,
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const action = async (orderId: string, type: "fulfill" | "cancel" | "refund", amount?: number) => {
    try {
      const body = type === "refund" ? JSON.stringify({ amount, reason: "Customer request" }) : undefined;
      await fetch(`${ADMIN}/orders/${orderId}/${type}`, { method: "POST", headers: HEADERS, body });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      showToast(`Order ${type}ed`);
    } catch { showToast("Error updating order"); }
  };

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const filtered = orders.filter((o: any) => {
    const matchSearch = !search || o.display_id?.includes(search) ||
      `${o.customer?.first_name} ${o.customer?.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "all" || o.status === status;
    return matchSearch && matchStatus;
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
            <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
          ))}
        </select>
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {["Order","Date","Customer","Items","Total","Status","Actions"].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}><td colSpan={7} style={{ padding: "16px 20px" }}><div style={{ height: 20, background: "#1c1c21", borderRadius: 4, width: `${50 + i * 8}%` }} /></td></tr>
              ))
            ) : filtered.map((order: any) => (
              <>
                <tr key={order.id} style={{ ...s.tr, cursor: "pointer" }} onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                  <td style={s.td}><span style={{ fontFamily: "monospace", color: "#7c6aff", fontWeight: 700 }}>{order.display_id}</span></td>
                  <td style={s.td}><span style={{ color: "#888", fontSize: 13 }}>{fmtDate(order.created_at)}</span></td>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{order.customer?.first_name} {order.customer?.last_name}</div>
                    <div style={{ color: "#888", fontSize: 12 }}>{order.customer?.email}</div>
                  </td>
                  <td style={s.td}><span style={{ color: "#aaa" }}>{order.items?.length ?? 0} item{order.items?.length !== 1 ? "s" : ""}</span></td>
                  <td style={s.td}><span style={{ fontWeight: 700 }}>{fmt(order.total)}</span></td>
                  <td style={s.td}>
                    <span style={{ ...s.statusBadge, ...(STATUS_COLORS[order.status] ?? { bg: "#1c1c21", color: "#888" }), background: STATUS_COLORS[order.status]?.bg ?? "#1c1c21" }}>
                      {order.status}
                    </span>
                  </td>
                  <td style={s.td} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {order.status === "paid" && (
                        <button onClick={() => action(order.id, "fulfill")} style={s.actionBtn}>Fulfill</button>
                      )}
                      {["pending","paid"].includes(order.status) && (
                        <button onClick={() => action(order.id, "cancel")} style={s.cancelBtn}>Cancel</button>
                      )}
                      {order.status === "fulfilled" && (
                        <button onClick={() => action(order.id, "refund", order.total)} style={s.cancelBtn}>Refund</button>
                      )}
                    </div>
                  </td>
                </tr>
                {expanded === order.id && (
                  <tr key={`${order.id}-detail`}>
                    <td colSpan={7} style={{ padding: "0 0 0 48px", background: "#0c0c0e" }}>
                      <div style={{ padding: "16px 20px 20px", borderLeft: "2px solid #7c6aff33" }}>
                        <p style={{ fontSize: 12, color: "#888", marginBottom: 10, fontWeight: 700, textTransform: "uppercase" }}>Order Items</p>
                        {order.items?.map((item: any, i: number) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1c1c21", fontSize: 14 }}>
                            <span>{item.qty ?? item.quantity ?? 1}× {item.title}</span>
                            <span style={{ fontWeight: 700 }}>{fmt(item.price * (item.qty ?? item.quantity ?? 1))}</span>
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
        {!isLoading && filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>No orders found</div>
        )}
      </div>

      {toast && <div style={s.toast}>✓ {toast}</div>}
    </div>
  );
}

const s: Record<string, any> = {
  topBar:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  filters:   { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  search:    { flex: 1, minWidth: 240, padding: "10px 14px", background: "#141417", border: "1px solid #2a2a31", borderRadius: 8, color: "#e8e8f0", fontSize: 14, outline: "none" },
  select:    { padding: "10px 14px", background: "#141417", border: "1px solid #2a2a31", borderRadius: 8, color: "#e8e8f0", fontSize: 14, cursor: "pointer" },
  tableWrap: { background: "#141417", border: "1px solid #2a2a31", borderRadius: 14, overflow: "auto" },
  table:     { width: "100%", borderCollapse: "collapse" },
  thead:     { background: "#1c1c21" },
  th:        { padding: "12px 16px", textAlign: "left" as const, fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5, whiteSpace: "nowrap" as const },
  tr:        { borderTop: "1px solid #1c1c21", transition: "background 0.15s" },
  td:        { padding: "14px 16px", fontSize: 14 },
  statusBadge: { fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 },
  actionBtn: { padding: "6px 12px", background: "rgba(61,220,151,0.12)", border: "1px solid #3ddc9744", color: "#3ddc97", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  cancelBtn: { padding: "6px 12px", background: "rgba(255,92,92,0.1)", border: "1px solid #ff5c5c44", color: "#ff5c5c", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  toast:     { position: "fixed" as const, bottom: 24, right: 24, background: "#3ddc97", color: "#0c0c0e", padding: "12px 20px", borderRadius: 10, fontWeight: 700, zIndex: 999, fontSize: 14 },
};