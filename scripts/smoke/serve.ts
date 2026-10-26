/**
 * Serve `apps/client/dist` over HTTP for a local smoke run.
 *
 * The deploy target is a static file host, so the smoke check has to be able
 * to point at one. This is the smallest thing that behaves like it: real files
 * out of `dist/`, `index.html` at `/`, and a genuine 404 for anything missing.
 * No SPA fallback on purpose — a fallback would turn a missing GLB into a 200
 * and hide the exact failure the smoke check exists to catch.
 *
 * The deploy workflow does not use this file; it points the smoke check at the
 * deployed URL. Local use:
 *
 *   bun scripts/smoke/serve.ts --port 4173
 *   bun scripts/smoke/smoke.ts --url http://127.0.0.1:4173
 */

import { resolve, sep } from "node:path"

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

export interface StaticServer {
  readonly url: string
  stop(): void
}

/** Start a static file server rooted at `root` on `port` (0 = any free port). */
export function startStaticServer(root: string, port = 4173): StaticServer {
  const base = resolve(root)
  const server = Bun.serve({
    port,
    fetch(request) {
      const path = decodeURIComponent(new URL(request.url).pathname)
      const file = resolve(base, `.${path === "/" ? "/index.html" : path}`)
      // Never serve outside the build directory, whatever the request says.
      if (file !== base && !file.startsWith(`${base}${sep}`)) {
        return new Response("Forbidden", { status: 403 })
      }
      const body = Bun.file(file)
      return body.exists().then((exists) => {
        if (!exists) return new Response("Not found", { status: 404 })
        const ext = file.slice(file.lastIndexOf("."))
        return new Response(body, {
          headers: { "content-type": MIME[ext] ?? "application/octet-stream" },
        })
      })
    },
  })
  return { url: server.url.href, stop: () => server.stop(true) }
}

if (import.meta.main) {
  const flag = (name: string, fallback: string) => {
    const at = process.argv.indexOf(`--${name}`)
    return at === -1 ? fallback : (process.argv[at + 1] ?? fallback)
  }
  const root = flag("root", "apps/client/dist")
  const server = startStaticServer(root, Number(flag("port", "4173")))
  console.log(`Serving ${root} at ${server.url}`)
}
