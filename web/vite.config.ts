import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import packageJson from "./package.json" with { type: "json" };

// During development, API calls are forwarded to the local Forge, so the
// interface talks to it as if it were served by Forge itself.
const forge = process.env.FORGE_URL ?? "http://127.0.0.1:7860";

export default defineConfig({
  base: "/forgelight/",
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: "../page",
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/sdapi": forge,
      "/internal": forge,
      "/forgelight/api": forge,
    },
  },
  test: {
    environment: "node",
  },
});
