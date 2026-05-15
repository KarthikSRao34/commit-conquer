

import { useCartState, useCartDispatch } from "./Layout";
import { useNavigate } from "react-router-dom";

export default function CartDrawer() {
  const cart     = useCartState();
  const dispatch = useCartDispatch();
  const navigate = useNavigate();

  const close = () => dispatch({ type: "TOGGLE_CART", payload: false });

  const goCheckout = () => {
    close();
    navigate("/checkout");
  };

  if (!cart) return null;

  return (
    <>
      {cart.isOpen && (
        <div onClick={close} style={s.backdrop} />
      )}
      <aside style={{ ...s.drawer, transform: cart.isOpen ? "translateX(0)" : "translateX(100%)" }}>
        <div style={s.head}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Cart ({cart.count})</h2>
          <button onClick={close} style={s.closeBtn} aria-label="Close">✕</button>
        </div>

        <div style={s.body}>
          {cart.items.length === 0 ? (
            <div style={s.empty}>
              <p style={{ fontSize: 36 }}>🛒</p>
              <p style={{ color: "#666", marginTop: 12 }}>Your cart is empty</p>
              <button onClick={close} style={s.ctaBtn}>Browse Products</button>
            </div>
          ) : (
            cart.items.map((item) => <CartItem key={`${item.id}__${item.variantId}`} item={item} />)
          )}
        </div>

        {cart.items.length > 0 && (
          <div style={s.foot}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#aaa", fontSize: 14 }}>Subtotal</span>
              <span style={{ fontWeight: 700, fontSize: 18 }}>${cart.total.toFixed(2)}</span>
            </div>
            <p style={{ color: "#555", fontSize: 12, marginBottom: 16, textAlign: "center" }}>
              Shipping &amp; taxes calculated at checkout
            </p>
            <button onClick={goCheckout} style={s.ctaBtn}>Checkout →</button>
            <button onClick={close} style={s.ghostBtn}>Continue Shopping</button>
          </div>
        )}
      </aside>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </>
  );
}

function CartItem({ item }) {
  const dispatch = useCartDispatch();
  const key = { id: item.id, variantId: item.variantId };

  return (
    <div style={s.item}>
      <img src={item.thumbnail} alt={item.title} style={s.thumb}
        onError={(e) => { e.target.src = "https://placehold.co/80x96?text=img"; }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.title}</p>
        {item.size  && <p style={s.meta}>Size: {item.size}</p>}
        {item.color && <p style={s.meta}>Color: {item.color}</p>}
        <p style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>
          ${(item.price * item.quantity).toFixed(2)}
        </p>
        <div style={s.qtyRow}>
          <button style={s.qtyBtn} onClick={() => dispatch({ type: "UPDATE_QTY", payload: { ...key, quantity: item.quantity - 1 } })}>−</button>
          <span style={{ minWidth: 20, textAlign: "center", fontSize: 14, fontWeight: 600 }}>{item.quantity}</span>
          <button style={s.qtyBtn} onClick={() => dispatch({ type: "UPDATE_QTY", payload: { ...key, quantity: item.quantity + 1 } })}>+</button>
          <button style={s.removeBtn} onClick={() => dispatch({ type: "REMOVE_ITEM", payload: key })}>Remove</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, animation: "fadeIn 0.2s ease" },
  drawer: {
    position: "fixed", top: 0, right: 0, bottom: 0,
    width: "min(420px,100vw)", background: "#141417",
    zIndex: 300, display: "flex", flexDirection: "column",
    boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
    transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
    borderLeft: "1px solid #2a2a31",
  },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #2a2a31" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 18, padding: 4 },
  body: { flex: 1, overflowY: "auto", padding: "16px 24px" },
  empty: { textAlign: "center", paddingTop: 60 },
  item: { display: "flex", gap: 14, padding: "16px 0", borderBottom: "1px solid #1c1c21" },
  thumb: { width: 72, height: 88, objectFit: "cover", borderRadius: 8, flexShrink: 0 },
  meta: { color: "#888", fontSize: 12 },
  qtyRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 },
  qtyBtn: { width: 26, height: 26, border: "1px solid #2a2a31", background: "#1c1c21", color: "#e8e8f0", cursor: "pointer", borderRadius: 6, fontSize: 15 },
  removeBtn: { marginLeft: "auto", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 },
  foot: { padding: "20px 24px", borderTop: "1px solid #2a2a31", display: "flex", flexDirection: "column", gap: 10 },
  ctaBtn: { width: "100%", padding: "13px", background: "#7c6aff", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  ghostBtn: { width: "100%", padding: "11px", background: "none", color: "#888", border: "1px solid #2a2a31", borderRadius: 10, fontSize: 14, cursor: "pointer" },
};