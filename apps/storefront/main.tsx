// apps/storefront/main.tsx
// Entry point — React Router wires all pages together.
// Run: npm run start  (starts backend + frontend together)
//
// Routes:
//   /                    → Storefront homepage (product grid)
//   /products/:handle    → Product detail page
//   /checkout            → Checkout flow
//   /collections         → All collections
//   /about               → About page
//   /account             → Customer account
//   /admin               → Admin dashboard
//   /admin/products      → Admin products
//   /admin/orders        → Admin orders

import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./Layout";
import UnifiedDashboard from "./pages/UnifiedDashboard";

// ── Storefront pages ───────────────────────────────────────────────────────────
// All pages are lazy so Suspense covers them uniformly and the entry
// chunk stays lean. StorefrontHome was previously an eager import which
// bypassed Suspense and inflated the initial bundle.
const StorefrontHome = lazy(() => import("./pages/index"));
const CheckoutPage = lazy(() => import("./pages/CheckoutForm"));
const ProductDetail = lazy(() => import("./pages/product-detail"));
const CollectionsPage = lazy(() => import("./pages/collections"));
const AboutPage = lazy(() => import("./pages/about"));
const AccountPage = lazy(() => import("./pages/account"));

// ── Admin pages ────────────────────────────────────────────────────────────────
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/products"));
const AdminOrders = lazy(() => import("./pages/admin/orders"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <div style={{ color: "#7c6aff", fontSize: 14 }}>Loading…</div>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found in index.html");

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Storefront routes (with header/cart layout) ── */}
            <Route element={<Layout />}>
              <Route path="/" element={<StorefrontHome />} />
              <Route path="/products/:handle" element={<ProductDetail />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route
                path="/collections/:handle"
                element={<CollectionsPage />}
              />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>

            {/* ── Admin routes (separate layout, no storefront header) ── */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
            </Route>

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
