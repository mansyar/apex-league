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
})
