import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProductsPage from "./ProductsPage";
import OrdersPage from "./OrdersPage";

const queryClient = new QueryClient();

const NAV_ITEMS = ["products", "orders"] as const;
type Page = (typeof NAV_ITEMS)[number];

function AdminLayout() {
  const [page, setPage] = useState<Page>("products");

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#0c0c0e",
        color: "#e8e8f0",
        fontFamily: "monospace",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 180,
          flexShrink: 0,
          borderRight: "1px solid #2a2a31",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 8,
          background: "#0c0c0e",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "#e8e8f0",
            marginBottom: 16,
            letterSpacing: "-0.5px",
            fontFamily: "sans-serif",
          }}
        >
          commit&amp;conquer
        </div>

        <div
          style={{
            fontSize: 10,
            color: "#6b6b80",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 4,
          }}
        >
          Admin
        </div>

        {NAV_ITEMS.map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            style={{
              background: page === p ? "rgba(124,106,255,0.15)" : "transparent",
              border: "none",
              borderRadius: 6,
              padding: "8px 12px",
              color: page === p ? "#7c6aff" : "#9999aa",
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left",
              textTransform: "capitalize",
              fontFamily: "monospace",
            }}
          >
            {p}
          </button>
        ))}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {page === "products" && <ProductsPage />}
        {page === "orders" && <OrdersPage />}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AdminLayout />
    </QueryClientProvider>
  </StrictMode>,
);
