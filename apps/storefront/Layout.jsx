// apps/storefront/Layout.jsx
// Wraps all storefront pages with:
//   - CartProvider (global cart state)
//   - Header with nav + cart icon
//   - Footer
//   - <Outlet /> for child routes (React Router)
//
// Exports:
//   useCartState()    → { items, count, total, isOpen }
//   useCartDispatch() → dispatch({ type, payload })

import { createContext, useContext, useReducer } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";

// ─── Cart Context & Reducer ────────────────────────────────────────────────────

const CartStateCtx    = createContext(null);
const CartDispatchCtx = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const key = (i) => `${i.id}__${i.variantId ?? "default"}`;
      const exists = state.items.find((i) => key(i) === key(action.payload));
      if (exists) {
        return {
          ...state,
          items: state.items.map((i) =>
            key(i) === key(action.payload)
              ? { ...i, quantity: i.quantity + (action.payload.quantity ?? 1) }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: action.payload.quantity ?? 1 }],
      };
    }
    case "REMOVE_ITEM": {
      const key = `${action.payload.id}__${action.payload.variantId ?? "default"}`;
      return { ...state, items: state.items.filter((i) => `${i.id}__${i.variantId ?? "default"}` !== key) };
    }
    case "UPDATE_QTY": {
      const key = `${action.payload.id}__${action.payload.variantId ?? "default"}`;
      if (action.payload.quantity <= 0)
        return { ...state, items: state.items.filter((i) => `${i.id}__${i.variantId ?? "default"}` !== key) };
      return {
        ...state,
        items: state.items.map((i) =>
          `${i.id}__${i.variantId ?? "default"}` === key ? { ...i, quantity: action.payload.quantity } : i
        ),
      };
    }
    case "CLEAR":
      return { ...state, items: [] };
    case "TOGGLE_CART":
      return { ...state, isOpen: action.payload ?? !state.isOpen };
    default:
      return state;
  }
}

function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false });
  const derived = {
    ...state,
    count: state.items.reduce((n, i) => n + i.quantity, 0),
    total: state.items.reduce((s, i) => s + i.price * i.quantity, 0),
  };
  return (
    <CartStateCtx.Provider value={derived}>
      <CartDispatchCtx.Provider value={dispatch}>
        {children}
      </CartDispatchCtx.Provider>
    </CartStateCtx.Provider>
  );
}

export function useCartState()    { return useContext(CartStateCtx); }
export function useCartDispatch() { return useContext(CartDispatchCtx); }

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  const cart     = useCartState();
  const dispatch = useCartDispatch();
  const navigate = useNavigate();

  const navStyle = ({ isActive }) => ({
    textDecoration: "none",
    color: isActive ? "#7c6aff" : "#aaa",
    fontSize: 14,
    fontWeight: 500,
    transition: "color 0.15s",
  });

  return (
    <header style={s.header}>
      <Link to="/" style={s.logo}>commit&amp;conquer</Link>

      <nav style={s.nav}>
        <NavLink to="/"           end style={navStyle}>Shop</NavLink>
        <NavLink to="/collections"    style={navStyle}>Collections</NavLink>
        <NavLink to="/about"          style={navStyle}>About</NavLink>
        <NavLink to="/account"        style={navStyle}>Account</NavLink>
        {/* Admin link — for hackathon convenience */}
        <NavLink to="/admin"          style={({ isActive }) => ({
          ...navStyle({ isActive }),
          background: isActive ? "rgba(124,106,255,0.15)" : "rgba(255,255,255,0.05)",
          padding: "4px 10px", borderRadius: 6, fontSize: 13,
        })}>Admin ↗</NavLink>
      </nav>

      <button
        onClick={() => dispatch({ type: "TOGGLE_CART", payload: true })}
        style={s.cartBtn}
        aria-label="Open cart"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        {cart?.count > 0 && <span style={s.badge}>{cart.count > 99 ? "99+" : cart.count}</span>}
      </button>
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={s.footer}>
      <div style={s.footerInner}>
        <span style={{ color: "#555", fontSize: 13 }}>© {new Date().getFullYear()} Commit &amp; Conquer</span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link to="/about"       style={s.footerLink}>About</Link>
          <Link to="/collections" style={s.footerLink}>Collections</Link>
          <Link to="/account"     style={s.footerLink}>Account</Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function Layout() {
  return (
    <CartProvider>
      <div style={s.root}>
        <Header />
        <main style={s.main}>
          <Outlet />   {/* React Router renders child page here */}
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root:    { minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0c0c0e", color: "#e8e8f0" },
  header:  {
    position: "sticky", top: 0, zIndex: 100,
    display: "flex", alignItems: "center", gap: 24,
    padding: "0 32px", height: 60,
    background: "rgba(12,12,14,0.9)", backdropFilter: "blur(12px)",
    borderBottom: "1px solid #2a2a31",
  },
  logo:    { fontWeight: 800, fontSize: 17, textDecoration: "none", color: "#e8e8f0", letterSpacing: "-0.5px", marginRight: "auto" },
  nav:     { display: "flex", alignItems: "center", gap: 20 },
  cartBtn: {
    position: "relative", background: "none", border: "none",
    cursor: "pointer", color: "#e8e8f0", padding: "6px 8px",
    borderRadius: 8, marginLeft: 8, display: "flex", alignItems: "center",
  },
  badge:   {
    position: "absolute", top: 0, right: 0,
    background: "#7c6aff", color: "#fff",
    fontSize: 10, fontWeight: 700, borderRadius: "50%",
    width: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center",
  },
  main:    { flex: 1 },
  footer:  { borderTop: "1px solid #1c1c21", padding: "24px 32px" },
  footerInner: { maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  footerLink: { color: "#555", textDecoration: "none", fontSize: 13 },
};