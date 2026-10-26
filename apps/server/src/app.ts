import type { Database } from "bun:sqlite"
import { Elysia } from "elysia"
import { identityRoutes } from "./identity/routes"
import { schemaVersion } from "./migrate"
import { saveRoutes } from "./saves/routes"

export type AppOptions = {
  db: Database
}

/**
 * The HTTP surface. Building the app from an injected database is what lets
 * every route test run against `:memory:` instead of a real server, so the
 * whole gate needs neither a port nor a network.
 *
 * `/health` is deliberately unauthenticated and read-only: it is the probe a
 * container orchestrator hits, and its only job is to say that the process is
 * up and which migration the database is on.
 */
export function createApp({ db }: AppOptions) {
  return new Elysia()
    .use(identityRoutes({ db }))
    .use(saveRoutes({ db }))
    .get("/health", () => ({
      status: "ok",
      schemaVersion: schemaVersion(db),
    }))
}
