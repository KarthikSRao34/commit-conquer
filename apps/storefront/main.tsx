import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Layout from "../storefront/Layout";          // CartProvider lives here
import StorefrontPage from "./pages/index";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Layout>
        <StorefrontPage />
      </Layout>
    </QueryClientProvider>
  </StrictMode>
);