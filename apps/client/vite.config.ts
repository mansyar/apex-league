import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"

export default defineConfig({
  resolve: {
    alias: {
      "@apex/sim": fileURLToPath(
        new URL("../../packages/sim/src/index.ts", import.meta.url),
      ),
    },
  },
  // Tailscale Serve proxies the dev server through the tailnet hostname;
  // Vite's Host allowlist otherwise rejects that Host header.
  server: {
    allowedHosts: ["msi-1.tail7dcc44.ts.net"],
  },
})
