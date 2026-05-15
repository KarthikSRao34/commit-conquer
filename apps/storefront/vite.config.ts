import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Anchor Vite to the storefront directory so index.html is always
  // found regardless of where the CLI is invoked from.
  root: __dirname,

  resolve: {
    alias: {
      // "@/" → storefront root; mirrors tsconfig.json "paths"
      "@": path.resolve(__dirname, "."),
    },
  },

  server: {
    port: 5173,
    proxy: {
      "/api/v1/v1": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
});
