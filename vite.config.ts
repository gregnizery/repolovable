import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    assetsDir: "assets",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (
            id.includes("react-big-calendar") ||
            id.includes("react-day-picker") ||
            id.includes("date-fns") ||
            id.includes("react-overlays") ||
            id.includes("dom-helpers") ||
            id.includes("uncontrollable") ||
            id.includes("date-arithmetic") ||
            id.includes("memoize-one") ||
            id.includes("warning")
          ) {
            return "calendar-vendor";
          }
          if (id.includes("recharts") || id.includes("react-smooth") || id.includes("fast-equals")) {
            return "charts-vendor";
          }
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) {
            return "motion-vendor";
          }
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform/resolvers") ||
            id.includes("zod")
          ) {
            return "forms-vendor";
          }
          if (id.includes("@react-google-maps")) return "maps-vendor";
          if (id.includes("html5-qrcode")) return "scanner-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          return undefined;
        },
      },
    },
  },
}));
