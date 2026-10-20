import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import packageJson from "./package.json" with { type: "json" };

// During development, API calls are forwarded to the local Forge, so the
// interface talks to it as if it were served by Forge itself.
const forge = process.env.FORGE_URL ?? "http://127.0.0.1:7860";

// page/version.json: how the extension knows its version in a released copy, which has no web/ folder.
const versionFile: Plugin = {
  name: "forgelight-version",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: `${JSON.stringify({ version: packageJson.version })}\n`,
    });
  },
};

export default defineConfig({
  base: "/forgelight/",
  plugins: [react(), tailwindcss(), versionFile],
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
