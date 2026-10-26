import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"

/**
 * Vite's dev server rejects any request whose Host header is not in
 * `server.allowedHosts`, which is exactly what a proxy does when it forwards
 * the dev server under a public name. Reading the list from the environment
 * keeps the committed config free of a machine name while still letting a
 * remote-dev proxy through: comma-separated, surrounding spaces trimmed,
 * blanks dropped. Unset or empty yields an empty list, leaving Vite's default
 * localhost-only behaviour untouched.
 */
export function allowedHostsFrom(raw: string | undefined): string[] {
  if (raw === undefined) return []
  return raw
    .split(",")
    .map((host) => host.trim())
    .filter((host) => host.length > 0)
}

export default defineConfig({
  resolve: {
    alias: {
      "@apex/sim": fileURLToPath(
        new URL("../../packages/sim/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    allowedHosts: allowedHostsFrom(process.env.DEV_ALLOWED_HOSTS),
  },
})
