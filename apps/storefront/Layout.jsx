

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";


const CartStateCtx    = createContext(null);
const CartDispatchCtx = createContext(null);

const API = "http://localhost:4000/api/store";

function CartProvider({ children }) {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Initialize or get cart_id from localStorage
  const [cartId, setCartId] = useState(() => localStorage.getItem("cart_id"));

  const { data: cartData, isLoading } = useQuery({
    queryKey: ["cart", cartId],
    queryFn: async () => {
      if (!cartId) return null;
      const res = await fetch(`${API}/carts/${cartId}`);
      if (!res.ok) {
        localStorage.removeItem("cart_id");
        setCartId(null);
        return null;
      }
      return (await res.json()).cart;
    },
    enabled: !!cartId,
    staleTime: 5000, // Small stale time to encourage sync across tabs
  });

  // Mutation to create a cart
  const createCart = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/carts`, { method: "POST", headers: { "Content-Type": "application/json" } });
      return (await res.json()).cart;
    },
    onSuccess: (newCart) => {
      localStorage.setItem("cart_id", newCart.id);
      setCartId(newCart.id);
      qc.setQueryData(["cart", newCart.id], newCart);
    },
  });

  // Mutation to add item
  const addItemMut = useMutation({
    mutationFn: async ({ id, variantId, quantity = 1 }) => {
      let activeCartId = cartId;
      if (!activeCartId) {
        const newCart = await createCart.mutateAsync();
        activeCartId = newCart.id;
      }
      
      let res = await fetch(`${API}/carts/${activeCartId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: id, variant_id: variantId ?? "default", quantity }),
      });

      // If cart not found (e.g. server restart), create new and retry once
      if (res.status === 404) {
        const newCart = await createCart.mutateAsync();
        res = await fetch(`${API}/carts/${newCart.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: id, variant_id: variantId ?? "default", quantity }),
        });
      }

      if (!res.ok) throw new Error("Failed to add item");
      return (await res.json()).cart;
    },
    onSuccess: (updatedCart) => {
      qc.setQueryData(["cart", cartId], updatedCart);
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  // Mutation to remove item
  const removeItemMut = useMutation({
    mutationFn: async ({ id }) => {
      const res = await fetch(`${API}/carts/${cartId}/items/${id}`, { method: "DELETE" });
      return (await res.json()).cart;
    },
    onSuccess: (updatedCart) => {
      qc.setQueryData(["cart", cartId], updatedCart);
    },
  });

  // Mutation to update quantity
  const updateQtyMut = useMutation({
    mutationFn: async ({ id, quantity }) => {
      const res = await fetch(`${API}/carts/${cartId}/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      return (await res.json()).cart;
    },
    onSuccess: (updatedCart) => {
      qc.setQueryData(["cart", cartId], updatedCart);
    },
  });

  // Mutation to clear cart
  const clearCartMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/carts/${cartId}`, { method: "DELETE" });
      return (await res.json()).cart;
    },
    onSuccess: (updatedCart) => {
      qc.setQueryData(["cart", cartId], updatedCart);
    },
  });

  const state = useMemo(() => ({
    items: cartData?.items ?? [],
    total: cartData?.total ?? 0,
    count: cartData?.items.reduce((n, i) => n + i.quantity, 0) ?? 0,
    isOpen,
    isLoading,
    cart_id: cartId,
  }), [cartData, isOpen, isLoading, cartId]);

  const dispatch = useMemo(() => ({
    addItem: (item) => addItemMut.mutate(item),
    removeItem: (payload) => {
      // Find the line item ID by variantId
      const item = cartData?.items.find(i => i.variant_id === (payload.variantId ?? "default"));
      if (item) removeItemMut.mutate({ id: item.id });
    },
    updateQty: (payload) => {
      const item = cartData?.items.find(i => i.variant_id === (payload.variantId ?? "default"));
      if (item) updateQtyMut.mutate({ id: item.id, quantity: payload.quantity });
    },
    clearCart: () => clearCartMut.mutate(),
    toggleCart: (open) => setIsOpen(open ?? !isOpen),
  }), [addItemMut, removeItemMut, updateQtyMut, clearCartMut, isOpen, cartData]);

  return (
    <CartStateCtx.Provider value={state}>
      <CartDispatchCtx.Provider value={dispatch}>
        {children}
      </CartDispatchCtx.Provider>
    </CartStateCtx.Provider>
  );
}

export function useCartState()    { return useContext(CartStateCtx); }
export function useCartDispatch() { return useContext(CartDispatchCtx); }



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