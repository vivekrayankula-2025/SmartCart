import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const frontendDirectory = fileURLToPath(new URL(".", import.meta.url));
const backendBuildDirectory = fileURLToPath(new URL("../backend/frontend_dist", import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? "/static/" : "/",
  build: {
    outDir: backendBuildDirectory,
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/admin": "http://127.0.0.1:8000",
    },
  },
  root: frontendDirectory,
}));
