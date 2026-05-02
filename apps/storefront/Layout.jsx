import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
} from "react";

// ─── 1. Split into TWO contexts ───────────────────────────────────────────────
// CartStateContext  → holds the data (cart items, total, count)
// CartDispatchContext → holds the actions (addItem, removeItem, updateQty, clearCart)
//
// WHY: If both live in one context, every action call creates a new object
// reference → every consumer re-renders even if data didn't change.
// Splitting means components that only dispatch never re-render on state changes.

const CartStateContext = createContext(null);
const CartDispatchContext = createContext(null);

// ─── Reducer ─────────────────────────────────────────────────────────────────
const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === action.payload.id
              ? { ...i, quantity: i.quantity + (action.payload.quantity ?? 1) }
              : i,
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          { ...action.payload, quantity: action.payload.quantity ?? 1 },
        ],
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.payload),
      };

    case "UPDATE_QTY":
      return {
        ...state,
        items: state.items
          .map((i) =>
            i.id === action.payload.id
              ? { ...i, quantity: action.payload.quantity }
              : i,
          )
          .filter((i) => i.quantity > 0),
      };
    case "CLEAR_CART":
      return { ...state, items: [] };

    default:
      return state;
  }
};

const initialState = { items: [] };

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState);

  // ✅ THE FIX: wrap state in useMemo — only changes when cart.items changes
  // Without this, a new object is created on every render → full tree re-render
  const cartState = useMemo(
    () => ({
      items: cart.items,
      itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      total: cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    [cart.items],
  );

  // ✅ Dispatch actions wrapped in useCallback — stable references, never change
  // Components consuming only these will NEVER re-render due to cart state changes
  const addItem = useCallback(
    (item) => dispatch({ type: "ADD_ITEM", payload: item }),
    [],
  );
  const removeItem = useCallback(
    (id) => dispatch({ type: "REMOVE_ITEM", payload: id }),
    [],
  );
  const updateQty = useCallback(
    (id, quantity) =>
      dispatch({ type: "UPDATE_QTY", payload: { id, quantity } }),
    [],
  );
  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);

  // ✅ Dispatch context is also memoized — object reference stays stable
  const dispatchValue = useMemo(
    () => ({
      addItem,
      removeItem,
      updateQty,
      clearCart,
    }),
    [addItem, removeItem, updateQty, clearCart],
  );

  return (
    <CartStateContext.Provider value={cartState}>
      <CartDispatchContext.Provider value={dispatchValue}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
// Use useCartState()    → in components that display cart data (CartDrawer, header count)
// Use useCartDispatch() → in components that only add/remove items (ProductCard, CheckoutForm)
// Components using useCartDispatch() will NOT re-render when items change ✅

export function useCartState() {
  const ctx = useContext(CartStateContext);
  if (!ctx) throw new Error("useCartState must be used inside CartProvider");
  return ctx;
}

export function useCartDispatch() {
  const ctx = useContext(CartDispatchContext);
  if (!ctx) throw new Error("useCartDispatch must be used inside CartProvider");
  return ctx;
}

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function Layout({ children }) {
  return <CartProvider>{children}</CartProvider>;
}
