import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import DataTable from "./DataTable";


const STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];
const NAMES = [
  "Ethan Cole",
  "Maya Patel",
  "Lucas Kim",
  "Zoe Turner",
  "Aiden Brooks",
  "Sara Nolan",
  "James Wu",
  "Priya Shah",
  "Owen Reed",
  "Layla Cross",
];
const ITEM_SETS = [
  [
    { name: "Obsidian Crew Neck", price: 29 },
    { name: "Slate Cargo Pant", price: 46 },
  ],
  [{ name: "Onyx Hoodie", price: 63 }],
  [
    { name: "Granite Bomber", price: 80 },
    { name: "Carbon Jogger", price: 114 },
  ],
  [{ name: "Ash Trench Coat", price: 97 }],
  [
    { name: "Basalt Windbreaker", price: 131 },
    { name: "Cinder Vest", price: 55 },
  ],
  [{ name: "Charcoal Denim", price: 148 }],
];

const ALL_ORDERS = Array.from({ length: 38 }, (_, i) => {
  const rawItems = ITEM_SETS[i % ITEM_SETS.length];
  const items = rawItems.map((it, j) => ({
    id: `item_${i}_${j}`,
    name: it.name,
    price: it.price,
    qty: 1 + (j % 2),
  }));
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  return {
    id: `ORD-${String(1000 + i).padStart(4, "0")}`,
    customer: NAMES[i % NAMES.length],
    email: `${NAMES[i % NAMES.length].split(" ")[0].toLowerCase()}@example.com`,
    status: STATUSES[i % STATUSES.length],
    total,
    items,
    createdAt: new Date(Date.now() - i * 86400000 * 2).toLocaleDateString(),
    address: `${100 + i * 7} Maple Ave, San Francisco, CA 9410${i % 10}`,
  };
});

const fetchOrders = async ({ search, status }) => {
  await new Promise((r) => setTimeout(r, 100));
  let result = ALL_ORDERS;
  if (status !== "all") result = result.filter((o) => o.status === status);
  if (search)
    result = result.filter(
      (o) =>
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.customer.toLowerCase().includes(search.toLowerCase()) ||
        o.email.toLowerCase().includes(search.toLowerCase()),
    );
  return result;
};

const apiFulfill = async (id) => {
  await new Promise((r) => setTimeout(r, 700));
  return id;
};
const apiCancel = async (id) => {
  await new Promise((r) => setTimeout(r, 700));
  return id;
};
const apiRefund = async ({ id, amount }) => {
  await new Promise((r) => setTimeout(r, 900));
  return { id, amount };
};


const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0c0c0e;
    --surface: #141417;
    --surface2: #1c1c21;
    --border: #2a2a31;
    --border-hover: #404050;
    --text: #e8e8f0;
    --text-muted: #6b6b80;
    --text-dim: #9999aa;
    --accent: #7c6aff;
    --accent-dim: rgba(124,106,255,0.15);
    --accent-glow: rgba(124,106,255,0.3);
    --green: #3ddc97;
    --green-dim: rgba(61,220,151,0.12);
    --amber: #f5a623;
    --amber-dim: rgba(245,166,35,0.12);
    --red: #ff5c5c;
    --red-dim: rgba(255,92,92,0.12);
    --blue: #4da8ff;
    --blue-dim: rgba(77,168,255,0.12);
    --purple: #b06aff;
    --purple-dim: rgba(176,106,255,0.12);
    --radius: 6px;
    --radius-lg: 10px;
    --mono: 'DM Mono', monospace;
    --sans: 'Syne', sans-serif;
    --transition: 160ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  html, body { height: 100%; overflow: hidden; }
  body { background: var(--bg); color: var(--text); font-family: var(--sans); }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--border-hover); }

  .page {
    height: 100vh; display: flex; flex-direction: column; overflow: hidden;
    background: var(--bg);
    background-image: radial-gradient(ellipse 50% 40% at 80% -10%, rgba(77,168,255,0.05) 0%, transparent 60%);
  }

  /* Header */
  .header {
    flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
    padding: 20px 32px; border-bottom: 1px solid var(--border);
  }
  .header-left h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .header-left p { font-size: 13px; color: var(--text-muted); margin-top: 2px; font-family: var(--mono); }

  /* Buttons */
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: var(--radius); border: none;
    font-family: var(--sans); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all var(--transition);
  }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: #9080ff; box-shadow: 0 0 16px var(--accent-glow); }
  .btn-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--surface2); color: var(--text); border-color: var(--border-hover); }
  .btn-danger { background: var(--red-dim); color: var(--red); border: 1px solid rgba(255,92,92,0.25); }
  .btn-danger:hover { background: rgba(255,92,92,0.22); }
  .btn-green { background: var(--green-dim); color: var(--green); border: 1px solid rgba(61,220,151,0.25); }
  .btn-green:hover { background: rgba(61,220,151,0.22); }
  .btn-amber { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(245,166,35,0.25); }
  .btn-amber:hover { background: rgba(245,166,35,0.22); }
  .btn-sm { padding: 6px 12px; font-size: 12px; }
  .btn-full { width: 100%; justify-content: center; }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }

  /* Stats / filter tabs */
  .stats { flex-shrink: 0; display: flex; border-bottom: 1px solid var(--border); overflow-x: auto; }
  .stat {
    padding: 12px 24px; border-right: 1px solid var(--border);
    cursor: pointer; transition: background var(--transition); white-space: nowrap; flex-shrink: 0;
  }
  .stat:last-child { border-right: none; }
  .stat:hover { background: var(--surface); }
  .stat.active { background: var(--accent-dim); }
  .stat.active .stat-lbl { color: var(--accent); }
  .stat-val { font-size: 18px; font-weight: 800; font-family: var(--mono); }
  .stat-lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 1px; }

  /* Toolbar */
  .toolbar {
    flex-shrink: 0; display: flex; align-items: center; gap: 10px;
    padding: 12px 32px; border-bottom: 1px solid var(--border); background: var(--surface);
  }
  .search-wrap { position: relative; flex: 1; max-width: 340px; }
  .search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
  .search-input {
    width: 100%; padding: 8px 12px 8px 34px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    font-family: var(--mono); font-size: 13px; outline: none;
    transition: border-color var(--transition);
  }
  .search-input::placeholder { color: var(--text-muted); }
  .search-input:focus { border-color: var(--accent); }
  .spacer { flex: 1; }

  /* Select */
  .select-trigger {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 12px; background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text-dim); font-family: var(--mono); font-size: 13px;
    cursor: pointer; outline: none; transition: border-color var(--transition); white-space: nowrap;
  }
  .select-trigger:hover, .select-trigger[data-state="open"] { border-color: var(--accent); color: var(--text); }
  .select-content {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius-lg); overflow: hidden;
    box-shadow: 0 16px 40px rgba(0,0,0,0.5); z-index: 100;
    animation: fadeIn 120ms ease;
  }
  @keyframes fadeIn { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform:translateY(0); } }
  .select-item {
    padding: 9px 14px; font-family: var(--mono); font-size: 13px; color: var(--text-dim);
    cursor: pointer; outline: none; transition: background var(--transition);
  }
  .select-item:hover, .select-item[data-highlighted] { background: var(--accent-dim); color: var(--text); }
  .select-item[data-state="checked"] { color: var(--accent); }

  /* Table container — only this scrolls */
  .table-wrap { flex: 1; overflow-y: auto; overflow-x: hidden; overflow-anchor: none; }

  table { width: 100%; border-collapse: collapse; }
  thead th {
    position: sticky; top: 0; z-index: 10; background: var(--bg);
    text-align: left; padding: 12px 14px;
    font-family: var(--mono); font-size: 11px; font-weight: 500;
    color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase;
    border-bottom: 1px solid var(--border);
  }
  tbody tr { border-bottom: 1px solid var(--border); transition: background var(--transition); cursor: pointer; }
  tbody tr:hover { background: var(--surface); }
  tbody td { padding: 13px 14px; font-size: 14px; vertical-align: middle; }
  .td-mono { font-family: var(--mono); font-size: 12px; color: var(--text-muted); }
  .td-id { font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--accent); }
  .td-total { font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--green); }
  .td-customer { font-weight: 600; }
  .td-email { font-family: var(--mono); font-size: 12px; color: var(--text-muted); margin-top: 2px; }

  /* Badges */
  .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-family: var(--mono); font-weight: 500; }
  .badge-dot { width: 5px; height: 5px; border-radius: 50%; }
  .badge-pending    { background: var(--amber-dim);  color: var(--amber);      } .badge-pending .badge-dot    { background: var(--amber); }
  .badge-processing { background: var(--blue-dim);   color: var(--blue);       } .badge-processing .badge-dot { background: var(--blue); }
  .badge-shipped    { background: var(--purple-dim); color: var(--purple);     } .badge-shipped .badge-dot    { background: var(--purple); }
  .badge-delivered  { background: var(--green-dim);  color: var(--green);      } .badge-delivered .badge-dot  { background: var(--green); }
  .badge-cancelled  { background: var(--red-dim);    color: var(--red);        } .badge-cancelled .badge-dot  { background: var(--red); }
  .badge-refunded   { background: var(--surface2);   color: var(--text-muted); } .badge-refunded .badge-dot   { background: var(--text-muted); }

  /* Row actions */
  .row-actions { display: flex; gap: 6px; opacity: 0; transition: opacity var(--transition); }
  tbody tr:hover .row-actions { opacity: 1; }

  /* Skeleton */
  .skeleton { background: var(--surface2); border-radius: 4px; animation: shimmer 1.4s infinite; }
  @keyframes shimmer { 0%,100% { opacity:0.5; } 50% { opacity:1; } }

  /* Empty */
  .empty { text-align: center; padding: 64px 32px; }
  .empty-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.4; }
  .empty h3 { font-size: 16px; font-weight: 700; }
  .empty p { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

  .end-msg { text-align: center; padding: 20px; font-family: var(--mono); font-size: 12px; color: var(--text-muted); }

  /* ── Order Detail Drawer ── */
  .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 300; animation: fadeIn 150ms ease; }
  .drawer {
    position: fixed; top: 0; right: 0; bottom: 0; width: 440px;
    background: var(--surface); border-left: 1px solid var(--border);
    z-index: 301; display: flex; flex-direction: column;
    animation: slideInRight 220ms cubic-bezier(0.4,0,0.2,1);
    box-shadow: -16px 0 48px rgba(0,0,0,0.4);
  }
  @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }

  .drawer-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 22px 24px; border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .drawer-title { font-size: 17px; font-weight: 800; color: var(--accent); font-family: var(--mono); }
  .drawer-subtitle { font-size: 12px; color: var(--text-muted); font-family: var(--mono); margin-top: 3px; }
  .drawer-close { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; border-radius: 4px; transition: color var(--transition); }
  .drawer-close:hover { color: var(--text); }

  .drawer-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 22px; }

  .section-label {
    font-size: 10px; font-family: var(--mono); text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 10px;
  }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .info-card { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; }
  .info-card-lbl { font-size: 10px; font-family: var(--mono); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .info-card-val { font-size: 13px; font-weight: 600; }
  .info-card-full { grid-column: 1 / -1; }

  .items-list { display: flex; flex-direction: column; gap: 8px; }
  .order-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
  }
  .order-item-name { font-size: 13px; font-weight: 600; }
  .order-item-meta { font-family: var(--mono); font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .order-item-price { font-family: var(--mono); font-size: 13px; color: var(--green); flex-shrink: 0; }

  .order-total-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); margin-top: 4px;
  }
  .order-total-lbl { font-family: var(--mono); font-size: 12px; color: var(--text-muted); }
  .order-total-val { font-family: var(--mono); font-size: 16px; font-weight: 700; color: var(--green); }

  /* Actions */
  .actions-grid { display: flex; flex-direction: column; gap: 8px; }
  .actions-disabled-msg { font-family: var(--mono); font-size: 12px; color: var(--text-muted); padding: 10px 0; }

  /* Refund box — the key bug fix lives here */
  .refund-box {
    background: rgba(255,92,92,0.07); border: 1px solid rgba(255,92,92,0.2);
    border-radius: var(--radius-lg); padding: 16px;
  }
  .refund-box-title { font-size: 12px; font-weight: 700; color: var(--red); margin-bottom: 12px; font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.06em; }
  .refund-row { display: flex; gap: 8px; align-items: center; }
  .refund-prefix { font-family: var(--mono); font-size: 15px; color: var(--text-muted); }
  .refund-input {
    flex: 1; padding: 9px 12px;
    background: var(--bg); border: 1px solid rgba(255,92,92,0.3);
    border-radius: var(--radius); color: var(--text);
    font-family: var(--mono); font-size: 15px; outline: none;
    transition: border-color var(--transition);
  }
  .refund-input:focus { border-color: var(--red); }
  .refund-hint { font-family: var(--mono); font-size: 11px; color: var(--text-muted); margin-top: 8px; }
  .refund-hint em { color: var(--green); font-style: normal; }

  /* Confirm Dialog */
  .dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 500; animation: fadeIn 150ms ease; }
  .dialog-content {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 28px; width: 400px; z-index: 501;
    animation: scaleIn 150ms ease; box-shadow: 0 24px 60px rgba(0,0,0,0.6);
  }
  @keyframes scaleIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.96); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
  .dialog-title { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
  .dialog-desc { font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 22px; }
  .dialog-desc strong { color: var(--text); }
  .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; }

  @keyframes spin { to { transform: rotate(360deg); } }
`;


const STATUS_CONFIG = {
  all: { label: "All", color: "var(--text)" },
  pending: { label: "Pending", color: "var(--amber)" },
  processing: { label: "Processing", color: "var(--blue)" },
  shipped: { label: "Shipped", color: "var(--purple)" },
  delivered: { label: "Delivered", color: "var(--green)" },
  cancelled: { label: "Cancelled", color: "var(--red)" },
  refunded: { label: "Refunded", color: "var(--text-muted)" },
};


function OrderDrawer({ order, onClose }) {
  const queryClient = useQueryClient();
  const [refundAmount, setRefundAmount] = useState("");
  const [confirm, setConfirm] = useState(null); // { type, label, btnClass, desc }

  const fulfillMutation = useMutation({
    mutationFn: () => apiFulfill(order.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
  });
  const cancelMutation = useMutation({
    mutationFn: () => apiCancel(order.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
  });
  const refundMutation = useMutation({
    mutationFn: () =>
      apiRefund({ id: order.id, amount: parseFloat(refundAmount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
  });

  
  const handleRefundChange = (e) => {
    const raw = e.target.value;
    if (raw === "" || raw === ".") {
      setRefundAmount(raw);
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num) || num < 0) return;
    
    setRefundAmount(String(Math.min(num, order.total)));
  };

  const parsedRefund = parseFloat(refundAmount) || 0;
  const refundValid = parsedRefund > 0 && parsedRefund <= order.total;

  const canFulfill = ["pending", "processing"].includes(order.status);
  const canCancel = ["pending", "processing"].includes(order.status);
  const canRefund = ["delivered", "shipped"].includes(order.status);
  const isBusy =
    fulfillMutation.isPending ||
    cancelMutation.isPending ||
    refundMutation.isPending;

  const execConfirm = () => {
    if (!confirm) return;
    if (confirm.type === "fulfill") fulfillMutation.mutate();
    else if (confirm.type === "cancel") cancelMutation.mutate();
    else if (confirm.type === "refund") refundMutation.mutate();
    setConfirm(null);
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        
        <div className="drawer-header">
          <div>
            <div className="drawer-title">{order.id}</div>
            <div className="drawer-subtitle">
              {order.createdAt} · {order.email}
            </div>
          </div>
          <button className="drawer-close" onClick={onClose}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          {/* Order info */}
          <div>
            <div className="section-label">Order Info</div>
            <div className="info-grid">
              <div className="info-card">
                <div className="info-card-lbl">Customer</div>
                <div className="info-card-val">{order.customer}</div>
              </div>
              <div className="info-card">
                <div className="info-card-lbl">Status</div>
                <div className="info-card-val">
                  <span className={`badge badge-${order.status}`}>
                    <span className="badge-dot" />
                    {order.status}
                  </span>
                </div>
              </div>
              <div className="info-card info-card-full">
                <div className="info-card-lbl">Shipping Address</div>
                <div
                  className="info-card-val"
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    fontWeight: 400,
                  }}
                >
                  {order.address}
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="section-label">Items ({order.items.length})</div>
            <div className="items-list">
              {order.items.map((item) => (
                <div className="order-item" key={item.id}>
                  <div>
                    <div className="order-item-name">{item.name}</div>
                    <div className="order-item-meta">
                      Qty {item.qty} × ${item.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="order-item-price">
                    ${(item.price * item.qty).toFixed(2)}
                  </div>
                </div>
              ))}
              <div className="order-total-row">
                <span className="order-total-lbl">Order Total</span>
                <span className="order-total-val">
                  ${order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Fulfillment Actions */}
          <div>
            <div className="section-label">Fulfillment</div>
            <div className="actions-grid">
              {canFulfill && (
                <button
                  className="btn btn-green"
                  disabled={isBusy}
                  onClick={() =>
                    setConfirm({
                      type: "fulfill",
                      label: "Mark as Fulfilled",
                      btnClass: "btn-green",
                      desc: (
                        <>
                          Mark order <strong>{order.id}</strong> as fulfilled?
                          This will notify the customer.
                        </>
                      ),
                    })
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {fulfillMutation.isPending
                    ? "Fulfilling…"
                    : "Mark as Fulfilled"}
                </button>
              )}
              {canCancel && (
                <button
                  className="btn btn-danger"
                  disabled={isBusy}
                  onClick={() =>
                    setConfirm({
                      type: "cancel",
                      label: "Cancel Order",
                      btnClass: "btn-danger",
                      desc: (
                        <>
                          Cancel order <strong>{order.id}</strong>? This cannot
                          be undone.
                        </>
                      ),
                    })
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  {cancelMutation.isPending ? "Cancelling…" : "Cancel Order"}
                </button>
              )}
              {!canFulfill && !canCancel && (
                <p className="actions-disabled-msg">
                  No fulfillment actions available — order is{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {order.status}
                  </strong>
                  .
                </p>
              )}
            </div>
          </div>

          {/* Refund — with client-side cap */}
          {canRefund && (
            <div>
              <div className="section-label">Refund</div>
              <div className="refund-box">
                <div className="refund-box-title">Issue Refund</div>
                <div className="refund-row">
                  <span className="refund-prefix">$</span>
                  <input
                    className="refund-input"
                    type="number"
                    min="0"
                    max={order.total} // ✅ HTML attribute cap
                    step="0.01"
                    placeholder={`0.00`}
                    value={refundAmount}
                    onChange={handleRefundChange} // ✅ JS logic cap
                  />
                  <button
                    className="btn btn-amber btn-sm"
                    disabled={!refundValid || isBusy}
                    onClick={() =>
                      setConfirm({
                        type: "refund",
                        label: "Issue Refund",
                        btnClass: "btn-amber",
                        desc: (
                          <>
                            Issue a refund of{" "}
                            <strong>${parsedRefund.toFixed(2)}</strong> for
                            order <strong>{order.id}</strong>?
                          </>
                        ),
                      })
                    }
                  >
                    {refundMutation.isPending ? "Processing…" : "Refund"}
                  </button>
                </div>
                {/* Hint shows max allowed */}
                <div className="refund-hint">
                  Max refund: <em>${order.total.toFixed(2)}</em>
                  {parsedRefund > 0 && parsedRefund <= order.total && (
                    <span style={{ marginLeft: 12, color: "var(--amber)" }}>
                      Refunding ${parsedRefund.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirm && (
        <Dialog.Root open onOpenChange={() => setConfirm(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="dialog-content">
              <Dialog.Title className="dialog-title">
                {confirm.label}
              </Dialog.Title>
              <Dialog.Description className="dialog-desc">
                {confirm.desc}
              </Dialog.Description>
              <div className="dialog-actions">
                <Dialog.Close asChild>
                  <button className="btn btn-ghost">Cancel</button>
                </Dialog.Close>
                <button
                  className={`btn ${confirm.btnClass}`}
                  onClick={execConfirm}
                  disabled={isBusy}
                >
                  {isBusy ? "Processing…" : "Confirm"}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
}


export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data: orders = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["orders", { search: debouncedSearch, status: statusFilter }],
    queryFn: () =>
      fetchOrders({ search: debouncedSearch, status: statusFilter }),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Sort
  const sorted = [...orders].sort((a, b) => {
    if (sortBy === "newest")
      return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === "oldest")
      return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === "total-hi") return b.total - a.total;
    if (sortBy === "total-lo") return a.total - b.total;
    return 0;
  });

  // Stat counts
  const counts = ALL_ORDERS.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <style>{css}</style>
      <div className="page">
        
        <div className="header">
          <div className="header-left">
            <h1>Orders</h1>
            <p>Manage fulfillment & refunds</p>
          </div>
          {isFetching && !isLoading && (
            <div
              style={{
                width: 16,
                height: 16,
                border: "2px solid var(--border)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
          )}
        </div>

        {/* Status tabs */}
        <div className="stats">
          {["all", ...STATUSES].map((s) => (
            <div
              key={s}
              className={`stat${statusFilter === s ? " active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              <div
                className="stat-val"
                style={{
                  color:
                    statusFilter === s ? STATUS_CONFIG[s].color : "var(--text)",
                }}
              >
                {s === "all" ? ALL_ORDERS.length : counts[s] || 0}
              </div>
              <div className="stat-lbl">{STATUS_CONFIG[s].label}</div>
            </div>
          ))}
        </div>

        
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              className="search-input"
              placeholder="Search by order ID, name, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select.Root value={sortBy} onValueChange={setSortBy}>
            <Select.Trigger className="select-trigger">
              <Select.Value />
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="select-content"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport>
                  {[
                    { v: "newest", l: "Newest first" },
                    { v: "oldest", l: "Oldest first" },
                    { v: "total-hi", l: "Highest total" },
                    { v: "total-lo", l: "Lowest total" },
                  ].map(({ v, l }) => (
                    <Select.Item key={v} value={v} className="select-item">
                      <Select.ItemText>{l}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <div className="spacer" />
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {sorted.length} order{sorted.length !== 1 ? "s" : ""}
          </span>
        </div>

        
        <div className="table-wrap">
          <DataTable
            storageKey="orders_sort"
            rowKey="id"
            onRowClick={setSelectedOrder}
            isLoading={isLoading}
            data={sorted}
            columns={[
              { key: "id", header: "Order", width: 120, sortable: true },
              {
                key: "customer",
                header: "Customer",
                sortable: true,
                render: (row) => <span>{row.customer}</span>,
              },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <span className={`badge badge-${row.status}`}>
                    {row.status}
                  </span>
                ),
              },
              {
                key: "total",
                header: "Total",
                sortable: true,
                render: (row) => `$${row.total.toFixed(2)}`,
              },
              { key: "createdAt", header: "Date", sortable: true },
            ]}
          />
          {sorted.length > 0 && (
            <div className="end-msg">— {sorted.length} orders —</div>
          )}
        </div>

        
        {selectedOrder && (
          <OrderDrawer
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </div>
    </>
  );
}
