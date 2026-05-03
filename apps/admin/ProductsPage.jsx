import { useState, useCallback, useRef, useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Select from "@radix-ui/react-select";
import { useCartState, useCartDispatch } from "../storefront/Layout";


// ─── Mock Medusa SDK (replace with your actual client) ───────────────────────
const fetchProducts = async ({ pageParam = 0, filters }) => {
  await new Promise((r) => setTimeout(r, 600));
  const limit = 12;
  const total = 47;
  const allProducts = Array.from({ length: total }, (_, i) => ({
    id: `prod_${String(i + 1).padStart(3, "0")}`,
    thumbnail: `https://picsum.photos/seed/${i + 1}/48/48`,
    title: [
      "Obsidian Crew Neck",
      "Slate Cargo Pant",
      "Onyx Hoodie",
      "Granite Bomber",
      "Ash Trench Coat",
      "Carbon Jogger",
      "Basalt Windbreaker",
      "Charcoal Denim",
      "Iron Fleece",
      "Flint Overshirt",
      "Coal Polo",
      "Cinder Vest",
    ][i % 12],
    status: ["published", "draft", "published", "published", "draft"][i % 5],
    price: 29 + ((i * 17) % 200),
    priceLabel: `$${(29 + ((i * 17) % 200)).toFixed(2)}`,
    inventory: 200 - ((i * 13) % 200),
    category: ["Tops", "Bottoms", "Outerwear", "Accessories"][i % 4],
    updatedAt: new Date(Date.now() - i * 86400000 * 3).toLocaleDateString(),
  }));

  let filtered = allProducts;
  if (filters.search)
    filtered = filtered.filter((p) =>
      p.title.toLowerCase().includes(filters.search.toLowerCase()),
    );
  if (filters.status && filters.status !== "all")
    filtered = filtered.filter((p) => p.status === filters.status);
  if (filters.category && filters.category !== "all")
    filtered = filtered.filter((p) => p.category === filters.category);

  const start = pageParam * limit;
  const items = filtered.slice(start, start + limit);
  return {
    products: items,
    nextPage: start + limit < filtered.length ? pageParam + 1 : undefined,
    total: filtered.length,
  };
};

const deleteProducts = async (ids) => {
  await new Promise((r) => setTimeout(r, 800));
  return { deleted: ids };
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /*
   * SCROLL FIX:
   * - html/body fill the viewport and don't scroll themselves
   * - .page is a flex column that also fills the viewport
   * - .table-wrap gets flex:1 + overflow-y:auto → only the table region scrolls
   * - This eliminates the "stuck scrollbar" caused by competing scroll contexts
   */
  html, body {
    height: 100%;
    overflow: hidden;      /* body never scrolls */
  }

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
    --radius: 6px;
    --radius-lg: 10px;
    --mono: 'DM Mono', monospace;
    --sans: 'Syne', sans-serif;
    --transition: 160ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  body { background: var(--bg); color: var(--text); font-family: var(--sans); }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--border-hover); }

  /* Page is now a full-height flex column — nothing overflows out of it */
  .page {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
    background-image: radial-gradient(ellipse 60% 40% at 70% -10%, rgba(124,106,255,0.06) 0%, transparent 60%);
  }

  /* Header */
  .header {
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 28px 32px 20px;
    border-bottom: 1px solid var(--border);
  }
  .header-left h1 {
    font-size: 22px; font-weight: 800; letter-spacing: -0.5px;
    color: var(--text);
  }
  .header-left p { font-size: 13px; color: var(--text-muted); margin-top: 2px; font-family: var(--mono); }
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
  .btn-sm { padding: 6px 12px; font-size: 12px; }

  /* Stats */
  .stats {
    flex-shrink: 0;
    display: flex; gap: 0; border-bottom: 1px solid var(--border);
  }
  .stat { padding: 16px 32px; border-right: 1px solid var(--border); }
  .stat:last-child { border-right: none; }
  .stat-val { font-size: 22px; font-weight: 800; color: var(--text); font-family: var(--mono); }
  .stat-lbl { font-size: 11px; color: var(--text-muted); margin-top: 1px; text-transform: uppercase; letter-spacing: 0.06em; }

  /* Toolbar */
  .toolbar {
    flex-shrink: 0;
    display: flex; align-items: center; gap: 10px;
    padding: 16px 32px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .search-wrap { position: relative; flex: 1; max-width: 320px; }
  .search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
  .search-input {
    width: 100%; padding: 8px 12px 8px 34px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    font-family: var(--mono); font-size: 13px;
    outline: none; transition: border-color var(--transition);
  }
  .search-input::placeholder { color: var(--text-muted); }
  .search-input:focus { border-color: var(--accent); }

  /* Select */
  .select-trigger {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 12px; background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text-dim); font-family: var(--mono); font-size: 13px;
    cursor: pointer; outline: none; transition: border-color var(--transition);
    white-space: nowrap;
  }
  .select-trigger:hover, .select-trigger[data-state="open"] { border-color: var(--accent); color: var(--text); }
  .select-content {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius-lg); overflow: hidden;
    box-shadow: 0 16px 40px rgba(0,0,0,0.5);
    z-index: 100;
    animation: fadeIn 120ms ease;
  }
  @keyframes fadeIn { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }
  .select-item {
    padding: 9px 14px; font-family: var(--mono); font-size: 13px; color: var(--text-dim);
    cursor: pointer; outline: none; transition: background var(--transition);
    display: flex; align-items: center; gap: 8px;
  }
  .select-item:hover, .select-item[data-highlighted] { background: var(--accent-dim); color: var(--text); }
  .select-item[data-state="checked"] { color: var(--accent); }

  .spacer { flex: 1; }

  /* Bulk bar */
  .bulk-bar {
    flex-shrink: 0;
    display: flex; align-items: center; gap: 12px;
    padding: 10px 32px;
    background: var(--accent-dim);
    border-bottom: 1px solid rgba(124,106,255,0.2);
    animation: slideDown 160ms ease;
  }
  @keyframes slideDown { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .bulk-bar span { font-family: var(--mono); font-size: 13px; color: var(--accent); }

  /*
   * TABLE WRAP: flex:1 + overflow-y:auto makes ONLY this region scroll.
   * The header/toolbar stay pinned. No more stuck/double scrollbar.
   */
  .table-wrap {
    flex: 1;
    overflow-y: auto;
    overflow-x: auto;
    padding: 0 32px;
  }

  table { width: 100%; border-collapse: collapse; }
  thead th {
    position: sticky; top: 0; z-index: 10;
    background: var(--bg);
    text-align: left; padding: 12px 14px;
    font-family: var(--mono); font-size: 11px; font-weight: 500;
    color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase;
    border-bottom: 1px solid var(--border);
  }
  thead th:first-child { width: 40px; }
  tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background var(--transition);
  }
  tbody tr:hover { background: var(--surface); }
  tbody tr.selected { background: var(--accent-dim); }
  tbody td { padding: 13px 14px; font-size: 14px; vertical-align: middle; }
  .td-mono { font-family: var(--mono); font-size: 12px; color: var(--text-muted); }
  .td-title { font-weight: 600; color: var(--text); }
  .td-price { font-family: var(--mono); font-size: 13px; color: var(--green); }

  /* Status badge */
  .badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 99px; font-size: 11px;
    font-family: var(--mono); font-weight: 500;
  }
  .badge-dot { width: 5px; height: 5px; border-radius: 50%; }
  .badge-published { background: var(--green-dim); color: var(--green); }
  .badge-published .badge-dot { background: var(--green); }
  .badge-draft { background: var(--amber-dim); color: var(--amber); }
  .badge-draft .badge-dot { background: var(--amber); }

  /* Checkbox */
  .cb-root {
    width: 16px; height: 16px; border-radius: 4px;
    border: 1.5px solid var(--border); background: transparent;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all var(--transition); outline: none;
  }
  .cb-root:hover { border-color: var(--accent); }
  .cb-root[data-state="checked"] { background: var(--accent); border-color: var(--accent); }
  .cb-root[data-state="indeterminate"] { background: var(--accent-dim); border-color: var(--accent); }
  .cb-indicator { color: white; }

  /* Loader */
  .loader-row td { text-align: center; padding: 32px; }
  .spinner {
    width: 20px; height: 20px; border: 2px solid var(--border);
    border-top-color: var(--accent); border-radius: 50%;
    animation: spin 0.7s linear infinite; margin: 0 auto;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Sentinel */
  .sentinel { height: 40px; }
  .end-msg { text-align: center; padding: 24px; font-family: var(--mono); font-size: 12px; color: var(--text-muted); }

  /* Empty */
  .empty { text-align: center; padding: 64px 32px; }
  .empty-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.4; }
  .empty h3 { font-size: 16px; font-weight: 700; color: var(--text); }
  .empty p { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

  /* Row actions */
  .row-actions { display: flex; gap: 6px; opacity: 0; transition: opacity var(--transition); }
  tbody tr:hover .row-actions { opacity: 1; }

  /* Dialog */
  .dialog-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px); z-index: 200;
    animation: fadeIn 150ms ease;
  }
  .dialog-content {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 28px; width: 400px; z-index: 201;
    animation: scaleIn 150ms ease;
    box-shadow: 0 24px 60px rgba(0,0,0,0.6);
  }
  @keyframes scaleIn { from { opacity:0; transform: translate(-50%,-50%) scale(0.96); } to { opacity:1; transform: translate(-50%,-50%) scale(1); } }
  .dialog-title { font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
  .dialog-desc { font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 22px; }
  .dialog-desc strong { color: var(--red); }
  .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; }

  /* Inventory bar */
  .inv-bar { display: flex; align-items: center; gap: 8px; }
  .inv-track { width: 48px; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .inv-fill { height: 100%; border-radius: 2px; background: var(--accent); }

  /* Skeleton */
  .skeleton { background: var(--surface2); border-radius: 4px; animation: shimmer 1.4s infinite; }
  @keyframes shimmer {
    0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; }
  }

  .img-wrap { position: relative; display: inline-block; }
  .img-wrap:hover .img-preview {
    opacity: 1;
    transform: scale(1) translateY(0) translateX(-50%);
    pointer-events: auto;
  }
  .img-preview {
    position: absolute; left: 50%; top: 50px;
    transform: scale(0.95) translateY(-4px) translateX(-50%);
    width: 160px; height: 160px; border-radius: 10px;
    object-fit: cover; z-index: 50;
    border: 1px solid var(--border);
    box-shadow: 0 16px 40px rgba(0,0,0,0.6);
    opacity: 0; pointer-events: none;
    transition: all 200ms cubic-bezier(0.4,0,0.2,1);
  }

  /* ── Floating Cart Button ── */
  .cart-fab {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 150;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 18px;
    background: var(--accent);
    border: none;
    border-radius: 99px;
    color: #fff;
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 24px var(--accent-glow), 0 2px 8px rgba(0,0,0,0.4);
    transition: all var(--transition);
  }
  .cart-fab:hover {
    background: #9080ff;
    transform: translateY(-2px);
    box-shadow: 0 8px 32px var(--accent-glow), 0 4px 12px rgba(0,0,0,0.4);
  }
  .cart-fab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px; height: 20px;
    background: #fff;
    color: var(--accent);
    border-radius: 50%;
    font-size: 11px;
    font-weight: 800;
    font-family: var(--mono);
    line-height: 1;
  }

  /* ── Cart Slide-over Panel ── */
  .cart-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(3px);
    z-index: 300;
    animation: fadeIn 150ms ease;
  }
  .cart-panel {
    position: fixed;
    top: 0; right: 0; bottom: 0;
    width: 380px;
    max-width: 100vw;
    background: var(--surface);
    border-left: 1px solid var(--border);
    z-index: 301;
    display: flex;
    flex-direction: column;
    animation: slideInRight 220ms cubic-bezier(0.4,0,0.2,1);
    box-shadow: -16px 0 48px rgba(0,0,0,0.5);
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0.6; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  .cart-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .cart-header h2 {
    font-size: 16px; font-weight: 800; color: var(--text);
    display: flex; align-items: center; gap: 8px;
  }
  .cart-count-pill {
    font-family: var(--mono);
    font-size: 11px;
    background: var(--accent-dim);
    color: var(--accent);
    padding: 2px 8px;
    border-radius: 99px;
    font-weight: 500;
  }
  .cart-close {
    width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-muted);
    cursor: pointer;
    transition: all var(--transition);
  }
  .cart-close:hover { background: var(--border); color: var(--text); }

  .cart-items {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .cart-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-family: var(--mono);
    font-size: 13px;
    gap: 8px;
    padding: 40px;
  }
  .cart-empty-icon { font-size: 32px; opacity: 0.3; }

  .cart-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    transition: border-color var(--transition);
  }
  .cart-item:hover { border-color: var(--border-hover); }
  .cart-item img {
    width: 44px; height: 44px;
    border-radius: 6px; object-fit: cover; flex-shrink: 0;
  }
  .cart-item-info { flex: 1; min-width: 0; }
  .cart-item-title {
    font-size: 13px; font-weight: 600; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cart-item-meta {
    font-family: var(--mono); font-size: 11px; color: var(--text-muted);
    margin-top: 2px;
  }
  .cart-item-qty {
    display: flex; align-items: center; gap: 6px;
  }
  .qty-btn {
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 4px; color: var(--text-muted);
    cursor: pointer; font-size: 14px; line-height: 1;
    transition: all var(--transition);
  }
  .qty-btn:hover { background: var(--border); color: var(--text); }
  .qty-val { font-family: var(--mono); font-size: 13px; color: var(--text); min-width: 16px; text-align: center; }
  .cart-item-price {
    font-family: var(--mono); font-size: 13px; color: var(--green);
    flex-shrink: 0; margin-left: 4px;
  }
  .cart-item-remove {
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: none;
    color: var(--text-muted); cursor: pointer;
    border-radius: 4px;
    transition: all var(--transition);
    flex-shrink: 0;
  }
  .cart-item-remove:hover { color: var(--red); background: var(--red-dim); }

  .cart-footer {
    flex-shrink: 0;
    padding: 16px 24px;
    border-top: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .cart-total-row {
    display: flex; justify-content: space-between; align-items: center;
  }
  .cart-total-label { font-size: 13px; color: var(--text-muted); font-family: var(--mono); }
  .cart-total-val { font-size: 20px; font-weight: 800; color: var(--text); font-family: var(--mono); }
  .btn-checkout {
    width: 100%; padding: 13px;
    background: var(--accent); color: #fff;
    border: none; border-radius: var(--radius-lg);
    font-family: var(--sans); font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all var(--transition);
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .btn-checkout:hover { background: #9080ff; box-shadow: 0 0 24px var(--accent-glow); }
  .btn-clear {
    width: 100%; padding: 9px;
    background: transparent; color: var(--text-muted);
    border: 1px solid var(--border); border-radius: var(--radius);
    font-family: var(--mono); font-size: 12px;
    cursor: pointer; transition: all var(--transition);
  }
  .btn-clear:hover { background: var(--red-dim); color: var(--red); border-color: rgba(255,92,92,0.25); }
`;

// ─── Inline CartDrawer (slide-over panel) ────────────────────────────────────
function CartPanel({ open, onClose, setInventoryMap }) {
  const { items, itemCount, total } = useCartState();
  const { removeItem, updateQty, clearCart } = useCartDispatch();

  if (!open) return null;

  return (
    <>
      <div className="cart-overlay" onClick={onClose} />
      <div className="cart-panel" role="dialog" aria-label="Cart">
        {/* Header */}
        <div className="cart-header">
          <h2>
            Cart
            <span className="cart-count-pill">{itemCount} items</span>
          </h2>
          <button
            className="cart-close"
            onClick={onClose}
            aria-label="Close cart"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">🛒</div>
              <span>Your cart is empty</span>
              <span style={{ fontSize: 11, opacity: 0.6 }}>
                Click "Add to cart" on any row
              </span>
            </div>
          ) : (
            items.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.thumbnail} alt={item.title} />
                <div className="cart-item-info">
                  <div className="cart-item-title">{item.title}</div>
                  <div className="cart-item-meta">
                    ${item.price?.toFixed(2)} each
                  </div>
                </div>
                <div className="cart-item-qty">
                  <button
                    className="qty-btn"
                    onClick={() => {
                      if (item.quantity === 1) {
                        setInventoryMap((prev) => ({
                          ...prev,
                          [item.id]: (prev[item.id] ?? 0) + 1,
                        }));
                      }
                      updateQty(item.id, item.quantity - 1);
                    }}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="qty-val">{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => {
                      setInventoryMap((prev) => ({
                        ...prev,
                        [item.id]: (prev[item.id] ?? 0) - 1,
                      }));
                      updateQty(item.id, item.quantity + 1);
                    }}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <span className="cart-item-price">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
                <button
                  className="cart-item-remove"
                  onClick={() => {
                    setInventoryMap((prev) => ({
                      ...prev,
                      [item.id]:
                        (prev[item.id] ?? item.inventory) + item.quantity,
                    }));
                    removeItem(item.id);
                  }}
                  aria-label="Remove item"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total-row">
              <span className="cart-total-label">Total</span>
              <span className="cart-total-val">${total.toFixed(2)}</span>
            </div>
            <button className="btn-checkout" onClick={() => navigate('/checkout')}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Proceed to Checkout
            </button>
            <button className="btn-clear" onClick={clearCart}>
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── ProductsPage ─────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const queryClient = useQueryClient();

  // Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Selection state
  const [selected, setSelected] = useState(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [inventoryMap, setInventoryMap] = useState({});
  // Cart panel state
  const [cartOpen, setCartOpen] = useState(false);
  const { itemCount } = useCartState();
  const { addItem } = useCartDispatch();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset selection on filter change
  useEffect(() => {
    setSelected(new Set());
  }, [debouncedSearch, statusFilter, categoryFilter]);

  const filters = {
    search: debouncedSearch,
    status: statusFilter,
    category: categoryFilter,
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["admin", "products", filters],
    queryFn: ({ pageParam }) => fetchProducts({ pageParam, filters }),
    getNextPageParam: (last) => last.nextPage,
    initialPageParam: 0,
  });

  // Infinite scroll sentinel
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage)
          fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten pages
  const allProducts = data?.pages.flatMap((p) => p.products) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const published = allProducts.filter((p) => p.status === "published").length;
  const drafts = allProducts.filter((p) => p.status === "draft").length;

  // Selection helpers
  const allSelected =
    allProducts.length > 0 && allProducts.every((p) => selected.has(p.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allProducts.map((p) => p.id)));
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteProducts([...selected]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setSelected(new Set());
      setConfirmOpen(false);
    },
  });

  return (
    <>
      <style>{css}</style>
      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <h1>Products</h1>
            <p>Manage your catalogue</p>
          </div>
          <button className="btn btn-primary">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Product
          </button>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stat">
            <div className="stat-val">{total}</div>
            <div className="stat-lbl">Total</div>
          </div>
          <div className="stat">
            <div className="stat-val">{published}</div>
            <div className="stat-lbl">Published</div>
          </div>
          <div className="stat">
            <div className="stat-val">{drafts}</div>
            <div className="stat-lbl">Drafts</div>
          </div>
        </div>

        {/* Toolbar */}
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
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
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
                  {["all", "published", "draft"].map((s) => (
                    <Select.Item key={s} value={s} className="select-item">
                      <Select.ItemText>
                        {s === "all"
                          ? "All Status"
                          : s.charAt(0).toUpperCase() + s.slice(1)}
                      </Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          {/* Category filter */}
          <Select.Root value={categoryFilter} onValueChange={setCategoryFilter}>
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
                  {["all", "Tops", "Bottoms", "Outerwear", "Accessories"].map(
                    (c) => (
                      <Select.Item key={c} value={c} className="select-item">
                        <Select.ItemText>
                          {c === "all" ? "All Categories" : c}
                        </Select.ItemText>
                      </Select.Item>
                    ),
                  )}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <div className="spacer" />
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

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="bulk-bar">
            <span>{selected.size} selected</span>
            <div className="spacer" />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelected(new Set())}
            >
              Deselect all
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmOpen(true)}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6M9 6V4h6v2" />
              </svg>
              Delete {selected.size}
            </button>
          </div>
        )}

        {/* Table — this region scrolls, nothing else does */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <Checkbox.Root
                    className="cb-root"
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={toggleAll}
                  >
                    <Checkbox.Indicator className="cb-indicator">
                      {someSelected ? (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M5 12h14" />
                        </svg>
                      ) : (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                </th>
                <th>Image</th>
                <th>Product</th>
                <th>Status</th>
                <th>Category</th>
                <th>Price</th>
                <th>Inventory</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }, (_, i) => (
                  <tr key={i}>
                    {[40, 40, 200, 80, 90, 70, 100, 80, 60].map((w, j) => (
                      <td key={j}>
                        <div
                          className="skeleton"
                          style={{ width: w, height: 14, borderRadius: 4 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : allProducts.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">
                      <div className="empty-icon">◈</div>
                      <h3>No products found</h3>
                      <p>Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                allProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={selected.has(product.id) ? "selected" : ""}
                  >
                    <td>
                      <Checkbox.Root
                        className="cb-root"
                        checked={selected.has(product.id)}
                        onCheckedChange={() => toggleOne(product.id)}
                      >
                        <Checkbox.Indicator className="cb-indicator">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                    </td>
                    <td>
                      <div className="img-wrap">
                        <img
                          src={product.thumbnail}
                          alt={product.title}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 6,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        <img
                          src={product.thumbnail}
                          className="img-preview"
                          alt={product.title}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="td-title">{product.title}</div>
                      <div className="td-mono" style={{ marginTop: 2 }}>
                        {product.id}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${product.status}`}>
                        <span className="badge-dot" />
                        {product.status}
                      </span>
                    </td>
                    <td className="td-mono">{product.category}</td>
                    <td className="td-price">{product.priceLabel}</td>
                    <td>
                      <div className="inv-bar">
                        <span className="td-mono">
                          {inventoryMap[product.id] ?? product.inventory}
                        </span>
                        <div className="inv-track">
                          <div
                            className="inv-fill"
                            style={{
                              width: `${Math.min(100, (inventoryMap[product.id] ?? product.inventory) / 2)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="td-mono">{product.updatedAt}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm">Edit</button>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={
                            (inventoryMap[product.id] ?? product.inventory) <= 0
                          }
                          onClick={() => {
                            const currentInv =
                              inventoryMap[product.id] ?? product.inventory;
                            if (currentInv <= 0) return;
                            addItem({
                              id: product.id,
                              title: product.title,
                              price: product.price,
                              thumbnail: product.thumbnail,
                            });
                            setInventoryMap((prev) => ({
                              ...prev,
                              [product.id]: currentInv - 1,
                            }));
                            setCartOpen(true);
                          }}
                        >
                          + Cart
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}

              {isFetchingNextPage && (
                <tr className="loader-row">
                  <td colSpan={9}>
                    <div className="spinner" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="sentinel" />
          {!hasNextPage && allProducts.length > 0 && (
            <div className="end-msg">— {total} products loaded —</div>
          )}
        </div>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="dialog-content">
              <Dialog.Title className="dialog-title">
                Delete {selected.size} product{selected.size > 1 ? "s" : ""}?
              </Dialog.Title>
              <Dialog.Description className="dialog-desc">
                This action <strong>cannot be undone</strong>. The selected
                products and all associated data will be permanently removed
                from your store.
              </Dialog.Description>
              <div className="dialog-actions">
                <Dialog.Close asChild>
                  <button className="btn btn-ghost">Cancel</button>
                </Dialog.Close>
                <button
                  className="btn btn-danger"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending
                    ? "Deleting…"
                    : `Delete ${selected.size}`}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Floating cart button — always visible, no scrolling required */}
      <button
        className="cart-fab"
        onClick={() => setCartOpen(true)}
        aria-label="Open cart"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        Cart
        {itemCount > 0 && (
          <span className="cart-fab-badge">
            {itemCount > 9 ? "9+" : itemCount}
          </span>
        )}
      </button>

      {/* Cart slide-over panel */}
      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        setInventoryMap={setInventoryMap}
      />
    </>
  );
}
