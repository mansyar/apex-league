import type { Database } from "bun:sqlite"
import { Elysia } from "elysia"
import { cors } from "./cors"
import { identityRoutes } from "./identity/routes"
import { leaderboardRoutes } from "./leaderboard/routes"
import { schemaVersion } from "./migrate"
import { saveRoutes } from "./saves/routes"

export type AppOptions = {
  db: Database
  /** The one browser origin the API answers, from `ALLOWED_ORIGIN`. Unset
   * means same-origin only - see `cors.ts`. */
  allowedOrigin?: string
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
export function createApp({ db, allowedOrigin }: AppOptions) {
  return new Elysia()
    .use(cors({ allowedOrigin }))
    .use(identityRoutes({ db }))
    .use(saveRoutes({ db }))
    .use(leaderboardRoutes({ db }))
    .get("/health", () => ({
      status: "ok",
      schemaVersion: schemaVersion(db),
    }))
}
