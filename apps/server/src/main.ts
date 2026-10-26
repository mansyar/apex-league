import { createApp } from "./app"
import { configuredOrigin } from "./cors"
import { openDatabase } from "./db"
import { databasePath } from "./env"

/**
 * Boot. Every step that can fail here is allowed to throw: a server whose
 * database is unreachable must die naming the path rather than accept requests
 * whose saves go nowhere. There is no try/catch on purpose.
 */
const path = databasePath(process.env)
const db = openDatabase(path)
const app = createApp({ db, allowedOrigin: process.env.ALLOWED_ORIGIN })
const port = Number(process.env.PORT ?? 3000)

Bun.serve({ port, fetch: app.fetch })
// The origin is named because a silent default deny is the one failure mode a
// browser reports as "network error"; this line is what a Coolify log shows.
console.log(
  `apex server listening on :${port}, database ${path}, allowed origin ${
    configuredOrigin(process.env.ALLOWED_ORIGIN) ?? "none (same-origin only)"
  }`,
)
