import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCartState, useCartDispatch } from "../storefront/Layout";

// ─── Mock API call — replace with your real DELETE endpoint ──────────────────
const deleteCartItem = async (itemId) => {
  await new Promise((r) => setTimeout(r, 600));
  // Simulate occasional failure for testing rollback:
  // if (Math.random() < 0.4) throw new Error("Server error");
  return { deleted: itemId };
};

// ─── CartDrawer ───────────────────────────────────────────────────────────────
export default function CartDrawer() {
  const { items, itemCount, total } = useCartState();
  const { removeItem, clearCart } = useCartDispatch();
  const queryClient = useQueryClient();

  // ─── Optimistic removal with rollback on error ────────────────────────────
  // 1. onMutate  → snapshot current cart, optimistically remove item from UI
  // 2. onError   → rollback to snapshot using setQueryData
  // 3. onSettled → always re-sync server state
  const removeMutation = useMutation({
    mutationFn: deleteCartItem,

    onMutate: async (itemId) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["cart"] });

      // Snapshot the current items so we can roll back
      const previousItems = queryClient.getQueryData(["cart"]);

      // Optimistically remove from React Query cache
      queryClient.setQueryData(["cart"], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items?.filter((i) => i.id !== itemId) ?? [],
        };
      });

      // Also remove from context so CartProvider state reflects it immediately
      removeItem(itemId);

      // Return snapshot for onError
      return { previousItems };
    },

    onError: (error, itemId, context) => {
      // ✅ THE FIX: restore previous cart state on API failure
      if (context?.previousItems !== undefined) {
        queryClient.setQueryData(["cart"], context.previousItems);
      }

      // Invalidate so CartProvider re-syncs from server
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      console.error(`Failed to remove item ${itemId}:`, error.message);
    },

    onSettled: () => {
      // Always re-sync after mutation, success or failure
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const handleRemove = (itemId) => {
    removeMutation.mutate(itemId);
  };

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div style={styles.wrap}>
        <div style={styles.header}>
          <h2 style={styles.title}>Cart</h2>
        </div>
        <div style={styles.emptyWrap}>
          <div style={styles.emptyIcon}>🛒</div>
          <p style={styles.emptyHeading}>Your cart is empty</p>
          <p style={styles.emptySubtext}>Add products to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>
          Cart <span style={styles.countPill}>{itemCount} items</span>
        </h2>
        <button style={styles.clearBtn} onClick={clearCart}>
          Clear all
        </button>
      </div>

      {/* Item list */}
      <ul style={styles.list}>
        {items.map((item) => {
          const isRemoving =
            removeMutation.isPending && removeMutation.variables === item.id;

          return (
            <li
              key={item.id}
              style={{ ...styles.item, opacity: isRemoving ? 0.4 : 1 }}
            >
              {/* Thumbnail */}
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  style={styles.thumb}
                />
              )}

              {/* Info */}
              <div style={styles.info}>
                <span style={styles.itemTitle}>{item.title}</span>
                <span style={styles.itemMeta}>
                  ${item.price?.toFixed(2)} x {item.quantity}
                </span>
              </div>

              {/* Line total */}
              <span style={styles.lineTotal}>
                ${(item.price * item.quantity).toFixed(2)}
              </span>

              {/* Remove button */}
              <button
                style={styles.removeBtn}
                onClick={() => handleRemove(item.id)}
                disabled={isRemoving}
                aria-label={`Remove ${item.title}`}
              >
                {isRemoving ? "..." : "x"}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Error banner — shown if last removal failed */}
      {removeMutation.isError && (
        <div style={styles.errorBanner}>
          Failed to remove item. It has been restored.
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Total</span>
          <span style={styles.totalVal}>${total.toFixed(2)}</span>
        </div>
        <button style={styles.checkoutBtn}>Proceed to Checkout</button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    fontFamily: "sans-serif",
    background: "#141417",
    color: "#e8e8f0",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #2a2a31",
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: 0,
  },
  countPill: {
    fontSize: 11,
    fontWeight: 500,
    background: "rgba(124,106,255,0.15)",
    color: "#7c6aff",
    padding: "2px 8px",
    borderRadius: 99,
    fontFamily: "monospace",
  },
  clearBtn: {
    background: "transparent",
    border: "1px solid #2a2a31",
    borderRadius: 6,
    color: "#6b6b80",
    fontSize: 12,
    padding: "5px 10px",
    cursor: "pointer",
    fontFamily: "monospace",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flex: 1,
    overflowY: "auto",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    background: "#1c1c21",
    border: "1px solid #2a2a31",
    borderRadius: 10,
    transition: "opacity 200ms ease",
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    objectFit: "cover",
    flexShrink: 0,
  },
  info: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e8e8f0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  itemMeta: {
    fontSize: 11,
    color: "#6b6b80",
    fontFamily: "monospace",
  },
  lineTotal: {
    fontSize: 13,
    color: "#3ddc97",
    fontFamily: "monospace",
    flexShrink: 0,
  },
  removeBtn: {
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: "#6b6b80",
    fontSize: 13,
    cursor: "pointer",
    borderRadius: 4,
    flexShrink: 0,
  },
  errorBanner: {
    margin: "0 24px",
    padding: "10px 14px",
    background: "rgba(255,92,92,0.12)",
    border: "1px solid rgba(255,92,92,0.25)",
    borderRadius: 6,
    color: "#ff5c5c",
    fontSize: 12,
    fontFamily: "monospace",
    flexShrink: 0,
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #2a2a31",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flexShrink: 0,
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 13,
    color: "#6b6b80",
    fontFamily: "monospace",
  },
  totalVal: {
    fontSize: 20,
    fontWeight: 800,
    color: "#e8e8f0",
    fontFamily: "monospace",
  },
  checkoutBtn: {
    width: "100%",
    padding: 13,
    background: "#7c6aff",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  emptyWrap: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 40,
  },
  emptyIcon: { fontSize: 36, opacity: 0.3 },
  emptyHeading: {
    fontSize: 15,
    fontWeight: 700,
    color: "#e8e8f0",
    margin: 0,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#6b6b80",
    margin: 0,
    fontFamily: "monospace",
  },
};
