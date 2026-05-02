import React, { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import Layout from "../storefront/Layout"
import ProductsPage from "./ProductsPage"
import OrdersPage from "./OrdersPage"

const queryClient = new QueryClient()

function App() {
  const [page, setPage] = useState("products")

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Simple nav */}
      <div style={{ width: 160, background: "#0c0c0e", borderRight: "1px solid #2a2a31", display: "flex", flexDirection: "column", padding: 16, gap: 8 }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#6b6b80", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Admin</div>
        {["products", "orders"].map((p) => (
          <button key={p} onClick={() => setPage(p)} style={{
            background: page === p ? "rgba(124,106,255,0.15)" : "transparent",
            border: "none", borderRadius: 6, padding: "8px 12px",
            color: page === p ? "#7c6aff" : "#9999aa",
            fontFamily: "monospace", fontSize: 13, cursor: "pointer", textAlign: "left",
            textTransform: "capitalize"
          }}>
            {p}
          </button>
        ))}
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Layout>
          {page === "products" && <ProductsPage />}
          {page === "orders"   && <OrdersPage />}
        </Layout>
      </div>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)