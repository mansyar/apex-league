import { createApp } from "./app"
import { openDatabase } from "./db"
import { databasePath } from "./env"

/**
 * Boot. Every step that can fail here is allowed to throw: a server whose
 * database is unreachable must die naming the path rather than accept requests
 * whose saves go nowhere. There is no try/catch on purpose.
 */
const path = databasePath(process.env)
const db = openDatabase(path)
const app = createApp({ db })
const port = Number(process.env.PORT ?? 3000)

Bun.serve({ port, fetch: app.fetch })
console.log(`apex server listening on :${port}, database ${path}`)
